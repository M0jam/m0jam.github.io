import { Handler } from '@netlify/functions';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const jwtSecret = process.env.JWT_SECRET;

export const handler: Handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (!supabaseUrl || !supabaseKey || !jwtSecret) {
    console.error('Missing environment variables');
    return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error' }) };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { email, password } = JSON.parse(event.body || '{}');

    if (!email || !password) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Email and password required' }) };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { statusCode: 401, body: JSON.stringify({ error: error.message }) };
    }

    if (!data.user) {
        return { statusCode: 401, body: JSON.stringify({ error: 'User not found' }) };
    }

    const user = data.user;
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        user_metadata: user.user_metadata,
        username: user.user_metadata?.username || user.email?.split('@')[0]
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    const netlifyCookie = cookie.serialize('auth_token', token, {
      httpOnly: true,
      secure: true, // Always secure for production
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return {
      statusCode: 200,
      headers: {
        'Set-Cookie': netlifyCookie,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user: {
          id: user.id,
          email: user.email,
          username: user.user_metadata?.username || user.email?.split('@')[0],
        },
      }),
    };
  } catch (err: any) {
    console.error('Auth error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Internal Server Error' }) };
  }
};
