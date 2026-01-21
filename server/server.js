import 'dotenv/config';
import express from 'express';
import axios from 'axios';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const app = express();
const PORT = process.env.PORT || 3000;

// --- Configuration ---
// These better match the Twitch Dev Console settings!
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:3000/auth/twitch/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';
const STREAMER_USERNAME = process.env.STREAMER_USERNAME || 'cowsep';

// Error definitions for redirect-rendered errors
const REDIRECT_ERRORS = Object.freeze({
    INVALID_REQUEST: { code: 'invalid_request', message: 'Your request is invalid.' },
    NOT_SUBSCRIBED: { code: 'not_subscribed', message: 'Subscription required' },
    AUTH_FAILED: { code: 'auth_failed', message: 'Authentication failed' },
    UNKNOWN: { code: 'unknown', message: 'Something went wrong' }
});

// Error definitions for API-only responses (no frontend rendering)
const API_ERRORS = Object.freeze({
    STREAMER_NOT_FOUND: 'Streamer not found',
    NO_REFRESH_TOKEN: 'No refresh token found',
    REFRESH_FAILED: 'Token refresh failed',
    RATE_LIMIT_GENERAL: 'Stop the spam. Slow down and try again later.',
    RATE_LIMIT_AUTH: 'Too many authentication attempts, please try again later.'
});

// --- Middleware ---
app.use(helmet());

// Rate limiting - general API
const generalLimiter = rateLimit(
{
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: 
    {
        error: API_ERRORS.RATE_LIMIT_GENERAL
    }
});

// Rate limiting - stricter for auth endpoints
const authLimiter = rateLimit(
{
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: 
    {
        error: API_ERRORS.RATE_LIMIT_AUTH
    }
});

// Apply general limiter to all routes
app.use(generalLimiter);

app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(cors({ origin: FRONTEND_URL, credentials: true }));

// Helper function for cookie options
const getCookieOptions = () => (
{
    httpOnly: true,
    signed: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 
});

// Map Twitch API error statuses to frontend error codes
const getAuthErrorType = (status) => (
    status === 404 
        ? REDIRECT_ERRORS.NOT_SUBSCRIBED
        : status === 401 
        ? REDIRECT_ERRORS.AUTH_FAILED
        : status === 400
        ? REDIRECT_ERRORS.INVALID_REQUEST
        : REDIRECT_ERRORS.UNKNOWN
);

const twitchHeaders = (accessToken) => (
{
    'Client-ID': TWITCH_CLIENT_ID,
    'Authorization': `Bearer ${accessToken}`
});

const refreshAccessToken = async (refreshToken) => 
{
    const tokenResponse = await axios.post('https://id.twitch.tv/oauth2/token', null, 
    {
        params: 
        {
            client_id: TWITCH_CLIENT_ID,
            client_secret: TWITCH_CLIENT_SECRET,
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        },
    });

    return {
        accessToken: tokenResponse.data.access_token,
        refreshToken: tokenResponse.data.refresh_token ?? refreshToken
    };
};

const twitchGetWithRefresh = async (url, tokens, config = {}) => 
{
    try 
    {
        const response = await axios.get(url, 
        {
            ...config,
            headers: 
            {
                ...twitchHeaders(tokens.accessToken),
                ...(config.headers ?? {})
            }
        });
        return { response, tokens };
    }
    catch (error) 
    {
        const status = error.response?.status;
        if (status !== 401 || !tokens.refreshToken) 
        {
            throw error;
        }

        const newTokens = await refreshAccessToken(tokens.refreshToken);
        const response = await axios.get(url, 
        {
            ...config,
            headers: 
            {
                ...twitchHeaders(newTokens.accessToken),
                ...(config.headers ?? {})
            }
        });
        return { response, tokens: newTokens };
    }
};

/**
 * Cached Twitch app access token (client_credentials flow).
 * This is NOT a user token, it is safe for public endpoints.
 */
let appAccessToken = null;
let appAccessTokenExpiresAt = 0;

/**
 * Gets a Twitch app access token using client credentials and caches it
 * until shortly before expiration.
 * @returns {Promise<string>} Twitch app access token
 */
const getAppAccessToken = async () => 
{
    const now = Date.now();

    // 60s buffer prevents edge cases where token expires mid-request.
    if (appAccessToken && appAccessTokenExpiresAt > now + 60_000) 
    {
        return appAccessToken;
    }

    // Client credentials flow -> app access token (no user scopes).
    const tokenResponse = await axios.post('https://id.twitch.tv/oauth2/token', null, 
    {
        params: 
        {
            client_id: TWITCH_CLIENT_ID,
            client_secret: TWITCH_CLIENT_SECRET,
            grant_type: 'client_credentials',
        },
    });

    appAccessToken = tokenResponse.data.access_token;

    // Twitch gives seconds for token expiration
    const expiresIn = tokenResponse.data.expires_in ?? 0; 

    // Sets the absolute expiration timestamp (in milliseconds) for the cached app token
    appAccessTokenExpiresAt = now + expiresIn * 1000;

    return appAccessToken;
};

// --- Routes ---
// 1. Login Trigger: Redirects user to Twitch to approve access
app.get('/auth/twitch', authLimiter, (req, res) => 
{
    const scopes = 'user:read:subscriptions'; // Required scope to check subs
    const url = `https://id.twitch.tv/oauth2/authorize?client_id=${TWITCH_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=${scopes}`;
    res.redirect(url);
});

// 2. Callback Handler: Twitch redirects here with a code
app.get('/auth/twitch/callback', authLimiter, async (req, res) => 
{
    const { code } = req.query;
    
    if (!code)
    {
        return res.redirect(`${FRONTEND_URL}/error?code=${encodeURIComponent(REDIRECT_ERRORS.INVALID_REQUEST.code)}`);
    }
    
    try 
    {
        const tokenResponse = await axios.post('https://id.twitch.tv/oauth2/token', null, 
        {
            params: 
            {
                client_id: TWITCH_CLIENT_ID,
                client_secret: TWITCH_CLIENT_SECRET,
                code,
                grant_type: 'authorization_code',
                redirect_uri: REDIRECT_URI,
            },
        });
        
        let tokens = 
        {
            accessToken: tokenResponse.data.access_token,
            refreshToken: tokenResponse.data.refresh_token
        };
        
        let result = await twitchGetWithRefresh('https://api.twitch.tv/helix/users', tokens);
        tokens = result.tokens;
        const userId = result.response.data.data[0].id;
        
        result = await twitchGetWithRefresh(
            `https://api.twitch.tv/helix/users?login=${STREAMER_USERNAME}`, 
            tokens
        );
        tokens = result.tokens;
        const broadcasterId = result.response.data.data[0].id;
        
        result = await twitchGetWithRefresh(
            'https://api.twitch.tv/helix/subscriptions/user', 
            tokens,
            { params: { broadcaster_id: broadcasterId, user_id: userId } }
        );
        tokens = result.tokens;
       
        // Success - user is subscribed
        res.cookie('is_subscribed', 'true', getCookieOptions());
        res.cookie('refresh_token', tokens.refreshToken, getCookieOptions());
        res.redirect(`${FRONTEND_URL}`);
    }
    catch (error) 
    {
        console.error('ERROR:', error.response?.status, error.message);
        res.clearCookie('is_subscribed');
        res.clearCookie('refresh_token');

        const status = error.response?.status;
        const errorType = getAuthErrorType(status);

        res.redirect(`${FRONTEND_URL}/error?code=${encodeURIComponent(errorType.code)}`);
    }
});

// 3. Check Session
app.get('/auth/session', (req, res) => 
{
    const isSubscribed = req.signedCookies.is_subscribed === 'true';
    res.json({ subscribed: isSubscribed });
});

/**
 * Public live status endpoint.
 * Uses app token (not user token) so it works even when no one is logged in.
 */
app.get('/stream/status', async (_, res) => 
{
    try 
    {
        const token = await getAppAccessToken();
        const response = await axios.get('https://api.twitch.tv/helix/streams', 
        {
            params: { user_login: STREAMER_USERNAME },
            headers: 
            {
                'Client-ID': TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${token}`
            }
        });

        // Twitch returns an array of streams. Non-empty means streamer is live.
        const isLive = (response.data.data?.length ?? 0) > 0;
        res.json({ isLive });
    }
    catch (error) 
    {
        console.error('Live status error:', error.response?.status, error.message);
        
        // Fail-safe: offline on error to avoid false/misleading "live".
        res.status(500).json({ isLive: false });
    }
});

// Add new endpoint for token refresh
app.post('/auth/refresh', authLimiter, async (req, res) => 
{
    const refreshToken = req.signedCookies.refresh_token;

    if (!refreshToken) 
    {
        const errorType = REDIRECT_ERRORS.INVALID_REQUEST;
        return res.status(400).json({ error: errorType.code, message: errorType.message });
    }

    try 
    {
        let tokens = await refreshAccessToken(refreshToken);
        
        let result = await twitchGetWithRefresh('https://api.twitch.tv/helix/users', tokens);
        tokens = result.tokens;
        const userId = result.response.data.data[0].id;
        
        result = await twitchGetWithRefresh(
            `https://api.twitch.tv/helix/users?login=${STREAMER_USERNAME}`, 
            tokens
        );
        tokens = result.tokens;
        const broadcasterId = result.response.data.data[0].id;
        
        result = await twitchGetWithRefresh(
            `https://api.twitch.tv/helix/subscriptions/user`, 
            tokens,
            { params: { broadcaster_id: broadcasterId, user_id: userId } }
        );
        tokens = result.tokens;

        // Success - user is subscribed
        res.cookie('is_subscribed', 'true', getCookieOptions());
        res.cookie('refresh_token', tokens.refreshToken, getCookieOptions());
        res.json({ subscribed: true });
    }
    catch (error) 
    {
        console.error('Token refresh error:', error.response?.status, error.message);
        res.clearCookie('is_subscribed');
        res.clearCookie('refresh_token');

        const status = error.response?.status;
        const errorType = getAuthErrorType(status);

        res.status(status ?? 500).json({ error: errorType.code, message: errorType.message });
    }
});

// Update logout to clear refresh token
app.post('/auth/logout', (_, res) => 
{
    res.clearCookie('is_subscribed');
    res.clearCookie('refresh_token');
    return res.sendStatus(204);
});

app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
