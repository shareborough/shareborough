# SMS Reminder System

## Architecture

Shareborough uses a cron worker to send SMS reminders via Telnyx.

```
  Loan Approved (Dashboard)
         │
         ▼
  scheduleReminders() creates reminder records in DB
         │
         ▼
  Cron worker runs every 15 minutes
         │
         ▼
  Queries reminders table for pending sends
         │
         ▼
  Sends SMS via Telnyx API
         │
         ▼
  Marks reminder as sent
```

## Setup

### 1. Telnyx Account

Sign up at telnyx.com and get:
- API Key (from the API Keys section in Mission Control)
- A phone number with messaging enabled

### 2. Environment Variables

```bash
TELNYX_API_KEY=KEY_xxxxxxxxxxxxxxxxxxxxxxxx
TELNYX_PHONE_NUMBER=+1234567890
AYB_URL=http://localhost:8090
AYB_ADMIN_TOKEN=your_admin_token
```

### 3. Reminder Scheduling

When a loan is approved, `scheduleReminders()` creates reminder records:

| Reminder Type | Timing | Message Template |
|--------------|--------|-----------------|
| confirmation | Immediately | "You're borrowing {item} from {owner}! Return by {date}." |
| upcoming | return_by - 2 days | "Friendly reminder: {item} is due back in 2 days!" |
| due_today | return_by | "Today's the day! Time to return {item}." |
| overdue_1d | return_by + 1 day | "{item} was due yesterday — return when you can!" |
| overdue_3d | return_by + 3 days | "{item} is 3 days overdue. Please return soon!" |
| overdue_7d | return_by + 7 days | "{item} is a week overdue. Please return to {owner}." |
| returned | On return | "Thanks for returning {item}! {owner} appreciates it." |

### 4. Cron Worker

The worker (`worker/send-reminders.ts`) runs every 15 minutes and:

1. Queries the reminders table for records where `sent_at IS NULL` and `scheduled_for <= NOW()`
2. Batch-loads the related loans and borrowers to get phone numbers
3. Sends each message via Telnyx's REST API
4. Updates `sent_at` on success

Run it:
```bash
# One-off
npx tsx worker/send-reminders.ts

# Via cron (every 15 min)
*/15 * * * * cd /path/to/shareborough && npx tsx worker/send-reminders.ts
```

### Example: Telnyx API Call

```javascript
const response = await fetch("https://api.telnyx.com/v2/messages", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${process.env.TELNYX_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    from: process.env.TELNYX_PHONE_NUMBER,
    to: borrower.phone,
    text: reminder.message,
  }),
});
```

## Cost Estimate

- Telnyx SMS: ~$0.004/msg (US) + ~$0.003 carrier surcharge
- Phone number: $1.10/mo
- 10DLC campaign: ~$1.50-2.00/mo
- Average loan: 4-6 reminders
- 100 loans/month = ~$3-7/month total

See `docs/SMS-PROVIDER-COMPARISON.md` for full provider comparison.
