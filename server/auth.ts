import { betterAuth } from 'better-auth';
import { dash } from '@better-auth/infra';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

const { Pool } = pg;

// Use the Supabase connection string for Better Auth's own tables
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// We need the Supabase Admin API to bridge Better Auth -> Supabase Auth
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
});

export const auth = betterAuth({
    database: pool,
    emailAndPassword: {
        enabled: false, // We only use OAuth
    },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
            scopes: ['email', 'profile'],
        },
    },
    databaseHooks: {
        user: {
            create: {
                after: async (user) => {
                    // This hook fires when a user signs in with Google for the first time
                    // We immediately mirror the user into Supabase auth and profiles
                    console.log('[Better Auth] New user created:', user.email);

                    try {
                        // Check if user already exists in Supabase
                        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
                        const existingUser = existingUsers?.users?.find(u => u.email === user.email);

                        if (!existingUser) {
                            console.log('[Better Auth] Creating shadow user in Supabase auth for RLS');
                            const { data: newAuthUser, error } = await supabaseAdmin.auth.admin.createUser({
                                email: user.email,
                                email_confirm: true,
                                user_metadata: {
                                    full_name: user.name,
                                    avatar_url: user.image,
                                },
                                // Use a random strong password since they login via Auth.js
                                password: Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8) + 'Xy1!',
                            });

                            if (error) {
                                console.error('[Better Auth] Failed to create shadow user in Supabase:', error);
                            } else if (newAuthUser?.user) {
                                // Ensure the profile row exists
                                await supabaseAdmin.from('profiles').upsert({
                                    id: newAuthUser.user.id,
                                    email: user.email,
                                    full_name: user.name,
                                    avatar_url: user.image,
                                });
                            }
                        } else {
                            // Ensure profile row exists even if auth user already did
                            await supabaseAdmin.from('profiles').upsert({
                                id: existingUser.id,
                                email: user.email,
                                full_name: user.name,
                                avatar_url: user.image,
                            }, { onConflict: 'id' });
                        }
                    } catch (e) {
                        console.error('[Better Auth] Failed in user.create loop:', e);
                    }
                }
            }
        }
    }
});
