# Country Translation Implementation

## Overview

This document outlines the implementation of country name translations across the survey platform, supporting English (en), Japanese (ja), Chinese (cn), and Indonesian (id) languages.

## Files Modified

### Core Translation Infrastructure

#### 1. `src/data/countries.ts`

- **Status**: Enhanced with translation mapping
- **Changes**: Added `countryTranslations` object with translations for all countries
- **Features**:
  - Maintains original countries array for backwards compatibility
  - Comprehensive translation mapping for 140+ countries
  - Organized by geographical regions

#### 2. `src/utils/countryTranslations.ts` (New)

- **Purpose**: Core translation utilities
- **Functions**:
  - `getTranslatedCountries(language)`: Returns sorted array of countries with translated names
  - `getCountryName(code, language)`: Get single country translation
  - `formatCountriesTranslated(codes, language)`: Format multiple country codes to translated names

#### 3. `src/utils/country.ts`

- **Status**: Enhanced with translation support
- **Changes**: Added `formatCountriesWithLanguage()` function for backwards compatibility
- **Features**: Maintains existing `formatCountries()` for legacy support

#### 4. `src/hooks/useCountryTranslations.ts` (New)

- **Purpose**: React hook for country translations
- **Features**:
  - Automatic language detection from context
  - Memoized translations for performance
  - Easy-to-use formatting functions

### Component Updates

#### 1. `src/components/common/CountrySelect.tsx`

- **Status**: Updated for translation support
- **Changes**:
  - Uses `getTranslatedCountries()` for dropdown options
  - Automatically updates when language changes
  - Maintains country code as value for data consistency

#### 2. `src/components/common/PhoneInput.tsx`

- **Status**: Updated for translation support
- **Changes**:
  - Displays translated country names in dropdown
  - Maintains dial codes from original countries data
  - Search functionality works with translated names

#### 3. `src/components/survey/SurveyFilters.tsx`

- **Status**: Updated for translation support
- **Changes**:
  - Country filter dropdown shows translated names
  - Uses `useMemo` for performance optimization
  - Maintains filter functionality with country codes

#### 4. `src/components/survey/SurveyTable.tsx`

- **Status**: Updated for translation support
- **Changes**:
  - Target countries column displays translated names
  - Uses `useCountryTranslations` hook
  - Automatic updates when language changes

## Usage Patterns

### For Components

```typescript
import { useCountryTranslations } from "../hooks/useCountryTranslations";

function MyComponent() {
  const { translatedCountries, formatCountries } = useCountryTranslations();

  // Use translatedCountries for dropdowns
  // Use formatCountries(codes) for displaying country lists
}
```

### For Utilities

```typescript
import {
  getCountryName,
  formatCountriesTranslated,
} from "../utils/countryTranslations";

// Get single country name
const countryName = getCountryName("US", "ja"); // Returns: 'アメリカ合衆国'

// Format multiple countries
const formatted = formatCountriesTranslated(["US", "JP"], "cn"); // Returns: '美国, 日本'
```

## Translation Coverage

### Regions Covered

- **North America**: 3 countries (US, CA, MX)
- **Central America & Caribbean**: 12 countries
- **South America**: 12 countries
- **Western Europe**: 12 countries
- **Northern Europe**: 8 countries
- **Central Europe**: 8 countries
- **Southern Europe**: 9 countries
- **Eastern Europe**: 4 countries
- **East Asia**: 7 countries (CN, JP, KR, TW, HK, MO, MN)
- **Southeast Asia**: 11 countries (including ID, MY, SG, TH, VN, PH)
- **South Asia**: 7 countries
- **Central Asia**: 5 countries
- **Oceania**: 8 countries
- **Middle East**: 13 countries
- **North Africa**: 6 countries
- **Sub-Saharan Africa**: 20 countries

### Language Support

- **English (en)**: Complete (baseline)
- **Japanese (ja)**: Complete with proper Japanese country names
- **Chinese (cn)**: Complete with simplified Chinese characters
- **Indonesian (id)**: Complete with Indonesian country names

## Performance Considerations

### Optimizations

1. **Memoization**: All translation functions are memoized to prevent unnecessary recalculations
2. **Language Context**: Translations automatically update when language changes
3. **Lazy Loading**: Translations are computed on-demand
4. **Caching**: Translation results are cached per language

### Memory Usage

- Translation mapping adds ~50KB to bundle size
- Minimal runtime memory overhead due to object reuse
- No API calls required - all translations are hardcoded

## Testing Recommendations

### Manual Testing Steps

1. **Language Switching**:

   - Change language in UI settings
   - Verify country names update in all dropdowns
   - Check survey tables show translated country names

2. **Form Functionality**:

   - Test profile form country selection
   - Verify phone number country selection
   - Confirm survey filtering works with translations

3. **Data Consistency**:
   - Ensure country codes remain consistent
   - Verify data saves correctly regardless of display language
   - Check API calls use country codes, not translated names

### Automated Tests

- Unit tests for translation utilities
- Component tests for dropdown functionality
- Integration tests for language switching
- API integration tests for data consistency

## Future Enhancements

### Potential Improvements

1. **RTL Support**: Add right-to-left language support for Arabic countries
2. **Regional Variants**: Support for regional language differences (e.g., Traditional vs Simplified Chinese)
3. **Dynamic Loading**: Load translations dynamically to reduce initial bundle size
4. **User Preferences**: Remember user's preferred country display format
5. **Additional Languages**: Add support for Spanish, French, German, etc.

### Migration Path

- All changes are backwards compatible
- Existing code continues to work without modifications
- Gradual migration to new translation system recommended
- Legacy functions maintained for stability

## Implementation Status

✅ **Complete**: Core translation infrastructure  
✅ **Complete**: Component updates  
✅ **Complete**: Hook implementation  
✅ **Complete**: Documentation  
🔄 **Pending**: Manual testing and validation  
⏳ **Future**: Additional language support
