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
// These better match the Twitch Dev Console settings!!
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:3000/auth/twitch/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';
const STREAMER_USERNAME = process.env.STREAMER_USERNAME || 'cowsep';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// --- Middleware ---
app.use(helmet());

// Rate limiting - general API
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Stop the spam. Slow down and try again later.' }
});

// Rate limiting - stricter for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts, please try again later.' }
});

// Apply general limiter to all routes
app.use(generalLimiter);

app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(cors({ origin: FRONTEND_URL, credentials: true }));

// Helper function for cookie options
const getCookieOptions = () => ({
    httpOnly: true,
    signed: true,
    secure: IS_PRODUCTION,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
});

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
    
    // Redirect user to an error screen if something goes wrong...
    if (!code)
    {
        return res.redirect(`${FRONTEND_URL}/error`);
    }
    
    try 
    {
        // A. Exchange the code for an Access Token, as required by the twitch api
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
        const accessToken = tokenResponse.data.access_token;
        
        // B. Get the User's ID (the person logging in)
        const userResponse = await axios.get('https://api.twitch.tv/helix/users', {
            headers: { 'Client-ID': TWITCH_CLIENT_ID, 'Authorization': `Bearer ${accessToken}` },
        });
        const userId = userResponse.data.data[0].id;
        
        // C. Get the Streamer's ID (target channel)
        const streamerResponse = await axios.get(`https://api.twitch.tv/helix/users?login=${STREAMER_USERNAME}`, {
            headers: { 'Client-ID': TWITCH_CLIENT_ID, 'Authorization': `Bearer ${accessToken}` },
        });
        
        if (streamerResponse.data.data.length === 0) 
        {
            return res.redirect(`${FRONTEND_URL}?error`);
        }
        const broadcasterId = streamerResponse.data.data[0].id;
        
        // D. Check Subscription Status
        const subResponse = await axios.get(`https://api.twitch.tv/helix/subscriptions/user`, {
            headers: { 'Client-ID': TWITCH_CLIENT_ID, 'Authorization': `Bearer ${accessToken}` },
            params: { broadcaster_id: broadcasterId, user_id: userId },
        });
        
        const isSubscribed = subResponse.data.data.length > 0;
        
        if (isSubscribed) 
        {
            res.cookie('is_subscribed', 'true', getCookieOptions());
            res.redirect(FRONTEND_URL);
        } 
        else 
        {
            res.clearCookie('is_subscribed');
            res.redirect(`${FRONTEND_URL}?subscription_required=true`);
        }
    }
    catch (error) 
    {
        console.error('Auth error:', error.response?.status, error.message);
        
        if (error.response?.status === 404) 
        {
            // Not subscribed
            res.clearCookie('is_subscribed');
            res.redirect(`${FRONTEND_URL}?subscription_required=true`);
        } 
        else 
        {
            // Other errors
            res.clearCookie('is_subscribed');
            res.redirect(`${FRONTEND_URL}?error=auth_failed`);
        }
    }
});

// 3. Check Session
app.get('/auth/session', (req, res) => 
{
    const isSubscribed = req.signedCookies.is_subscribed === 'true';
    res.json({ subscribed: isSubscribed });
});

app.post('/auth/logout', (_, res) => 
{
    res.clearCookie('is_subscribed');
    res.json({ success: true });
});

app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
