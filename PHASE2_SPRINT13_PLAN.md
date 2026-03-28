# Phase 2 Sprint 13: Lead Scoring & AI Insights (Intelligence Layer)

## Overview
Transform LeadFlow Pro from a simple lead capture tool into an intelligent lead qualification and insights platform. Users will receive AI-powered lead scoring, actionable insights, and predictive recommendations.

---

## Current State ✅
- Basic rule-based lead quality scoring (0-100 points)
- AI service with OpenAI integration (gpt-4o)
- Targeting analysis (company profile analysis)
- Campaign optimization suggestions
- AI suggestion persistence
- Lead scoring function (`scoreLeadWithAI`)

---

## Sprint 13 Deliverables (4-5 weeks)

### WEEK 1: Core Lead Scoring Enhancements

#### 1.1 Expand AI Lead Scoring Models
**File:** `apps/api/src/modules/ai/ai.service.ts`

Add 4 scoring models:
```typescript
// Model 1: Engagement Score (0-100)
// - Form completion rate
// - Time spent on landing page
// - Device type (desktop > mobile)
// - Browser type (Chrome > Safari)
// - Traffic source quality

// Model 2: Intent Score (0-100)
// - Keywords searched
// - Pages visited (conversion funnel stage)
// - Search queries
// - Intent signals from landing page
// - Time to conversion

// Model 3: Firmographic Score (0-100)
// - Company size match
// - Industry relevance
// - Annual revenue fit
// - Location alignment
// - Job title seniority

// Model 4: Risk Score (0-100, inverted)
// - Spam indicators
// - Duplicate detection
// - Invalid contact info
// - VPN/Proxy detection
// - Generic email domains (@gmail, @yahoo)
```

#### 1.2 Add Lead Enrichment Service
**New File:** `apps/api/src/modules/ai/enrichment.service.ts`

```typescript
interface LeadEnrichment {
  company_name?: string;
  company_size?: string;
  annual_revenue?: string;
  industry?: string;
  job_level?: 'C-level' | 'Director' | 'Manager' | 'Individual Contributor' | 'Other';
  linkedin_profile_url?: string;
  company_linkedin_url?: string;
  verified_email?: boolean;
  phone_valid?: boolean;
}

// Services (free alternatives to Apollo/Hunter):
// - ZoomInfo (if API available)
// - Clearbit (free tier)
// - Hunter.io (free tier for email verification)
// - RocketReach (free tier)
```

#### 1.3 Create Lead Scoring Breakdown Endpoint
**New Endpoint:** `GET /api/v1/ai/leads/:id/scoring-breakdown`

```json
{
  "leadId": "lead-123",
  "overall_score": 78,
  "scores": {
    "quality": 85,           // rule-based
    "engagement": 72,        // AI-based
    "intent": 88,            // AI-based
    "firmographic": 65,      // AI-based
    "risk": 92               // 100-risk_score (inverted)
  },
  "tier": "hot",             // hot (80+), warm (60-79), cold (40-59), junk (<40)
  "signals": [
    "High engagement on pricing page",
    "Clicked CTA multiple times",
    "Visited demo page",
    "Company size matches ICP",
    "Valid business email"
  ],
  "recommendations": [
    {
      "action": "call_immediately",
      "reason": "Hot lead with 88% intent score",
      "priority": "high"
    }
  ]
}
```

---

### WEEK 2: Lead Insights & Analytics Dashboard

#### 2.1 Create Lead Insights Page
**New File:** `apps/web/src/pages/LeadInsights.tsx`

Components:
- Lead score distribution chart (bar chart)
- Tier breakdown (Hot/Warm/Cold/Junk pie chart)
- Top scoring factors heatmap
- Lead comparison tool
- Scoring trends over time

#### 2.2 Lead Detail Insights Panel
**Enhance:** `apps/web/src/pages/LeadDetail.tsx`

Add new tab: "Insights"
- Detailed scoring breakdown
- Engagement timeline (visits, form fills, clicks)
- Firmographic data card
- Enrichment information
- AI recommendations
- Risk factors
- Next best action (NBA) button

#### 2.3 AI Suggestions Enhancement
**File:** `apps/api/src/modules/ai/ai.service.ts`

New methods:
```typescript
// Get next best action for lead
async getNextBestAction(leadId: string, tenantId: string): Promise<{
  action: string;        // 'call' | 'email' | 'sms' | 'wait'
  confidence: number;    // 0-100
  reasoning: string;
  suggested_message?: string;
}[]>

// Batch score leads for campaign
async scoreCampaignLeads(campaignId: string, tenantId: string): Promise<void>

// Get scoring trends
async getScoringTrends(tenantId: string, days: number): Promise<{
  date: string;
  avg_score: number;
  hot_count: number;
  warm_count: number;
  cold_count: number;
}>
```

---

### WEEK 3: Predictive Insights & Lead Recommendations

#### 3.1 Conversion Prediction Model
**New Service:** `apps/api/src/modules/ai/prediction.service.ts`

```typescript
interface ConversionPrediction {
  probability: number;      // 0-1 (0-100%)
  confidence: number;       // 0-100
  factors: {
    positive: string[];     // factors increasing probability
    negative: string[];     // factors decreasing probability
  };
  estimated_days_to_convert: number | null;
  suggested_follow_up_channel: 'email' | 'phone' | 'sms' | 'linkedin';
}

// Uses:
// - Historical conversion data
// - Lead profile similarity
// - Industry benchmarks
// - Temporal signals
```

#### 3.2 Lead Matching to ICP
**New Endpoint:** `POST /api/v1/ai/leads/:id/match-to-icp`

```json
{
  "match_score": 92,
  "matched_icp_segments": ["enterprise_tech", "high_intent"],
  "icp_fit": {
    "company_size": { score: 95, reason: "Company size 500+ matches target" },
    "industry": { score: 88, reason: "Technology sector aligned" },
    "revenue": { score: 90, reason: "Annual revenue $50M+ matches" },
    "location": { score: 85, reason: "US-based, primary market" },
    "decision_maker": { score: 92, reason: "VP-level executive" }
  }
}
```

#### 3.3 Competitor Detection
**Enhancement:** AI Service to detect if lead works for competitors

```typescript
// On lead creation:
async checkCompetitorRisk(leadData, tenantId): Promise<{
  is_competitor: boolean;
  company_name: string;
  competitor_score: number; // 0-100
  reason: string;
}
```

---

### WEEK 4: Frontend UI & Integrations

#### 4.1 Lead Intelligence Cards
**New Component:** `apps/web/src/components/LeadIntelligenceCard.tsx`

Displays on lead list:
- Lead score (visual indicator: gauge or bar)
- Tier badge (hot/warm/cold/junk)
- Top 2 signals
- Quick action button

#### 4.2 Bulk Scoring Dashboard
**New Route:** `GET /api/v1/ai/reports/lead-scoring`

```json
{
  "total_leads": 1250,
  "scoring_breakdown": {
    "hot": 180,      // 14.4%
    "warm": 320,     // 25.6%
    "cold": 480,     // 38.4%
    "junk": 270      // 21.6%
  },
  "average_score": 61,
  "score_distribution": {
    "0-20": 50,
    "21-40": 120,
    "41-60": 300,
    "61-80": 350,
    "81-100": 430
  },
  "trends": {
    "avg_score_7d": 59,
    "avg_score_30d": 58,
    "trend_direction": "up"
  },
  "top_factors": [
    { factor: "Valid email", count: 1150, impact: "high" },
    { factor: "ICP match", count: 890, impact: "high" },
    { factor: "High engagement", count: 620, impact: "medium" }
  ]
}
```

#### 4.3 Lead Recommendations Widget
**New Component:** `apps/web/src/components/LeadRecommendations.tsx`

On dashboard:
- "🔥 Hot Leads Needing Action" (top 5 hot leads)
- "⏰ Leads Expiring Soon" (convert within 48h)
- "⚠️ High-Risk Leads" (potential duplicates/spam)
- "✨ New High-Scoring Leads" (last 24h)

---

### WEEK 5: Testing, Documentation & Polish

#### 5.1 API Testing
- Unit tests for all scoring models
- Integration tests for enrichment service
- Load tests for batch scoring

#### 5.2 Frontend Testing
- Lead insights page components
- Scoring breakdown details
- Recommendations accuracy

#### 5.3 Documentation
- API docs for new endpoints
- Scoring algorithm explanation
- User guide for AI features

---

## API Endpoints (Comprehensive)

### Scoring & Analytics
```
GET    /api/v1/ai/leads/:id/scoring-breakdown
POST   /api/v1/ai/leads/batch-score
GET    /api/v1/ai/reports/lead-scoring
GET    /api/v1/ai/reports/scoring-trends?days=30

GET    /api/v1/ai/leads/:id/match-to-icp
POST   /api/v1/ai/leads/:id/check-competitor-risk
GET    /api/v1/ai/leads/:id/conversion-prediction

POST   /api/v1/ai/suggestions (create suggestion)
GET    /api/v1/ai/suggestions?type=&campaignId=&applied=
PATCH  /api/v1/ai/suggestions/:id/apply
DELETE /api/v1/ai/suggestions/:id
```

---

## Database Changes

### Add to Prisma Schema

```prisma
model LeadInsight {
  id                String      @id @default(cuid())
  leadId            String
  lead              Lead        @relation(fields: [leadId], references: [id], onDelete: Cascade)

  overallScore      Int         // 0-100
  qualityScore      Int         // rule-based
  engagementScore   Int?        // AI
  intentScore       Int?        // AI
  firmographicScore Int?        // AI
  riskScore         Int?        // 0-100, inverted

  tier              String      // 'hot' | 'warm' | 'cold' | 'junk'
  signals           String[]    // ["signal1", "signal2"]

  conversionProb    Float?      // 0-1
  estimatedDaysToConvert Int?
  nextBestAction    String?     // 'call' | 'email' | 'sms' | 'wait'

  enrichmentData    Json?       // Company info, LinkedIn, etc.

  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt

  @@index([leadId])
  @@index([tier])
  @@index([overallScore])
}

model AIInsight {
  id                String      @id @default(cuid())
  tenantId          String
  company           Company     @relation(fields: [tenantId], references: [tenantId], onDelete: Cascade)

  type              String      // 'lead_scoring' | 'competitor_detection' | 'market_trend'
  insight           Json
  actionable        Boolean

  createdAt         DateTime    @default(now())
  @@index([tenantId])
}
```

---

## Configuration

### Environment Variables Needed
```bash
OPENAI_API_KEY="sk-..."              # Already required
OPENAI_EMBEDDING_MODEL="text-embedding-3-small"
LEAD_ENRICHMENT_API_KEY=""            # Optional: Clearbit, Hunter.io
COMPETITOR_DB_API_KEY=""              # Optional: CompanyIQ, Dun & Bradstreet
```

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Lead scoring accuracy | 85% | Manual review sample |
| Average score per campaign | Baseline + 15% | Dashboard metrics |
| Conversion prediction accuracy | 80% | Historical conversion rate vs prediction |
| Hot lead conversion rate | 35%+ | Analytics dashboard |
| User adoption | 60%+ leads actioned | Activity tracking |
| AI feature usage | 50%+ daily active users | Feature analytics |

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| OpenAI API costs | High | Implement rate limiting, use cheaper gpt-4o-mini for per-lead scoring |
| AI hallucination | Medium | Validate all JSON responses, add fallback to rule-based scoring |
| Cold start (no historical data) | Medium | Use industry benchmarks, gradual learning curve |
| Data privacy (enrichment) | Medium | Only store non-PII enrichment, comply with GDPR |
| Competitor detection false positives | Low | Manual review for flagged leads, whitelist known partners |

---

## Implementation Timeline

```
Week 1: Scoring models, enrichment service
Week 2: Dashboard UI, insights page
Week 3: Prediction models, ICP matching
Week 4: Frontend polish, integrations
Week 5: Testing, documentation, launch
```

**Total Effort:** 4-5 sprints (~300-350 engineering hours)
**Team:** Backend (2), Frontend (1.5), QA (0.5)
