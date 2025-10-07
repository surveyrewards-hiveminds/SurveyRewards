# Translation Token System Implementation

## Overview

Successfully implemented a token-based translation system to replace the "first language free" approach. This provides better control over translation costs and prevents abuse.

## Key Changes

### 1. Database Schema (`20250822000000_translation_token_system.sql`)

- **New columns in `profiles` table:**

  - `translation_tokens_total` (default: 1000) - Total tokens allocated per user
  - `translation_tokens_used` (default: 0) - Tokens consumed by user
  - `translation_tokens_updated_at` - Timestamp of last token update

- **New functions:**

  - `use_translation_tokens(user_id, characters_needed, description)` - Consumes tokens and returns usage details
  - `get_translation_token_status(user_id)` - Returns current token status for a user

- **Enhanced transaction types:**
  - Added `translation_token_usage` and `translation_credit_usage` to credit_transactions

### 2. Updated Pricing Logic (`translationPricing.ts`)

- **Removed constants:**

  - `TRANSLATION_FREE_LANGUAGES` (was 1)
  - Language-based free tier logic

- **Added constants:**

  - `TRANSLATION_FREE_TOKENS_PER_USER = 1000` - Free character tokens per user
  - `TRANSLATION_MAX_CHARGED_LANGUAGES = 3` - Now charges for all languages after tokens

- **Updated functions:**

  - `getAutoTranslationCharCount()` - Now counts ALL auto-translation characters (no "first language free")
  - `getUnpaidAutoTranslationCharCount()` - Counts only unpaid characters (same logic, but all languages)
  - `calculateTranslationCost()` - New function to calculate cost breakdown with token usage

- **New interfaces:**
  - `TranslationTokenStatus` - Token status information
  - `TranslationCostBreakdown` - Cost calculation results

### 3. New React Hook (`useTranslationTokens.ts`)

- **Token management:**

  - `fetchTokenStatus()` - Gets current token status from database
  - `useTokens(charactersNeeded, description)` - Consumes tokens and returns usage result
  - `calculateCostBreakdown(charactersNeeded)` - Calculates cost with token usage

- **Return values:**
  - `tokenStatus` - Current token status (total, used, available, percentage)
  - `loading` - Loading state for operations
  - `error` - Error message if operations fail

### 4. Enhanced Translation Modal (`TranslationConfirmationModal.tsx`)

- **New UI sections:**

  - Token status display with progress bar
  - Cost breakdown showing token usage vs credit charges
  - Clear indication when translation is free (covered by tokens)

- **Token-aware pricing:**
  - Shows tokens used vs remaining characters
  - Displays credit cost only for remaining characters after token usage
  - Highlights savings from using free tokens

### 5. Updated Translation Flow (`SurveyBuilder.tsx`)

- **Enhanced `handleConfirmedTranslation()`:**

  1. Calculate total characters needed using `getUnpaidAutoTranslationCharCount()`
  2. Use available tokens first via `useTokens()`
  3. Calculate credit cost for remaining characters after token usage
  4. Deduct credits only for remaining characters
  5. Proceed with actual translation

- **Token integration:**
  - Added `useTranslationTokens()` hook
  - Integrated token usage before credit deduction
  - Proper error handling for token operations

## User Experience Flow

### For New Users (1000 free tokens)

1. User creates survey with auto-translation enabled
2. System calculates total characters needed
3. **If ≤ 1000 characters:** Translation is completely FREE
4. **If > 1000 characters:** Uses 1000 free tokens + charges credits for remainder

### For Existing Users (tokens partially used)

1. System shows remaining token balance in modal
2. Uses remaining tokens first, then charges credits
3. Clear cost breakdown showing savings from tokens

### When Tokens Exhausted

1. All auto-translations are charged at full credit rate
2. Users can see their token usage history
3. No more "first language free" - all languages are treated equally

## Benefits

### 1. **Abuse Prevention**

- No more unlimited "first language free" for 100+ questions
- Fixed limit of 1000 free characters per user total

### 2. **Fair Pricing**

- Users with small surveys get completely free translation
- Users with large surveys pay proportionally after free allowance

### 3. **Transparency**

- Clear token status and usage in UI
- Users know exactly what they're paying for
- Detailed cost breakdown with savings shown

### 4. **Scalability**

- Easy to adjust token allowance per user type (premium users could get more)
- Token refills possible for special promotions
- Better cost control for the platform

## Migration Impact

### Existing Users

- All existing users get 1000 free tokens retroactively
- No impact on existing translated content
- Only affects new translation requests

### Database

- Non-breaking changes (new columns with defaults)
- Existing translation data remains unchanged
- New transaction types for better tracking

## Configuration

### Token Allocation

- Default: 1000 free tokens per user
- Easily configurable via database
- Can be adjusted per user if needed

### Pricing

- Still 1 JPY per 250 characters after tokens
- Token usage is completely free
- Clear separation between free and paid characters

## Technical Notes

### Performance

- Token checks are database functions (fast)
- Character counting optimized to avoid double-counting
- Minimal impact on existing translation flow

### Error Handling

- Graceful fallback if token operations fail
- Clear error messages in UI
- Transaction logging for debugging

### Security

- RLS policies protect token data
- Server-side token usage validation
- Audit trail through credit_transactions table

This implementation provides a much more sustainable and fair translation pricing model while maintaining excellent user experience for small-scale users.
