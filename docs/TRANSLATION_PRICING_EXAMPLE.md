# Updated Translation Pricing System

## Problem Solved

The previous system incorrectly charged for ALL secondary languages, even if they were manually translated. The new system only charges for AUTO translations, respecting the mixed AUTO/MANUAL mode per language.

## Special Cases

**Scale Questions**: Scale-type questions only contain numeric values (min, max, step) and do not require translation. These are automatically excluded from translation character counting to avoid unnecessary charges.

## Example Scenario

**User Setup:**

- Primary language: English (free)
- Secondary languages:
  - Chinese: AUTO mode (will be charged if not first AUTO language)
  - Indonesian: MANUAL mode (always free)
  - Japanese: AUTO mode (will be charged if not first AUTO language)

**Survey Content:**

- Survey title: "Customer Satisfaction Survey" (33 characters)
- Survey description: "Please help us improve our service" (35 characters)
- Section title: "General Questions" (17 characters)
- Question: "How satisfied are you with our service?" (42 characters)

**Total characters per field:** 127 characters

## OLD System (Incorrect)

```
- Counts ALL secondary languages: Chinese + Indonesian + Japanese
- Charges for 2nd and 3rd language regardless of mode
- Cost: 127 chars × 2 languages = 254 characters
- Price: ¥2 (2 units of 250 chars)
```

## NEW System (Correct)

```
- Only counts AUTO languages: Chinese + Japanese
- Indonesian (MANUAL) is completely FREE
- First AUTO language (Chinese) is FREE
- Second AUTO language (Japanese) is CHARGED
- Cost: 127 chars × 1 charged language = 127 characters
- Price: ¥1 (1 unit of 250 chars)
```

## Translation Breakdown Display

The new modal shows:

**Translation Modes:**

- Free Auto Translation: Chinese (Free)
- Charged Auto Translation: Japanese
- Manual Translation: Indonesian (Free)

**Cost Breakdown:**

- Total Characters: 381 (127 × 3 languages)
- Charged Characters: 127 (only Japanese)
- Estimated Cost: ¥1

## Code Changes

### 1. Updated `translationPricing.ts`

- `countChargedChars()` now checks each language's individual mode
- Only counts languages where `mode === 'auto'`
- Properly applies free language limit per field

### 2. Updated `translationEstimation.ts`

- New `analyzeTranslationBreakdown()` function
- Provides detailed breakdown of AUTO vs MANUAL languages
- Shows which AUTO languages are free vs charged

### 3. Updated `TranslationConfirmationModal.tsx`

- Displays translation mode breakdown
- Shows free vs charged languages clearly
- Uses new estimation functions with survey object

## Benefits

1. **Fair Pricing**: Users only pay for what they actually use AUTO translation for
2. **Transparency**: Clear breakdown of what will be charged vs free
3. **Flexibility**: Users can mix AUTO and MANUAL translations optimally
4. **Cost Control**: Manual translations are always free, encouraging user involvement
