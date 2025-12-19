# Architecture Overview

## System Architecture
```
┌─────────────────────────────────────────────────────┐
│          WordPress + Angular Web Components         │
│              (geekatyourspot.com)                   │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│              ControllerBackend (Port 4000)          │
│          https://geekquote-controller.onrender.com  │
│                                                      │
│  Routes requests to specialized backends:           │
│  • /api/web-dev → WebDevelopmentBackend            │
│  • /api/ai-analytics → AIBusinessAnalyticsBackend  │
│  • /api/marketing → MarketingBackend               │
│  • /api/website-analytics → WebsiteAnalyticsBackend│
└──────────────────┬──────────────────────────────────┘
                   │
        ┌──────────┴──────────┬──────────┬──────────┐
        ▼                     ▼          ▼          ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│WebDevelopment│   │  Business    │   │  Marketing   │   │   Website    │
│   Backend    │   │  Analytics   │   │   Backend    │   │  Analytics   │
│  (Port 3000) │   │(Port 5001)   │   │(Port 5002)   │   │(Port 5003)   │
├──────────────┤   ├──────────────┤   ├──────────────┤   ├──────────────┤
│• MCP Tools   │   │• Revenue     │   │• Content Gen │   │• Traffic     │
│• Database    │   │• Growth      │   │• SEO Analysis│   │• Conversion  │
│• Pricing     │   │• Forecasting │   │              │   │• Optimization│
└──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘
```

## Service Responsibilities

### ControllerBackend
**Purpose:** Central API gateway and request router

**Responsibilities:**
- Route incoming requests to appropriate backend services
- Handle CORS for all services
- Provide unified health check endpoint
- Aggregate service status

**Technology:** Express.js, TypeScript

---

### WebDevelopmentBackend
**Purpose:** Software development project quoting and estimation

**Key Features:**
- 11 MCP (Model Context Protocol) tools
- Past project search
- Technology recommendations
- Service catalog management
- Cost estimation with confidence scores
- Feature pricing
- Budget optimization

**Dependencies:**
- Supabase (PostgreSQL database)
- Prisma ORM
- Anthropic Claude AI
- MCP Servers

**Technology:** Express.js, TypeScript, Prisma, MCP

---

### AIBusinessAnalyticsBackend
**Purpose:** AI-powered business intelligence and analytics

**Key Features:**
- Revenue analysis
- Customer analytics
- Growth forecasting
- Business insights generation
- Actionable recommendations

**Technology:** Express.js, TypeScript, Anthropic Claude AI

---

### MarketingBackend
**Purpose:** AI-powered content generation and SEO optimization

**Key Features:**
- Content generation (blog, social, email, ads, landing pages)
- SEO analysis and scoring
- Keyword recommendations
- Content optimization suggestions
- Multi-platform content adaptation

**Technology:** Express.js, TypeScript, Anthropic Claude AI

---

### WebsiteAnalyticsBackend
**Purpose:** Website traffic and conversion optimization

**Key Features:**
- Traffic analysis
- Engagement scoring
- Conversion rate optimization
- A/B test recommendations
- User behavior insights

**Technology:** Express.js, TypeScript, Anthropic Claude AI

---

## Shared Utilities

Located in `/shared`, provides common functionality:

### Logger
Standardized Winston-based logging across all services

### API Responses
Consistent success/error response formats

### Anthropic Helper
Reusable Claude AI wrapper with JSON parsing utilities

---

## Data Flow

### Example: Web Development Quote Request

1. User submits query via WordPress/Angular component
2. Frontend calls: `https://geekquote-controller.onrender.com/api/web-dev/api/mcp/chat`
3. ControllerBackend routes to: `https://geekquote-backend.onrender.com/api/mcp/chat`
4. WebDevelopmentBackend:
   - Parses request
   - Uses MCP tools to search past projects
   - Calls Claude AI with context
   - Returns structured response with pricing
5. Response flows back through Controller to frontend
6. Angular component displays quote to user

---

## Deployment Architecture

### Hosting: Render.com

**Advantages:**
- Free tier with automatic SSL
- Direct GitHub integration
- Automatic deployments on push
- Built-in logging and monitoring
- Environment variable management

**Considerations:**
- Free tier services sleep after 15 minutes of inactivity
- Cold start time: 30-60 seconds
- 512 MB RAM per free service

### Database: Supabase

**Advantages:**
- Managed PostgreSQL
- Free tier with 500 MB storage
- Built-in connection pooling
- Real-time capabilities (not currently used)

---

## Security Considerations

### API Keys
- Anthropic API keys stored as environment variables
- Never committed to git
- Separate keys per service in production

### CORS
- Configured to allow WordPress domain
- Controller handles CORS for all backends

### Rate Limiting
- Currently handled by Render.com
- Consider implementing application-level rate limiting for production scale

---

## Monitoring & Observability

### Health Checks
Each service provides `/health` endpoint returning:
```json
{
  "status": "ok",
  "timestamp": "2025-12-19T00:00:00.000Z",
  "service": "ServiceName"
}
```

### Logs
- Available in Render dashboard
- Structured JSON logging via Winston
- Service name tagged in all logs

---

## Scalability Considerations

### Current Limitations (Free Tier)
- Single instance per service
- 512 MB RAM limit
- Service sleep after inactivity
- No auto-scaling

### Future Improvements
- Implement caching (Redis)
- Add request queuing for heavy workloads
- Upgrade to paid tier for always-on services
- Implement circuit breakers for service failures
- Add comprehensive monitoring (DataDog, New Relic)

---

## Technology Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend | Angular 21 Web Components in WordPress |
| API Gateway | Express.js + TypeScript |
| Backends | Express.js + TypeScript |
| AI | Anthropic Claude Sonnet 4 |
| Database | PostgreSQL (Supabase) |
| ORM | Prisma |
| Logging | Winston |
| Hosting | Render.com |
| Version Control | GitHub |
