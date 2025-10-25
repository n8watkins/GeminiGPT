# Google OAuth Setup Guide

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a project"** → **"New Project"**
3. Name your project (e.g., "GeminiGPT")
4. Click **"Create"**

## Step 2: Enable Google+ API

1. In your project, go to **"APIs & Services"** → **"Library"**
2. Search for **"Google+ API"**
3. Click **"Enable"**

## Step 3: Configure OAuth Consent Screen

1. Go to **"APIs & Services"** → **"OAuth consent screen"**
2. Select **"External"** user type
3. Click **"Create"**

### Fill in required fields:
- **App name**: GeminiGPT (or your app name)
- **User support email**: your-email@gmail.com
- **Developer contact**: your-email@gmail.com

### Scopes (click "Add or Remove Scopes"):
- Select: `userinfo.email`
- Select: `userinfo.profile`
- Click **"Update"**

### Test users (Optional for development):
- Add your email address
- Click **"Save and Continue"**

## Step 4: Create OAuth 2.0 Credentials

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"+ Create Credentials"** → **"OAuth client ID"**
3. Select **"Web application"**

### Configure:
- **Name**: GeminiGPT Web Client

### Authorized JavaScript origins:
```
http://localhost:3000
https://your-app.railway.app  # Add your production URL
```

### Authorized redirect URIs:
```
http://localhost:3000/api/auth/callback/google
https://your-app.railway.app/api/auth/callback/google
```

4. Click **"Create"**

## Step 5: Copy Credentials

You'll see a popup with:
- **Client ID**: `123456789-abcdefg.apps.googleusercontent.com`
- **Client secret**: `GOCSPX-...`

⚠️ **Keep these secret!** Don't commit them to git.

## Step 6: Update Environment Variables

### For Local Development (.env.local):
```bash
# Add these lines to your .env.local file:
GOOGLE_CLIENT_ID=your_actual_client_id_here
GOOGLE_CLIENT_SECRET=your_actual_client_secret_here
NEXTAUTH_SECRET=generate_this_with_openssl_below
NEXTAUTH_URL=http://localhost:3000
```

### Generate NEXTAUTH_SECRET:
```bash
# Run this command in your terminal:
openssl rand -base64 32

# Copy the output and use it as NEXTAUTH_SECRET
```

### For Production (Railway):

Add these environment variables in Railway:
1. Go to your Railway project
2. Click **"Variables"**
3. Add:
   - `GOOGLE_CLIENT_ID` = your_client_id
   - `GOOGLE_CLIENT_SECRET` = your_client_secret
   - `NEXTAUTH_SECRET` = your_generated_secret
   - `NEXTAUTH_URL` = `https://your-app.railway.app`

## Step 7: Test Authentication

1. Start your dev server: `npm run dev`
2. Go to `http://localhost:3000`
3. Click **"Sign in with Google"**
4. You should see Google's consent screen
5. After authorizing, you'll be redirected back

## Troubleshooting

### Error: "redirect_uri_mismatch"
- Check that your redirect URI in Google Console exactly matches:
  - `http://localhost:3000/api/auth/callback/google` (dev)
  - `https://your-app.railway.app/api/auth/callback/google` (prod)
- No trailing slashes!

### Error: "invalid_client"
- Double-check your `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- Make sure they're copied correctly (no extra spaces)

### Error: "access_denied"
- Check OAuth consent screen is configured
- Add your email to test users (if in development mode)

### Session not persisting
- Check `NEXTAUTH_SECRET` is set correctly
- Must be at least 32 characters
- Don't change it after deployment (will invalidate sessions)

## Security Notes

⚠️ **NEVER commit these to git:**
- `.env.local` (already in .gitignore)
- `GOOGLE_CLIENT_SECRET`
- `NEXTAUTH_SECRET`

✅ **Safe to commit:**
- `.env.example` (templates only)
- Documentation

## Next Steps

After setup is complete:
1. ✅ OAuth credentials configured
2. ✅ Environment variables set
3. → Continue to Phase 2: Database Schema Updates

See `GOOGLE_OAUTH_PLAN.md` for full implementation plan.
