# BeetCode Dashboard Deployment Guide

This guide walks you through deploying the BeetCode Next.js dashboard to production.

## Prerequisites

- Supabase project (with tables and RLS policies configured)
- Hosting platform account (Vercel recommended)
- Domain name (optional, but recommended)

## Table of Contents

1. [Environment Variables](#environment-variables)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Deploying to Vercel](#deploying-to-vercel)
4. [Deploying to Other Platforms](#deploying-to-other-platforms)
5. [Post-Deployment Configuration](#post-deployment-configuration)
6. [Troubleshooting](#troubleshooting)

## Environment Variables

The dashboard requires the following environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=your-anon-key-here
```

### Getting Your Supabase Credentials

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Settings** → **API**
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Project API keys** → `anon` `public` → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY`

⚠️ **Important**: Use the `anon` key, NOT the `service_role` key. The service role key should never be exposed in frontend code.

## Pre-Deployment Checklist

Before deploying, ensure:

- [ ] Database tables are created (`leetcode_problems`, `user_problems`, `user_problems_with_metadata` view)
- [ ] RLS policies are enabled on `user_problems` table
- [ ] Google OAuth is configured in Supabase (see [OAuth Setup](#oauth-setup))
- [ ] Authorized redirect URLs are added to Supabase Auth settings
- [ ] All tests pass: `npm test`
- [ ] Build succeeds locally: `npm run build`

### OAuth Setup

1. Go to **Supabase Dashboard** → **Authentication** → **Providers**
2. Enable **Google** provider
3. Add your OAuth credentials (Client ID and Client Secret from Google Cloud Console)
4. Add authorized redirect URLs:
   - For production: `https://yourdomain.com/auth/callback`
   - For local testing: `http://localhost:3000/auth/callback`

## Deploying to Vercel

Vercel is the recommended platform for Next.js applications.

### Option 1: Deploy with Vercel CLI

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy from the dashboard directory**:
   ```bash
   cd beetcode-dash
   vercel
   ```

4. **Follow the prompts**:
   - Set up and deploy? **Y**
   - Which scope? Select your account
   - Link to existing project? **N** (first time)
   - What's your project's name? **beetcode-dash** (or your preferred name)
   - In which directory is your code located? **./**
   - Want to override settings? **N**

5. **Add environment variables**:
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL production
   vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY production
   ```

6. **Deploy to production**:
   ```bash
   vercel --prod
   ```

## Post-Deployment Configuration

### 1. Update Extension Configuration

After deploying, update the Chrome extension to point to your production dashboard:

1. Edit `beetcode-tracker/.env.config.js`:
   ```javascript
   window.BEETCODE_CONFIG = {
     dashboardUrl: 'https://yourdomain.com',  // Your deployed dashboard URL
     serviceUrl: 'https://yourdomain.com',    // Same as dashboard (API routes are built-in)
   };
   ```

2. Reload the extension in Chrome

### 2. Configure CORS (if needed)

If your extension has CORS issues, add your extension ID to Supabase:

1. Go to **Supabase Dashboard** → **Settings** → **API**
2. Under **CORS**, add your Chrome extension origin:
   ```
   chrome-extension://your-extension-id
   ```

### 3. Update OAuth Redirect URLs

Add your production domain to Supabase Auth:

1. **Supabase Dashboard** → **Authentication** → **URL Configuration**
2. Add to **Redirect URLs**:
   ```
   https://yourdomain.com/auth/callback
   https://yourdomain.com/auth/**
   ```

### 4. Set Up Custom Domain (Optional)

**Vercel**:
1. Go to your project → **Settings** → **Domains**
2. Add your custom domain
3. Update DNS records as instructed
4. Update OAuth redirect URLs and extension config with new domain

## Troubleshooting

### Build Fails with "Module not found"

**Solution**: Ensure all dependencies are installed:
```bash
cd beetcode-dash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### "Invalid API key" errors

**Causes**:
- Using wrong Supabase key (service role instead of anon key)
- Environment variables not set correctly
- Typo in environment variable names

**Solution**:
1. Verify you're using the `anon` key
2. Check environment variable names are exact (including `NEXT_PUBLIC_` prefix)
3. Redeploy after updating environment variables

### Authentication Not Working

**Causes**:
- OAuth not configured
- Redirect URLs not whitelisted
- Cookie settings (SameSite issues)

**Solution**:
1. Verify Google OAuth is enabled in Supabase
2. Check redirect URLs match exactly (including protocol)
3. Ensure your domain uses HTTPS (required for OAuth)

### "Cannot read properties of null" errors

**Causes**:
- Missing database tables
- RLS policies blocking queries
- User not authenticated

**Solution**:
1. Run database migrations (see `/database/` folder)
2. Check RLS policies allow authenticated users to read their own data
3. Clear cookies and re-authenticate

### Extension Can't Connect to Dashboard

**Causes**:
- Wrong serviceUrl in extension config
- CORS issues
- API route not deployed

**Solution**:
1. Verify `serviceUrl` in extension matches deployed URL
2. Test API endpoint: `curl https://yourdomain.com/api/problems/track`
3. Add extension origin to Supabase CORS if needed

### Database Connection Issues

**Causes**:
- Incorrect Supabase URL
- Project paused (free tier)
- Network restrictions

**Solution**:
1. Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
2. Check Supabase project is active (not paused)
3. Check Vercel/deployment platform's network settings

## Performance Optimization

### Enable Caching

Add cache headers in `next.config.ts`:
```typescript
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
        ],
      },
    ];
  },
};
```

### Enable ISR (Incremental Static Regeneration)

For pages that don't need real-time updates:
```typescript
export const revalidate = 60; // Revalidate every 60 seconds
```

### Monitor Performance

- **Vercel**: Built-in analytics available in dashboard
- **Lighthouse**: Run `npx lighthouse https://yourdomain.com`
- **Sentry**: Add error tracking for production issues

## Security Checklist

- [ ] Using `anon` key (not `service_role` key) for client-side
- [ ] RLS policies enabled and tested
- [ ] HTTPS enabled (required for OAuth)
- [ ] OAuth redirect URLs restricted to your domains only
- [ ] Environment variables secured (not committed to git)
- [ ] CORS configured correctly (minimal origins allowed)
- [ ] Content Security Policy configured (if needed)

## Monitoring and Maintenance

### Health Check Endpoint

Create a health check endpoint at `app/api/health/route.ts`:
```typescript
export async function GET() {
  return Response.json({ status: 'ok', timestamp: new Date().toISOString() });
}
```

### Logs

- **Vercel**: View logs in dashboard under **Deployments** → Click deployment → **Logs**
- **Self-hosted**: Use `docker logs` or your platform's logging solution

### Updating

1. Make changes locally
2. Test: `npm run build && npm start`
3. Commit and push to GitHub
4. Vercel auto-deploys from main branch (if GitHub integration enabled)
5. Or manually deploy: `vercel --prod`

## Additional Resources

- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)
- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Chrome Extension OAuth Setup](../beetcode-tracker/OAUTH_SETUP.md)

## Support

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review deployment logs
3. Test locally with production environment variables
4. Check Supabase project status and logs
