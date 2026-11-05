#!/usr/bin/env node
import express from 'express';
import axios from 'axios';
import open from 'open';
import { randomBytes } from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const CLIENT_ID = process.env.CLICKUP_CLIENT_ID;
const CLIENT_SECRET = process.env.CLICKUP_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000/auth/callback';
const PORT = 3000;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Error: CLICKUP_CLIENT_ID and CLICKUP_CLIENT_SECRET environment variables are required.');
  console.error('Please create a .env file with these values or set them in your environment.');
  console.error('You can obtain these values by creating an app at https://clickup.com/api/developer/');
  process.exit(1);
}

// Generate a random state for CSRF protection
const state = randomBytes(16).toString('hex');

const app = express();

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>ClickUp OAuth Setup</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          .button { display: inline-block; background-color: #7B68EE; color: white; padding: 10px 20px; 
                   text-decoration: none; border-radius: 5px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <h1>ClickUp OAuth Setup</h1>
        <p>Click the button below to authorize the ClickUp MCP server to access your ClickUp account.</p>
        <a href="/auth" class="button">Authorize with ClickUp</a>
      </body>
    </html>
  `);
});

app.get('/auth', (req, res) => {
  const authUrl = `https://app.clickup.com/api?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${state}`;
  res.redirect(authUrl);
});

app.get('/auth/callback', async (req, res) => {
  const { code, state: returnedState } = req.query;
  
  // Verify state to prevent CSRF attacks
  if (returnedState !== state) {
    return res.status(400).send('Invalid state parameter. Possible CSRF attack.');
  }
  
  if (!code) {
    return res.status(400).send('Authorization code not received.');
  }
  
  try {
    const response = await axios.post('https://api.clickup.com/api/v2/oauth/token', {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI,
    });
    
    const { access_token } = response.data;
    
    res.send(`
      <html>
        <head>
          <title>ClickUp OAuth Setup - Success</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .token-box { background-color: #f0f0f0; padding: 15px; border-radius: 5px; 
                        font-family: monospace; word-break: break-all; margin: 20px 0; }
            .instructions { background-color: #e6f7ff; padding: 15px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <h1>Authorization Successful!</h1>
          <p>Your ClickUp access token has been generated successfully.</p>
          
          <h2>Your Access Token:</h2>
          <div class="token-box">${access_token}</div>
          
          <div class="instructions">
            <h3>Next Steps:</h3>
            <ol>
              <li>Copy the access token above.</li>
              <li>Add it to your MCP settings file as the <code>CLICKUP_API_TOKEN</code> environment variable.</li>
              <li>You can now close this window and use the ClickUp MCP server.</li>
            </ol>
          </div>
          
          <p><strong>Note:</strong> Keep this token secure. It provides access to your ClickUp account.</p>
        </body>
      </html>
    `);
    
    // Also log the token to the console for easy copying
    console.log('\n==== ClickUp Access Token ====');
    console.log(access_token);
    console.log('=============================\n');
    console.log('Add this token to your MCP settings file as the CLICKUP_API_TOKEN environment variable.');
    
    // Automatically close the server after 2 minutes
    setTimeout(() => {
      server.close(() => {
        console.log('OAuth server closed.');
        process.exit(0);
      });
    }, 120000);
    
  } catch (error) {
    console.error('Error exchanging code for access token:', error.response?.data || error.message);
    res.status(500).send(`
      <html>
        <head>
          <title>ClickUp OAuth Setup - Error</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .error { background-color: #ffebee; padding: 15px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <h1>Authorization Error</h1>
          <div class="error">
            <p>An error occurred while trying to get your access token:</p>
            <pre>${error.response?.data ? JSON.stringify(error.response.data, null, 2) : error.message}</pre>
          </div>
          <p>Please try again or check your client ID and secret.</p>
        </body>
      </html>
    `);
  }
});

const server = app.listen(PORT, () => {
  console.log(`OAuth server running at http://localhost:${PORT}`);
  console.log('Opening browser for authorization...');
  
  open(`http://localhost:${PORT}`);
});

process.on('SIGINT', () => {
  server.close(() => {
    console.log('OAuth server closed.');
    process.exit(0);
  });
});
