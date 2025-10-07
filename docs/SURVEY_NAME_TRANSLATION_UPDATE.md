# Survey Name Translation Implementation

## Overview

Updated both `CreatedSurveyTable` and `SurveyTable` components to display survey names in the user's selected language when translations are available, with fallback to the original name.

## Changes Made

### 1. New Utility Functions (`src/utils/surveyTranslation.ts`)

#### `getTranslatedSurveyName(survey: Survey, userLanguage: Language): string`

- Returns the translated survey name based on the user's selected language
- **Fallback Logic**:
  1. If no translation data exists → return original name
  2. If user language matches primary language → return original name
  3. If translation exists for user language → return translated name
  4. Otherwise → return original name (fallback)

#### `getTranslatedSurveyDescription(survey: Survey, userLanguage: Language): string | null`

- Returns the translated survey description based on the user's selected language
- Uses the same fallback logic as survey names
- Returns null if no description exists

### 2. Component Updates

#### `CreatedSurveyTable.tsx`

- **Added Import**: `getTranslatedSurveyName` from survey translation utils
- **Updated Display**: Changed `{survey.name}` to `{getTranslatedSurveyName(survey, language)}`
- **Language Context**: Uses existing `useLanguage()` hook to get current language

#### `SurveyTable.tsx`

- **Added Import**: `getTranslatedSurveyName` from survey translation utils
- **Updated Display**: Changed `{survey.name}` to `{getTranslatedSurveyName(survey, language)}`
- **Language Context**: Uses existing `useLanguage()` hook to get current language
- **Cleanup**: Removed unused imports and variables

### 3. Database Structure Used

The implementation leverages the existing survey translation structure:

```typescript
interface Survey {
  name: string; // Original name (primary language)
  primary_language?: Language; // Primary language set by creator
  title_translations?: TranslationDbFormat | null; // Translation data
}

interface TranslationDbFormat {
  primary: string; // Primary language code
  secondary: Record<string, TranslationLanguageData>; // Translations by language
}

interface TranslationLanguageData {
  mode: "auto" | "manual"; // How translation was created
  value: string; // Translated text
  hash?: string; // Hash for change detection
  updated_at?: string; // Last update timestamp
}
```

## User Experience

### Before

- Survey names always displayed in their original language (usually English)
- Users seeing surveys in non-native languages had difficulty understanding content

### After

- Survey names automatically display in the user's selected language when translations exist
- **English User**: Sees "Market Research Survey"
- **Chinese User**: Sees "市场研究调查" (if translated)
- **Japanese User**: Sees "市場調査アンケート" (if translated)
- **Indonesian User**: Sees "Survei Riset Pasar" (if translated)

## Technical Details

### Fallback Strategy

1. **Primary Language Match**: If user's language matches survey's primary language → show original name
2. **Translation Available**: If translation exists for user's language → show translated name
3. **No Translation**: If no translation available → show original name (safe fallback)

### Performance Considerations

- **Lightweight**: No additional API calls - uses data already loaded in survey objects
- **Client-side**: Translation logic runs in browser, no server round trips
- **Cached**: Survey data with translations loaded once and reused

### Language Support

- **English** (en) - Original/fallback language
- **Chinese** (cn) - 中文 translations
- **Japanese** (ja) - 日本語 translations
- **Indonesian** (id) - Bahasa Indonesia translations

## Implementation Notes

### Why This Approach?

1. **Reuses Existing Data**: Leverages survey translation system already in place
2. **No Schema Changes**: Works with current database structure
3. **Safe Fallbacks**: Always shows meaningful text even if translations missing
4. **Consistent UX**: Follows same pattern as other translated content

### Integration Points

- Works seamlessly with existing language switching in `LanguageContext`
- Compatible with translation management in survey builder
- Integrates with existing survey loading and filtering logic

## Testing Recommendations

1. **Language Switching**: Test switching languages and verify survey names update
2. **Missing Translations**: Test surveys without translations show original names
3. **Primary Language**: Test surveys in user's primary language show original names
4. **Mixed Languages**: Test tables with surveys in different languages
5. **Edge Cases**: Test surveys with null/empty translation data

## Future Enhancements

1. **Survey Descriptions**: Could extend to show translated descriptions in survey previews
2. **Tag Translations**: Could integrate with the tag translation system
3. **Search Integration**: Could make search work with translated names
4. **Sorting**: Could enhance sorting to work with translated names

This implementation significantly improves the user experience for international users while maintaining backward compatibility and performance.
