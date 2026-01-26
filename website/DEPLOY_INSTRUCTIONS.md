# Netlify Deployment & Configuration Guide

## 1. Prerequisites: Gmail App Password
To send emails using Gmail (for the newsletter), you cannot use your regular password. You must generate an App Password.

1. Go to your [Google Account Security Settings](https://myaccount.google.com/security).
2. Under "How you sign in to Google", enable **2-Step Verification** if not already enabled.
3. Once 2FA is on, search for **"App passwords"** in the search bar at the top or find it in the 2-Step Verification section.
4. Create a new App Password:
   - **App name**: "PlayHub Netlify"
5. Google will show you a 16-character code (e.g., `abcd efgh ijkl mnop`). **Copy this code.**

## 2. Configure Netlify Environment Variables
1. Log in to your [Netlify Dashboard](https://app.netlify.com/).
2. Select your site (`playhub-website` or similar).
3. Go to **Site configuration** > **Environment variables**.
4. Click **Add a variable** > **Add a single variable**.
5. Add the following two variables:

| Key | Value |
|-----|-------|
| `GMAIL_USER` | `playhub320@gmail.com` |
| `GMAIL_PASS` | *(Paste the 16-character App Password you copied earlier)* |

6. Click **Create variable**.

## 3. Trigger a Redeploy
Once variables are added, you may need to trigger a new deployment for them to take effect (though usually they apply immediately to functions).
1. Go to **Deploys**.
2. Click **Trigger deploy** > **Clear cache and deploy site**.

## 4. Verification
- Go to your live website.
- Enter an email in the newsletter form.
- If successful, you will see a green success message and receive an email at the subscribed address.
