# Survey Status Flow with Manual Start

## New Status Flow

1. **draft** + `payment_status: 'pending'` - Survey being created/edited, not yet paid
2. **draft** + `payment_status: 'paid'` - Survey paid and ready for auto-start (if `manual_start = false`)
3. **waiting-for-live** + `payment_status: 'paid'` - Survey paid and locked from editing (if `manual_start = true`)
4. **live** - Survey is active and accepting responses
5. **finished** - Survey has ended
6. **canceled** - Survey was cancelled

## Key Changes

### Database Schema

- Added `manual_start` boolean column (default: false)
- Reuses existing `waiting-for-live` status for paid manual start surveys
- Function `manually_start_survey(uuid)` for creators to start surveys from waiting-for-live
- Updated `auto_start_surveys()` to only start `draft + paid + !manual_start` surveys

### Business Logic

- Payment flow for `manual_start = true`: `draft` → `waiting-for-live` (locked from editing)
- Payment flow for `manual_start = false`: `draft` → `draft` (stays editable until auto-start)
- Surveys with `manual_start = true` require creator action from waiting-for-live to go live
- Surveys with `manual_start = false` auto-start from draft when paid and scheduled
- Only unpaid draft surveys remain editable
- Paid surveys are locked: either waiting-for-live (manual) or scheduled for auto-start (auto)

### UI Changes

- "Start Now" checkbox → "Manual Start" checkbox
- New "Start Survey" button for `waiting-for-live + manual_start + paid` surveys
- Status indicators show waiting-for-live for manual start surveys

### Cron Job Impact

- Existing cron job updated to only auto-start surveys with:
  - `status = 'draft'`
  - `payment_status = 'paid'`
  - `manual_start = false`
  - `start_date <= now()`
- Manual start surveys remain in `waiting-for-live` until creator starts them
- No conflict between manual and auto-start mechanisms
