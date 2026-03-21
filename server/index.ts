import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';

// Load .env variables before importing auth
config({ path: '../.env' }); // Adjust path if needed. If index runs from root, just '.env'

import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth.js';

const app = express();
const port = process.env.PORT || 3001;

// Only allow requests from our Vite dev server (or production app)
app.use(cors({
    origin: process.env.VITE_APP_URL || 'http://localhost:5173',
    credentials: true,
}));

// Mount Better Auth at /api/auth
// It automatically handles /api/auth/sign-in/social format and callbacks
app.all('/api/auth/*', toNodeHandler(auth));

// Health check endpoint
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(port, () => {
    console.log(`[🚀] Better Auth API running at http://localhost:${port}/api/auth`);
});
