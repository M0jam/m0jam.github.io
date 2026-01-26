import { Handler } from '@netlify/functions';
import nodemailer from 'nodemailer';

const handler: Handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { email } = JSON.parse(event.body || '{}');

  if (!email) {
    return { statusCode: 400, body: 'Email is required' };
  }

  // Check for environment variables
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    console.error('Missing GMAIL_USER or GMAIL_PASS environment variables');
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Server configuration error: Missing Gmail credentials' }),
    };
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });

  try {
    // Send confirmation to user
    await transporter.sendMail({
      from: `"PlayHub Team" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Welcome to PlayHub!',
      text: 'Thanks for subscribing to PlayHub updates. We will keep you posted!',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #8b5cf6;">Welcome to PlayHub!</h1>
          <p>Thanks for subscribing to our newsletter. We're excited to have you on board.</p>
          <p>You'll receive updates about new features, releases, and community news.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #666; font-size: 12px;">© ${new Date().getFullYear()} PlayHub. All rights reserved.</p>
        </div>
      `,
    });

    // Optional: Send notification to admin (self)
    await transporter.sendMail({
      from: `"PlayHub Bot" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER,
      subject: 'New PlayHub Subscriber',
      text: `New subscriber: ${email}`,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Subscribed successfully' }),
    };
  } catch (error) {
    console.error('Email sending failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to send email' }),
    };
  }
};

export { handler };
