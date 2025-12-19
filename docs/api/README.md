# API Documentation

## Base URL

**Production:** `https://geekquote-controller.onrender.com`

All requests should go through the Controller gateway.

---

## Authentication

Currently, services do not require authentication from the client. The Anthropic API keys are managed server-side.

**Future:** Consider implementing API key authentication for client requests.

---

## Common Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2025-12-19T00:00:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": { ... }
  },
  "timestamp": "2025-12-19T00:00:00.000Z"
}
```

---

## Web Development API

### Base Path: `/api/web-dev`

### 1. Health Check
```http
GET /api/web-dev/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-19T00:00:00.000Z",
  "database": "connected",
  "mcp": {
    "enabled": true,
    "status": "healthy",
    "tools": 11
  }
}
```

---

### 2. Get MCP Tools
```http
GET /api/web-dev/api/mcp/tools
```

**Response:**
```json
{
  "enabled": true,
  "total": 11,
  "tools": [
    {
      "name": "search_past_projects",
      "description": "Search completed projects by type, budget, technologies",
      "parameters": ["query", "project_type", "budget_range", "technologies"],
      "required": []
    },
    ...
  ]
}
```

---

### 3. Chat (MCP with AI)
```http
POST /api/web-dev/api/mcp/chat
```

**Request Body:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "I want to build an e-commerce website"
    }
  ],
  "system_prompt": "You are an expert AI assistant...",
  "max_tool_uses": 10,
  "temperature": 0.7
}
```

**Response:**
```json
{
  "content": "Based on your e-commerce requirements...",
  "toolsUsed": ["search_past_projects", "estimate_project_cost"],
  "stopReason": "end_turn",
  "usage": {
    "inputTokens": 1234,
    "outputTokens": 567
  }
}
```

---

## Business Analytics API

### Base Path: `/api/ai-analytics`

### 1. Health Check
```http
GET /api/ai-analytics/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-19T00:00:00.000Z"
}
```

---

### 2. Revenue Analysis
```http
POST /api/ai-analytics/revenue
```

**Request Body:**
```json
{
  "timeRange": "Q4 2024",
  "data": {
    "revenue": 150000,
    "previousQuarter": 120000,
    "expenses": 90000
  }
}
```

**Response:**
```json
{
  "summary": "Q4 2024 revenue reached $150,000...",
  "insights": [
    "Revenue grew 25% QoQ",
    "Profit margin of 40% indicates excellent cost control",
    ...
  ],
  "recommendations": [
    "Analyze specific drivers behind revenue growth",
    "Consider strategic reinvestment",
    ...
  ]
}
```

---

### 3. Customer Analysis
```http
POST /api/ai-analytics/customer
```

**Request Body:**
```json
{
  "timeRange": "Last 30 days",
  "data": {
    "newCustomers": 150,
    "returningCustomers": 450,
    "churnRate": 5.2,
    "averageLifetimeValue": 2500
  }
}
```

**Response:** Similar structure to revenue analysis

---

### 4. Forecast
```http
POST /api/ai-analytics/forecast
```

**Request Body:**
```json
{
  "timeRange": "Next Quarter",
  "metrics": ["revenue", "customers", "expenses"],
  "data": {
    "historicalRevenue": [100000, 120000, 150000],
    "growthRate": 25
  }
}
```

**Response:** Analysis with projections and confidence intervals

---

## Marketing API

### Base Path: `/api/marketing`

### 1. Health Check
```http
GET /api/marketing/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-19T00:00:00.000Z",
  "service": "Marketing"
}
```

---

### 2. Generate Content
```http
POST /api/marketing/content
```

**Request Body:**
```json
{
  "type": "blog",
  "topic": "Benefits of AI in Software Development",
  "tone": "professional",
  "length": "medium",
  "keywords": ["AI", "automation", "efficiency"]
}
```

**Content Types:**
- `blog` - Blog post
- `social` - Social media post
- `email` - Email content
- `ad` - Advertisement copy
- `landing` - Landing page content

**Response:**
```json
{
  "content": "# Transforming Code: The Revolutionary Benefits...",
  "metadata": {
    "wordCount": 630,
    "readingTime": "4 min read"
  }
}
```

---

### 3. SEO Analysis
```http
POST /api/marketing/seo
```

**Request Body:**
```json
{
  "content": "Your website content here...",
  "keywords": ["AI development", "automation", "software"]
}
```

**Response:**
```json
{
  "score": 75,
  "analysis": "The content effectively targets primary keywords...",
  "recommendations": [
    "Expand content to 500+ words",
    "Add H2/H3 headings",
    "Include more long-tail keywords",
    ...
  ],
  "keywords": {
    "primary": ["AI development", "software automation"],
    "secondary": ["machine learning", "coding tools", ...]
  }
}
```

---

## Website Analytics API

### Base Path: `/api/website-analytics`

### 1. Health Check
```http
GET /api/website-analytics/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-19T00:00:00.000Z"
}
```

---

### 2. Traffic Analysis
```http
POST /api/website-analytics/traffic
```

**Request Body:**
```json
{
  "pageViews": 15000,
  "uniqueVisitors": 8500,
  "bounceRate": 45,
  "avgSessionDuration": 180,
  "timeRange": "Last 30 days",
  "topPages": [
    { "page": "/products", "views": 3500 },
    { "page": "/about", "views": 2200 }
  ]
}
```

**Response:**
```json
{
  "summary": "Traffic performance shows healthy engagement...",
  "insights": [
    "Bounce rate of 45% is within acceptable range",
    "Average session of 3 minutes indicates good content",
    ...
  ],
  "recommendations": [
    "Optimize top-performing pages for conversion",
    "Reduce bounce rate with better CTAs",
    ...
  ],
  "metrics": {
    "engagementScore": 72,
    "healthScore": 85
  }
}
```

---

### 3. Conversion Optimization
```http
POST /api/website-analytics/conversion
```

**Request Body:**
```json
{
  "totalVisitors": 5000,
  "conversions": 150,
  "conversionRate": 3.0,
  "goalType": "Newsletter signup"
}
```

**Response:**
```json
{
  "currentPerformance": {
    "conversionRate": "3%",
    "assessment": "Above average performance",
    "strengths": [...],
    "weaknesses": [...]
  },
  "optimizations": [
    {
      "recommendation": "Implement exit-intent popup",
      "description": "Deploy exit-intent technology...",
      "expectedLift": "25-40% increase"
    },
    ...
  ],
  "projectedImpact": {
    "conservativeScenario": {
      "newConversionRate": "4.2%",
      "additionalConversions": 60
    },
    "optimisticScenario": {
      "newConversionRate": "5.7%",
      "additionalConversions": 135
    }
  },
  "priority": [
    {
      "action": "A/B test signup form placement",
      "impact": 8,
      "effort": 3,
      "priority": "HIGH"
    },
    ...
  ]
}
```

---

## Rate Limiting

**Current:** No explicit rate limiting implemented

**Render.com Free Tier Limits:**
- Services may throttle based on resource usage
- Cold start after 15 minutes of inactivity

**Recommendation:** Implement rate limiting for production use

---

## Error Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Invalid API key |
| 404 | Not Found - Endpoint doesn't exist |
| 500 | Internal Server Error - Service error |
| 503 | Service Unavailable - Service sleeping or down |

---

## Best Practices

### Request Optimization
1. **Batch requests** when possible
2. **Cache responses** on client side when appropriate
3. **Handle cold starts** - Expect 30-60s delay for first request
4. **Implement retries** with exponential backoff

### Error Handling
```javascript
try {
  const response = await fetch(url, options);
  if (!response.ok) {
    // Handle HTTP errors
    throw new Error(`HTTP ${response.status}`);
  }
  return await response.json();
} catch (error) {
  if (error.message.includes('503')) {
    // Service sleeping - retry after delay
    await sleep(30000);
    return retry();
  }
  // Handle other errors
}
```

### Performance Tips
1. Send only necessary data
2. Use appropriate `max_tool_uses` limits
3. Cache MCP tool lists
4. Implement request timeouts (60s recommended)

---

## Webhooks (Future)

Not currently implemented. Consider for:
- Long-running analytics jobs
- Batch content generation
- Scheduled reports

---

## SDK Support (Future)

Consider creating client libraries for:
- JavaScript/TypeScript
- Python
- PHP (for WordPress integration)
