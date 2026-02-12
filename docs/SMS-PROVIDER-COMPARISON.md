# SMS Provider Comparison

Decision: **Telnyx** — lowest cost for transactional SMS at low-to-mid volume,
Twilio-like API, trivial to switch later if needed.

## Pricing at a Glance (US domestic, outbound)

| Provider | Per SMS | Phone #/mo | 10DLC Campaign/mo | ~100 msgs/mo total | ~1,000 msgs/mo total |
|----------|---------|------------|--------------------|--------------------|----------------------|
| **Telnyx** | **$0.004** | **$1.10** | **~$1.50-2** | **~$4** | **~$10** |
| AWS SNS | $0.00645 | $1.00 | $2.00 | ~$3 (100 free) | ~$12 |
| Plivo | $0.0055 | $0.80 | ~$2-10 | ~$4 | ~$12 |
| Twilio | $0.0079 | $1.15 | $15.00 | ~$17 | ~$27 |
| Vonage | $0.0075 | $4.18 | ~$10 | ~$15 | ~$22 |

All providers charge carrier surcharges of ~$0.003/msg on top of base rate.

**10DLC** (10-Digit Long Code) registration is a US carrier requirement for
app-to-person SMS. Every provider requires it. The monthly campaign fee is
what separates them — Twilio charges $15/mo, Telnyx charges ~$1.50/mo.

## Developer Experience

| Provider | Docs | SDKs | Community | API Design |
|----------|------|------|-----------|------------|
| **Twilio** | Best-in-class | All major langs, excellent | Largest (SO, blogs) | Gold standard |
| **Telnyx** | Good | Node/Python/Go/Java | Smaller but growing | Twilio-like, clean |
| **Plivo** | Good | Node/Python/Go/Java | Adequate | Clean REST |
| **AWS SNS** | AWS-style | General AWS SDK only | Large (AWS ecosystem) | Clunky, not SMS-specific |

### Why Twilio has the best DX
- Twilio Functions (serverless), Studio (visual flows), Conversations API
- Copilot for intelligent number selection and deliverability
- Most community examples and blog posts by far

### Why Telnyx DX is good enough
- API is modeled after Twilio — nearly identical endpoint shapes
- Sending an SMS is one HTTP POST, ~5 lines of code with any provider
- Mission Control portal is decent for monitoring
- Good webhook support for delivery receipts

## Cost Comparison: Telnyx vs Twilio

| Monthly Volume | Telnyx | Twilio | Annual Savings |
|---------------|--------|--------|----------------|
| 50 msgs | ~$4 | ~$17 | **$156/yr** |
| 100 msgs | ~$4 | ~$17 | **$156/yr** |
| 500 msgs | ~$6 | ~$21 | **$180/yr** |
| 1,000 msgs | ~$10 | ~$27 | **$204/yr** |
| 5,000 msgs | ~$28 | ~$60 | **$384/yr** |

Savings are almost entirely from the 10DLC campaign fee difference
($1.50/mo vs $15/mo = $162/yr baseline).

## When Twilio Becomes Worth It

Switch to Twilio when:
- **Volume exceeds ~5,000 msgs/month** — the $15/mo fee becomes noise
- **You need Twilio-specific features** — Studio visual flows, Conversations
  API, intelligent routing, sender pooling
- **You need enterprise SLAs** — Twilio's support tiers are more mature

For Shareborough's use case (transactional loan reminders at low volume),
this threshold is years away.

## Switching Cost

Switching SMS providers is **trivial** — a 30-minute code change:
- Change the API endpoint URL
- Change the auth header
- Change the JSON body format slightly

The `reminders` table, scheduling logic, cron worker structure, and all
message templates stay the same. No data migration, no schema change,
no lock-in.

## Decision

**Use Telnyx.** Rationale:

1. **$150-200/yr cheaper** than Twilio at any volume under 5K msgs/mo
2. **Lowest per-message rate** ($0.004 vs $0.0079 for Twilio)
3. **Lowest 10DLC campaign fee** (~$1.50/mo vs $15/mo for Twilio)
4. **Twilio-like API** — familiar patterns, easy to find help
5. **Switching is 30 minutes** if we ever outgrow it
6. **No SDK needed** — one HTTP POST per message
