import { Handler } from '@netlify/functions';
import cookie from 'cookie';

export const handler: Handler = async (event, context) => {
  const netlifyCookie = cookie.serialize('auth_token', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 0,
    expires: new Date(0),
    path: '/',
  });

  return {
    statusCode: 200,
    headers: {
      'Set-Cookie': netlifyCookie,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message: 'Logged out' }),
  };
};
