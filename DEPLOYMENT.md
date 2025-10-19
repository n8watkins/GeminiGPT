# Deployment Guide

## Health Check Endpoint

### Overview
The application provides a health check endpoint for monitoring and load balancer configuration.

**Endpoint:** `GET /healthz`

**Response:**
```
HTTP/1.1 200 OK
Content-Type: text/plain

ok
```

### Implementation
Located in `server.js` (lines 52-58):
```javascript
// Handle health check directly
if (pathname === '/healthz') {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('ok');
  return;
}
```

### Usage

#### Local Development
```bash
curl http://localhost:3000/healthz
# Response: ok
```

#### Production (Railway)
```bash
curl https://your-app.up.railway.app/healthz
# Response: ok
```

### Monitoring Setup

#### Railway Configuration
Railway automatically monitors the health check endpoint. Configure in `railway.toml` or Railway dashboard:

```toml
[deploy]
healthcheckPath = "/healthz"
healthcheckTimeout = 100
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 10
```

#### Docker Health Check
If using Docker, add to `Dockerfile`:

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT}/healthz || exit 1
```

#### Kubernetes
For Kubernetes deployments:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gemini-chat-app
spec:
  containers:
  - name: app
    image: gemini-chat-app:latest
    livenessProbe:
      httpGet:
        path: /healthz
        port: 3000
      initialDelaySeconds: 15
      periodSeconds: 20
    readinessProbe:
      httpGet:
        path: /healthz
        port: 3000
      initialDelaySeconds: 5
      periodSeconds: 10
```

#### UptimeRobot
1. Go to https://uptimerobot.com
2. Add New Monitor
3. Monitor Type: HTTP(s)
4. URL: `https://your-app.up.railway.app/healthz`
5. Monitoring Interval: 5 minutes
6. Alert Contacts: Your email/Slack/etc.

### Production Checklist

#### Before Deployment

- [ ] Environment variables configured (see `.env.example`)
- [ ] `NEXT_PUBLIC_RAILWAY_URL` or `PRODUCTION_URL` set for CORS
- [ ] API keys secured (not in repository)
- [ ] Health check endpoint responding locally

#### After Deployment

- [ ] Test health check: `curl https://your-domain/healthz`
- [ ] Verify WebSocket connection (check browser console)
- [ ] Configure monitoring alerts
- [ ] Test rate limiting
- [ ] Verify CORS policy blocking unauthorized origins

## Environment Variables

### Required

```bash
# Gemini API Key (REQUIRED)
GEMINI_API_KEY=AIzaSy...
```

### Optional

```bash
# Google Search (for web search function calling)
GOOGLE_SEARCH_API_KEY=AIzaSy...
GOOGLE_SEARCH_ENGINE_ID=...

# Production URLs (required in production for CORS)
NEXT_PUBLIC_RAILWAY_URL=https://your-app.up.railway.app
PRODUCTION_URL=https://yourdomain.com

# Server Configuration
PORT=3000
NODE_ENV=production
ECHO_MODE=false
```

### Railway Deployment

#### Environment Setup
1. Go to Railway dashboard
2. Select your project
3. Go to Variables tab
4. Add all required environment variables
5. Deploy

#### Domain Configuration
1. Settings → Domains
2. Generate Railway domain or add custom domain
3. Set `NEXT_PUBLIC_RAILWAY_URL` to match the domain
4. Redeploy

#### Monitoring
- Railway provides automatic logs (View Logs)
- Automatic restarts on health check failures
- Metrics available in dashboard

## Security Considerations

### CORS Policy
The application uses a strict CORS policy:

**Development:**
- `http://localhost:3000`
- `http://localhost:1337`
- `http://127.0.0.1:3000`
- `http://127.0.0.1:1337`

**Production:**
- Only domains specified in `NEXT_PUBLIC_RAILWAY_URL` or `PRODUCTION_URL`

### API Key Security
- ✅ .env.local is gitignored
- ✅ Server validates API key format on startup
- ✅ Client-side API keys are fingerprinted with SHA-256
- ✅ Rate limiting prevents abuse

### Best Practices
1. **Rotate API keys regularly** (every 90 days)
2. **Use separate keys for development and production**
3. **Enable billing alerts** in Google Cloud Console
4. **Monitor usage** through the app's Usage Stats dashboard
5. **Use separate Google Cloud projects** for billing isolation

## Troubleshooting

### Health Check Failing

**Symptom:** `/healthz` returns error or times out

**Solutions:**
1. Check server logs for startup errors
2. Verify environment variables: `GEMINI_API_KEY` is required
3. Check port binding: Railway provides `PORT` env var
4. Test locally: `curl http://localhost:3000/healthz`

### WebSocket Connection Failed

**Symptom:** Chat doesn't work, WebSocket errors in console

**Solutions:**
1. Verify CORS configuration
2. Check `NEXT_PUBLIC_RAILWAY_URL` matches your domain
3. Ensure server is running and health check passes
4. Check browser console for specific error messages

### Rate Limit Errors

**Symptom:** "Rate limit exceeded" messages

**Solutions:**
1. Wait for rate limit to reset (shown in error message)
2. Check Usage Stats dashboard for current limits
3. If using BYOK, verify API key is valid
4. Consider upgrading Gemini API tier if needed

### Production Deployment Checklist

#### Pre-Deployment Security
- [ ] Remove all API keys from code
- [ ] Verify `.env.local` is in `.gitignore`
- [ ] Set production environment variables in Railway
- [ ] Configure strict CORS policy
- [ ] Enable error monitoring (optional: Sentry)

#### Post-Deployment Verification
- [ ] Health check returns 200 OK
- [ ] WebSocket connects successfully
- [ ] Rate limiting works (test with rapid requests)
- [ ] CORS blocks unauthorized origins
- [ ] Usage stats dashboard shows accurate data
- [ ] Function calling works (test web search, etc.)

#### Monitoring Setup
- [ ] Configure uptime monitoring (UptimeRobot, Pingdom, etc.)
- [ ] Set up error alerts
- [ ] Monitor Railway logs
- [ ] Enable Google Cloud API monitoring
- [ ] Set billing alerts in Google Cloud Console

## Support

For issues or questions:
- Check Railway logs for server-side errors
- Check browser console for client-side errors
- Review this deployment guide
- Check `.env.example` for required variables
