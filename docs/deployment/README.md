# Deployment Guide

## Overview

This guide covers deploying the GeekQuote backend services to Render.com.

---

## Prerequisites

- GitHub account with repository access
- Render.com account (free tier works)
- Anthropic API key
- Supabase account (for WebDevelopmentBackend database)

---

## Repository Structure
```
geek-at-your-spot-backend-workspace/
├── projects/
│   ├── ControllerBackend/
│   ├── WebDevelopmentBackend/
│   ├── AIBusinessAnalyticsBackend/
│   ├── MarketingBackend/
│   └── WebsiteAnalyticsBackend/
├── shared/
│   └── (shared utilities)
└── docs/
    └── (documentation)
```

---

## Deployment Order

Deploy in this order to ensure dependencies are available:

1. WebDevelopmentBackend (has database dependency)
2. AIBusinessAnalyticsBackend
3. MarketingBackend
4. WebsiteAnalyticsBackend
5. ControllerBackend (routes to all others)

---

## 1. Deploy WebDevelopmentBackend

### A. Create Supabase Database

1. Go to https://supabase.com
2. Create new project
3. Note connection strings from Settings → Database
4. Run SQL to create Prisma user:
```sql
create user "prisma" with password 'YourSecurePassword123!' bypassrls createdb;
grant "prisma" to "postgres";
grant usage on schema public to prisma;
grant create on schema public to prisma;
grant all on all tables in schema public to prisma;
grant all on all routines in schema public to prisma;
grant all on all sequences in schema public to prisma;
alter default privileges for role postgres in schema public grant all on tables to prisma;
alter default privileges for role postgres in schema public grant all on routines to prisma;
alter default privileges for role postgres in schema public grant all on sequences to prisma;
```

### B. Deploy to Render

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. Connect repository: `geek-at-your-spot-backend-workspace`
4. Configure:

| Setting | Value |
|---------|-------|
| Name | `geekquote-backend` |
| Region | Virginia (US East) |
| Branch | `main` |
| Root Directory | `projects/WebDevelopmentBackend` |
| Build Command | `npm install && npm run build` |
| Start Command | `npm start` |
| Instance Type | Free |

5. Add Environment Variables:
```
DATABASE_URL=postgresql://prisma:password@aws-0-us-east-1.pooler.supabase.com:5432/postgres
DIRECT_URL=postgresql://prisma:password@db.project-ref.supabase.co:5432/postgres
ANTHROPIC_API_KEY=sk-ant-...
NODE_ENV=production
PORT=3000
MCP_ENABLED=true
ANTHROPIC_MODEL=claude-sonnet-4-20250514
```

⚠️ **Important:** URL-encode special characters in passwords (& becomes %26)

6. Click **"Create Web Service"**
7. Wait for deployment (5-10 minutes)
8. Test: `curl https://geekquote-backend.onrender.com/health`

---

## 2. Deploy AIBusinessAnalyticsBackend

1. **"New +"** → **"Web Service"**
2. Repository: `geek-at-your-spot-backend-workspace`
3. Configure:

| Setting | Value |
|---------|-------|
| Name | `geekquote-ai-analytics` |
| Region | Virginia (US East) |
| Branch | `main` |
| Root Directory | `projects/AIBusinessAnalyticsBackend` |
| Build Command | `npm install && npm run build` |
| Start Command | `npm start` |
| Instance Type | Free |

4. Environment Variables:
```
PORT=5001
ANTHROPIC_API_KEY=sk-ant-...
NODE_ENV=production
```

5. Deploy and test: `curl https://geekquote-ai-analytics.onrender.com/health`

---

## 3. Deploy MarketingBackend

Same process as AIBusinessAnalyticsBackend:

| Setting | Value |
|---------|-------|
| Name | `geekquote-marketing` |
| Root Directory | `projects/MarketingBackend` |

Environment Variables:
```
PORT=5002
ANTHROPIC_API_KEY=sk-ant-...
NODE_ENV=production
```

Test: `curl https://geekquote-marketing.onrender.com/health`

---

## 4. Deploy WebsiteAnalyticsBackend

| Setting | Value |
|---------|-------|
| Name | `geekquote-website-analytics` |
| Root Directory | `projects/WebsiteAnalyticsBackend` |

Environment Variables:
```
PORT=5003
ANTHROPIC_API_KEY=sk-ant-...
NODE_ENV=production
```

Test: `curl https://geekquote-website-analytics.onrender.com/health`

---

## 5. Deploy ControllerBackend

**IMPORTANT:** Deploy this last after all other services are running.

| Setting | Value |
|---------|-------|
| Name | `geekquote-controller` |
| Root Directory | `projects/ControllerBackend` |

Environment Variables:
```
PORT=4000
WEB_DEV_BACKEND_URL=https://geekquote-backend.onrender.com
ANALYTICS_BACKEND_URL=https://geekquote-ai-analytics.onrender.com
MARKETING_BACKEND_URL=https://geekquote-marketing.onrender.com
WEBSITE_ANALYTICS_BACKEND_URL=https://geekquote-website-analytics.onrender.com
NODE_ENV=production
```

Test all proxies:
```bash
curl https://geekquote-controller.onrender.com/health
curl https://geekquote-controller.onrender.com/api/web-dev/health
curl https://geekquote-controller.onrender.com/api/ai-analytics/health
curl https://geekquote-controller.onrender.com/api/marketing/health
curl https://geekquote-controller.onrender.com/api/website-analytics/health
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] All code committed and pushed to GitHub
- [ ] Supabase database created and configured
- [ ] Anthropic API key obtained
- [ ] Environment variables documented

### During Deployment
- [ ] WebDevelopmentBackend deployed and healthy
- [ ] AIBusinessAnalyticsBackend deployed and healthy
- [ ] MarketingBackend deployed and healthy
- [ ] WebsiteAnalyticsBackend deployed and healthy
- [ ] ControllerBackend deployed and routing correctly

### Post-Deployment
- [ ] All health checks returning 200 OK
- [ ] Controller can proxy to all backends
- [ ] Database connections working
- [ ] MCP tools accessible
- [ ] Logs show no errors
- [ ] Frontend can communicate with Controller

---

## Common Issues & Solutions

### Issue: Build Fails with "Cannot find module @geekquote/shared"

**Cause:** Shared package not built during deployment

**Solution:** Update Build Command:
```bash
cd ../../shared && npm install && npm run build && cd ../projects/ServiceName && npm install && npm run build
```

### Issue: Service Returns 404 on Health Check

**Cause:** Service sleeping (free tier spins down after 15 min)

**Solution:** Wait 30-60 seconds for cold start, then retry

### Issue: Database Connection Failed

**Causes:**
- Wrong connection string
- Special characters not URL-encoded
- Prisma user not created
- IP restrictions

**Solutions:**
- Verify DATABASE_URL and DIRECT_URL
- URL-encode password special characters
- Run Prisma user creation SQL
- Check Supabase connection pooler settings

### Issue: CORS Error from Frontend

**Cause:** Frontend domain not in CORS allowlist

**Solution:** Update CORS in each backend:
```javascript
app.use(cors({
  origin: ['https://geekatyourspot.com', 'http://localhost:4200']
}));
```

### Issue: 503 Service Unavailable

**Causes:**
- Service crashed
- Resource limits exceeded
- Deployment in progress

**Solutions:**
- Check Render logs for errors
- Upgrade to paid tier for more resources
- Wait for deployment to complete

---

## Monitoring

### Health Checks

Set up external monitoring (recommended):
- UptimeRobot (free)
- Pingdom
- StatusCake

Monitor these endpoints every 5 minutes:
```
https://geekquote-controller.onrender.com/health
https://geekquote-backend.onrender.com/health
https://geekquote-ai-analytics.onrender.com/health
https://geekquote-marketing.onrender.com/health
https://geekquote-website-analytics.onrender.com/health
```

### Logs

Access in Render Dashboard:
1. Go to service
2. Click **"Logs"** tab
3. Filter by log level (info, error, warn)

**Log Retention:** 7 days on free tier

---

## Updating Services

### Automatic Deployment

Render automatically deploys when you push to `main` branch:
```bash
git add .
git commit -m "Update service"
git push origin main
```

Render will:
1. Detect push
2. Pull latest code
3. Run build command
4. Deploy new version
5. Health check
6. Switch traffic to new version

### Manual Deployment

In Render Dashboard:
1. Go to service
2. Click **"Manual Deploy"**
3. Select **"Deploy latest commit"** or **"Clear build cache & deploy"**

**Use "Clear cache"** when:
- Dependencies changed
- Build issues
- Shared package updated

---

## Rollback

If deployment fails:

1. Go to Render Dashboard → Service
2. Click **"Events"** tab
3. Find previous successful deployment
4. Click **"Rollback to this deploy"**

**OR** revert in Git:
```bash
git revert HEAD
git push origin main
```

---

## Environment Variables Management

### Best Practices

1. **Never commit secrets** to Git
2. **Use different keys** for dev/staging/prod
3. **Document all variables** in this guide
4. **Rotate keys periodically**

### Adding New Variables

1. Render Dashboard → Service → Environment
2. Click **"Add Environment Variable"**
3. Enter key and value
4. Click **"Save Changes"**
5. Service auto-restarts with new variables

---

## Scaling Considerations

### Free Tier Limits (Per Service)

- **RAM:** 512 MB
- **CPU:** Shared, 0.1 CPU
- **Bandwidth:** 100 GB/month
- **Build Time:** 500 minutes/month
- **Instances:** 1
- **Sleep:** After 15 minutes idle

### When to Upgrade

Upgrade when you experience:
- Frequent cold starts affecting UX
- Memory errors (OOM)
- Slow response times
- Need for always-on services
- Multiple concurrent requests failing

### Paid Tier Benefits

**Starter ($7/month per service):**
- No sleep
- 512 MB RAM
- Priority build queue
- 1 instance

**Standard ($25/month per service):**
- 2 GB RAM
- Multiple instances
- Auto-scaling
- Higher bandwidth

---

## Backup & Disaster Recovery

### Database Backups

Supabase automatically backs up:
- Daily backups (retained 7 days on free tier)
- Point-in-time recovery (paid plans)

**Manual Backup:**
```bash
pg_dump $DATABASE_URL > backup.sql
```

### Code Backups

- **Git:** Primary backup (GitHub)
- **Local:** Keep local clones updated
- **Tags:** Tag releases for easy rollback
```bash
git tag -a v1.0.0 -m "Production release"
git push origin v1.0.0
```

### Environment Variables Backup

Keep `.env.example` files in repo:
```bash
# .env.example (no actual secrets)
PORT=4000
ANTHROPIC_API_KEY=your_key_here
DATABASE_URL=postgresql://user:pass@host:5432/db
```

Store actual values securely:
- Password manager (1Password, Bitwarden)
- Encrypted file
- Secrets management service (Vault)

---

## Security Checklist

- [ ] API keys in environment variables (not code)
- [ ] CORS configured with specific origins
- [ ] HTTPS enforced (Render does this automatically)
- [ ] Database user has minimal required permissions
- [ ] No secrets in Git history
- [ ] Error messages don't leak sensitive info
- [ ] Rate limiting implemented (consider for production)
- [ ] Input validation on all endpoints

---

## Cost Estimation

### Free Tier (Current)

**Cost:** $0/month

**Includes:**
- 5 web services
- 100 GB bandwidth/month
- 500 build minutes/month
- Basic support

### Paid Tier (If Upgrading)

**Estimated Monthly Cost:**

| Service | Plan | Cost |
|---------|------|------|
| Controller | Starter | $7 |
| WebDev | Standard | $25 |
| Analytics | Starter | $7 |
| Marketing | Starter | $7 |
| WebAnalytics | Starter | $7 |
| **Total** | | **$53/month** |

**Additional Costs:**
- Supabase: $25/month (Pro plan)
- Anthropic API: Pay-per-use (~$50-200/month depending on volume)

**Total Estimated:** $128-278/month for professional tier

---

## Support & Troubleshooting

### Render Support

- **Community:** https://community.render.com
- **Docs:** https://render.com/docs
- **Status:** https://status.render.com

### Internal Support

- **Documentation:** This guide
- **Code Repository:** GitHub issues
- **Architecture Questions:** See architecture/README.md

---

## Next Steps

After successful deployment:

1. [ ] Set up monitoring
2. [ ] Configure custom domain (if needed)
3. [ ] Implement rate limiting
4. [ ] Add comprehensive logging
5. [ ] Create staging environment
6. [ ] Set up CI/CD pipeline
7. [ ] Document API usage examples
8. [ ] Create runbooks for common issues
