import { Handler } from '@netlify/functions';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';

const jwtSecret = process.env.JWT_SECRET;

export const handler: Handler = async (event, context) => {
  if (!jwtSecret) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error' }) };
  }

  const cookies = cookie.parse(event.headers.cookie || '');
  const token = cookies.auth_token;

  if (!token) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Not authenticated' }) };
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: decoded }),
    };
  } catch (err) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid token' }) };
  }
};
