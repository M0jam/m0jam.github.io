/**
 * PlayHub Feedback Proxy (Cloudflare Worker)
 * 
 * Protects the Discord Webhook URL and validates payloads.
 * 
 * Setup:
 * 1. Create a Cloudflare Worker.
 * 2. Set Environment Variable: DISCORD_WEBHOOK_URL
 * 3. (Optional) Set APP_SECRET for token validation.
 */

export default {
  async fetch(request, env, ctx) {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const authHeader = request.headers.get('X-App-Token')
    if (env.APP_SECRET && authHeader !== env.APP_SECRET) {
      return new Response('Unauthorized', { status: 401 })
    }

    try {
      const payload = await request.json();

      // 2. Payload Validation
      if (!payload.embeds || !Array.isArray(payload.embeds)) {
        return new Response('Invalid payload: missing embeds', { status: 400 });
      }

      // 3. Forward to Discord
      const discordResponse = await fetch(env.DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!discordResponse.ok) {
        return new Response(`Discord Error: ${discordResponse.statusText}`, { status: discordResponse.status });
      }

      return new Response('Feedback sent', { status: 200 });

    } catch (err) {
      return new Response('Internal Server Error', { status: 500 });
    }
  },
};
