# Tag Translation System Documentation

## Overview

The tag translation system allows survey tags to be displayed in multiple languages (English, Chinese, Japanese, and Indonesian). This system uses a separate `tag_translations` table to store translations while keeping the original tag names in English.

## Database Schema

### Tables

1. **`tags`** - Master table for tags (English names)

   - `id` (uuid) - Primary key
   - `name` (text) - Original tag name in English
   - `created_at` (timestamptz) - Creation timestamp

2. **`tag_translations`** - Translation table
   - `id` (uuid) - Primary key
   - `tag_id` (uuid) - Foreign key to tags table
   - `language_code` (text) - Language code (en, cn, ja, id)
   - `translated_name` (text) - Translated tag name
   - `created_at` (timestamptz) - Creation timestamp
   - UNIQUE constraint on (`tag_id`, `language_code`)

### Migration Files

- `20250811000000_insert_tags_with_translations.sql` - Creates translation table and inserts all initial data
- `20250811000001_add_additional_tag_translations.sql` - Helper for additional translations

## Database Functions

### `get_translated_tags(language_code)`

Returns all tags with their translations for the specified language, with fallback to English if translation doesn't exist.

**Parameters:**

- `p_language_code` (text, default: 'en') - Language code

**Returns:**

- `id` (uuid) - Tag ID
- `name` (text) - Original tag name
- `translated_name` (text) - Translated name or fallback
- `created_at` (timestamptz) - Creation timestamp

**Example usage:**

```sql
SELECT * FROM get_translated_tags('ja'); -- Get all tags in Japanese
SELECT * FROM get_translated_tags('cn'); -- Get all tags in Chinese
```

### `get_tag_languages()`

Returns available languages and their tag counts.

**Returns:**

- `language_code` (text) - Language code
- `tag_count` (bigint) - Number of translated tags

## Frontend Implementation

### TypeScript Types

```typescript
export interface Tag {
  id: string;
  name: string;
  created_at?: string;
}

export interface TagTranslation {
  id: string;
  tag_id: string;
  language_code: string;
  translated_name: string;
  created_at: string;
}

export interface TagWithTranslations extends Tag {
  translations?: TagTranslation[];
  translated_name?: string; // Current translated name
}
```

### Utility Functions

Located in `src/utils/surveyTags.ts`:

- `fetchTagsWithTranslations(languageCode)` - Fetch all tags with translations
- `fetchSurveyTagsWithTranslations(surveyIds, languageCode)` - Fetch tags for specific surveys with translations

### Components Updated

- `SurveyTagsSelector` - Now displays translated tag names based on current language
- Uses `useLanguage()` hook to get current language context

## Language Codes

- `en` - English (default/fallback)
- `cn` - Chinese (Simplified)
- `ja` - Japanese
- `id` - Indonesian

## Adding New Translations

### Method 1: Direct SQL

```sql
INSERT INTO tag_translations (tag_id, language_code, translated_name) VALUES
  ('tag-uuid-here', 'new-language-code', 'translated-name')
ON CONFLICT (tag_id, language_code) DO UPDATE SET
  translated_name = EXCLUDED.translated_name;
```

### Method 2: Using the Migration Template

Update `20250811000001_add_additional_tag_translations.sql` with new translations.

### Method 3: Programmatically

```javascript
const { data, error } = await supabase.from("tag_translations").upsert([
  {
    tag_id: "tag-uuid",
    language_code: "fr",
    translated_name: "Translated Name",
  },
]);
```

## Usage Examples

### Get tags in user's language

```typescript
import { fetchTagsWithTranslations } from "../utils/surveyTags";
import { useLanguage } from "../context/LanguageContext";

const { language } = useLanguage();
const translatedTags = await fetchTagsWithTranslations(language);
```

### Display tags with translations

```tsx
{
  tags.map((tag) => (
    <span key={tag.id}>{tag.translated_name || tag.name}</span>
  ));
}
```

## Fallback Strategy

1. Try to get translation for requested language
2. Fall back to English translation
3. Fall back to original tag name

This ensures tags are always displayed, even if translations are missing.

## Best Practices

1. Always use the `get_translated_tags()` function instead of joining manually
2. Include fallback logic in frontend components
3. Keep original English names descriptive and clear
4. Update all language translations when adding new tags
5. Use the existing language codes consistently

## Migration Deployment

1. Run the main migration first: `20250811000000_insert_tags_with_translations.sql`
2. Run additional migrations as needed: `20250811000001_add_additional_tag_translations.sql`
3. Test the `get_translated_tags()` function with different language codes
4. Verify frontend components display correctly in all languages
