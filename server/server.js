import 'dotenv/config';
import express from 'express';
import axios from 'axios';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();
const PORT = 3000;

// Allow requests to the Angular app 
app.use(cors({ origin: 'http://localhost:4200', credentials: true }));

// Needed to sign, issue, and parse the http cookie
app.use(cookieParser(process.env.COOKIE_SECRET));

// --- Configuration ---
// These better match the Twitch Dev Console settings!!
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

// Backend callback twitch will call
const REDIRECT_URI = 'http://localhost:3000/auth/twitch/callback';

// Angular app url
const FRONTEND_URL = 'http://localhost:4200'; 

// CHANGE THIS to the streamer's username that you're interested in if you're forking this app
const STREAMER_USERNAME = 'cowsep'; 

// --- Routes ---
// 1. Login Trigger: Redirects user to Twitch to approve access
app.get('/auth/twitch', (_, res) => 
{
    const scopes = 'user:read:subscriptions'; // Required scope to check subs
    const url = `https://id.twitch.tv/oauth2/authorize?client_id=${TWITCH_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=${scopes}`;
    res.redirect(url);
});

// 2. Callback Handler: Twitch redirects here with a code
app.get('/auth/twitch/callback', async (req, res) => 
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
        
        if (streamerResponse.data.data.length === 0) {
            return res.redirect(`${FRONTEND_URL}?error`);
        }
        const broadcasterId = streamerResponse.data.data[0].id;
        
        // D. Check Subscription Status
        await axios.get(`https://api.twitch.tv/helix/subscriptions/user`, {
            headers: { 'Client-ID': TWITCH_CLIENT_ID, 'Authorization': `Bearer ${accessToken}` },
            params: { broadcaster_id: broadcasterId, user_id: userId },
        });
        
        // SUCCESS: Set HttpOnly Cookie to prevent tampering if the subscriptions endpoints does not
        // return a 404 error which means user is not subscribed
        res.cookie('is_subscribed', 'true', 
        {
            httpOnly: true,
            signed: true,   
            secure: true,  
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });
        
        // Redirect cleanly to root
        res.redirect(FRONTEND_URL);
    }
    catch (subError) 
    {
        console.error('Error:', subError.message);

        // Clear cookies
        res.clearCookie('is_subscribed');
        res.redirect(`${FRONTEND_URL}/error`);
    }
});

// 3. Check Session
app.get('/auth/session', (req, res) => 
{
  // Check if the signed cookie exists and is valid
  if (req.signedCookies.is_subscribed === 'true') {
    res.json({ subscribed: true });
  } else {
    res.json({ subscribed: false });
  }
});

// 4. Logout
app.post('/auth/logout', (_, res) => {
  res.clearCookie('is_subscribed');
  res.json({ success: true });
});

app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
