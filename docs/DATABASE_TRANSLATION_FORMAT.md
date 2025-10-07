# New Translation Database Format

## Overview

The updated translation system supports **per-language modes** (AUTO vs MANUAL) with change detection and proper cost calculation.

## Database Schema

### Field Structure

```sql
-- Each translatable field stores JSON in this format:
{
  "primary": "en",
  "secondary": {
    "ja": {
      "mode": "auto",
      "value": "こんにちは",
      "hash": "abc123",
      "updated_at": "2025-01-15T10:30:00Z"
    },
    "cn": {
      "mode": "manual",
      "value": "你好",
      "hash": "def456",
      "updated_at": "2025-01-15T11:15:00Z"
    }
  }
}
```

### Key Benefits

1. **Per-language mode control**: Each language can be AUTO or MANUAL independently
2. **Change detection**: Hash-based system detects content changes
3. **Fair pricing**: Only AUTO translations are charged
4. **Audit trail**: Timestamps track when translations were updated

## Real-World Example

### Scenario: Multi-language Survey

**User creates a survey with mixed translation preferences:**

```typescript
// Survey title field in database:
{
  "primary": "en",
  "secondary": {
    "ja": {
      "mode": "auto",
      "value": "顧客満足度調査",
      "hash": "a1b2c3",
      "updated_at": "2025-01-15T10:00:00Z"
    },
    "cn": {
      "mode": "manual",
      "value": "客户满意度调查",
      "hash": "d4e5f6",
      "updated_at": "2025-01-15T10:30:00Z"
    },
    "id": {
      "mode": "auto",
      "value": "Survei Kepuasan Pelanggan",
      "hash": "g7h8i9",
      "updated_at": "2025-01-15T11:00:00Z"
    }
  }
}
```

### Pricing Calculation

```typescript
// Function: getAutoTranslationCharCount()
// 1. Finds all fields with secondary translations
// 2. Only counts languages where mode === "auto"
// 3. Applies free language limit (first AUTO is free)

Languages analyzed:
- Japanese (ja): mode="auto" → CHARGED (2nd AUTO language)
- Chinese (cn): mode="manual" → FREE (manual translation)
- Indonesian (id): mode="auto" → FREE (1st AUTO language)

Result: Only Japanese translation is charged
```

## Code Integration

### 1. Reading from Database

```typescript
import { mapDbTranslationToUI } from "../utils/translationMapping";

// Convert DB format to UI format
const uiSettings = mapDbTranslationToUI(dbData, "en");
```

### 2. Saving to Database

```typescript
import { mapUITranslationToDb } from "../utils/translationMapping";

// Convert UI format to DB format
const dbData = mapUITranslationToDb(uiSettings, existingDbData);
```

### 3. Checking Translation Modes

```typescript
import {
  isLanguageAutoMode,
  isLanguageManualMode,
} from "../utils/translationMapping";

// Check if specific language is AUTO
if (isLanguageAutoMode(dbData, "ja")) {
  // This language will be charged for translation
}

// Check if specific language is MANUAL
if (isLanguageManualMode(dbData, "cn")) {
  // This language is free (user translated manually)
}
```

### 4. Cost Calculation

```typescript
import { getAutoTranslationCharCount } from "../utils/translationPricing";

// Calculate cost based on AUTO languages only
const charCount = getAutoTranslationCharCount(survey);
const cost = calculateTranslationPriceJPY(charCount);
```

## Migration Strategy

### Phase 1: Database Migration

```sql
-- Run the migration script to convert existing data
-- File: supabase/migrations/20250722000000_update_translation_format.sql
```

### Phase 2: Code Deployment

1. Update utilities (`translationMapping.ts`, `translationPricing.ts`)
2. Update components (`TranslationConfirmationModal.tsx`)
3. Update pricing logic to handle per-language modes

### Phase 3: Validation

1. Test existing surveys with translations
2. Verify pricing calculations are correct
3. Ensure UI correctly shows AUTO vs MANUAL modes

## User Experience Improvements

### Before (Global Mode)

```
Translation Mode: [AUTO] for all languages
Languages: Japanese, Chinese, Indonesian
Cost: ¥2 (charges for all secondary languages)
```

### After (Per-Language Mode)

```
Free Auto Translation: Indonesian
Charged Auto Translation: Japanese
Manual Translation: Chinese (Free)
Cost: ¥1 (only charges for Japanese)
```

## Error Prevention

### Hash-based Change Detection

```typescript
// Original content
const original = "Customer Satisfaction Survey";
const originalHash = "abc123";

// User modifies content
const modified = "Customer Experience Survey";
const newHash = generateTranslationHash(modified); // "xyz789"

// System detects change
if (originalHash !== newHash) {
  // Show warning: "Content changed, retranslation will replace existing translation"
}
```

This new format provides maximum flexibility while ensuring fair pricing and preventing unnecessary retranslation costs.
