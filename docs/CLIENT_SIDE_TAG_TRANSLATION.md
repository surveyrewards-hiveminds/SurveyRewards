# Client-Side Tag Translation Implementation

This document explains the client-side approach for displaying translated tags in survey tables.

## Approach: Client-Side Translation with Hook

### Overview

This approach keeps the existing RPC functions unchanged and implements tag translation on the client side using React hooks and utilities.

### Key Components

#### 1. Tag Translation Utilities (`src/utils/tagTranslation.ts`)

- **`getTranslatedTags()`**: Fetches translated tags with caching
- **`createTagTranslationMap()`**: Creates a map for quick tag ID lookup
- **`mapTagsToTranslated()`**: Converts basic tags to translated format
- **`tagsToSelectOptions()`**: Converts tags to dropdown options
- **`getTagDisplayName()`**: Gets display name with fallback

#### 2. Tag Translations Hook (`src/hooks/useTagTranslations.ts`)

- **`useTagTranslations()`**: Main hook that:
  - Automatically loads translated tags when language changes
  - Provides a `translateTags()` function to convert basic tags
  - Manages translation cache and loading states
  - Returns translated tags for filter dropdowns

#### 3. Updated Components

**SurveyTags Component:**

- Now accepts mixed tag types: `string | { id: string; name: string } | TagWithTranslations`
- Automatically displays translated names using `getTagDisplayName()`
- Backward compatible with existing string arrays

**Survey Tables (CreatedSurveyTable, SurveyTable):**

- Use `useTagTranslations()` hook
- Call `translateTags(survey.tags)` to convert tags before passing to SurveyTags
- Updated interfaces to handle new tag click types

**Pages (MySurvey, SurveyList):**

- Use `useTagTranslations()` hook
- Replace `fetchAvailableTags()` with automatic tag loading via useEffect
- Use `tagsToSelectOptions()` for filter dropdowns

### How It Works

```tsx
// 1. Hook automatically loads translated tags
const { translatedTags, translateTags } = useTagTranslations();

// 2. Convert basic tags to translated format
const translatedTagsForSurvey = translateTags(survey.tags);

// 3. SurveyTags automatically displays translated names
<SurveyTags tags={translatedTagsForSurvey} />;

// 4. Filter dropdowns get translated options
const tagOptions = tagsToSelectOptions(translatedTags);
```

### Performance Features

1. **Translation Caching**: Translated tags are cached per language
2. **Single API Call**: One call per language change via `fetchTagsWithTranslations()`
3. **Automatic Updates**: Tags update when language context changes
4. **Fallback Support**: Falls back to original names if translation missing

### Benefits

✅ **No Database Changes**: Keeps existing RPC functions unchanged  
✅ **Backward Compatible**: Works with existing tag structures  
✅ **Automatic Updates**: Translations update when language changes  
✅ **Performance Optimized**: Uses caching and single API calls  
✅ **Type Safe**: Full TypeScript support with proper interfaces

### Usage Example

```tsx
// In a component
import { useTagTranslations } from "../hooks/useTagTranslations";

function MyComponent({ survey }) {
  const { translateTags } = useTagTranslations();

  return (
    <SurveyTags tags={translateTags(survey.tags)} onTagClick={handleTagClick} />
  );
}
```

### Files Changed

- ✅ `src/utils/tagTranslation.ts` - New utilities
- ✅ `src/hooks/useTagTranslations.ts` - New hook
- ✅ `src/components/survey/SurveyTags.tsx` - Updated to handle mixed types
- ✅ `src/components/survey/CreatedSurveyTable.tsx` - Uses translation hook
- ✅ `src/components/survey/SurveyTable.tsx` - Uses translation hook
- ✅ `src/pages/MySurvey.tsx` - Updated for translated tags
- ✅ `src/pages/SurveyList.tsx` - Updated for translated tags

### Testing

1. Change language in the UI
2. Navigate to survey tables (MySurvey, SurveyList)
3. Tags should display in the selected language
4. Filter dropdowns should show translated tag names
5. All tag interactions should work correctly

This implementation provides efficient tag translation without requiring database changes while maintaining full functionality.
