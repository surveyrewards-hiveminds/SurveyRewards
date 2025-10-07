# Country/Region Selector Translation Update

## Overview

Updated the `CountrySelector` component to support multilingual region and country group names instead of hardcoded English text.

## Changes Made

### 1. Translation Keys Added

Added comprehensive region translation keys to all language files:

#### English (`src/i18n/en.ts`)

- `regions.global` - "Global"
- `regions.clearAll` - "Clear All"
- `regions.asiaPacific` - "Asia Pacific"
- `regions.apac` - "APAC"
- `regions.eastAsia` - "East Asia"
- `regions.southeastAsia` - "Southeast Asia"
- `regions.southAsia` - "South Asia"
- `regions.europe` - "Europe"
- `regions.westernEurope` - "Western Europe"
- `regions.northernEurope` - "Northern Europe"
- `regions.centralEurope` - "Central Europe"
- `regions.southernEurope` - "Southern Europe"
- `regions.easternEurope` - "Eastern Europe"
- `regions.americas` - "Americas"
- `regions.northAmerica` - "North America"
- `regions.centralAmerica` - "Central America"
- `regions.caribbean` - "Caribbean"
- `regions.southAmerica` - "South America"
- `regions.middleEastAfrica` - "Middle East & Africa"
- `regions.middleEast` - "Middle East"
- `regions.northAfrica` - "North Africa"
- `regions.subSaharanAfrica` - "Sub-Saharan Africa"
- `regions.oceania` - "Oceania"

#### Chinese (`src/i18n/cn.ts`)

- `regions.global` - "全球"
- `regions.clearAll` - "清除全部"
- `regions.asiaPacific` - "亚太地区"
- `regions.apac` - "亚太区"
- `regions.eastAsia` - "东亚"
- `regions.southeastAsia` - "东南亚"
- `regions.southAsia` - "南亚"
- `regions.europe` - "欧洲"
- `regions.westernEurope` - "西欧"
- `regions.northernEurope` - "北欧"
- `regions.centralEurope` - "中欧"
- `regions.southernEurope` - "南欧"
- `regions.easternEurope` - "东欧"
- `regions.americas` - "美洲"
- `regions.northAmerica` - "北美"
- `regions.centralAmerica` - "中美"
- `regions.caribbean` - "加勒比海地区"
- `regions.southAmerica` - "南美"
- `regions.middleEastAfrica` - "中东和非洲"
- `regions.middleEast` - "中东"
- `regions.northAfrica` - "北非"
- `regions.subSaharanAfrica` - "撒哈拉以南非洲"
- `regions.oceania` - "大洋洲"

#### Japanese (`src/i18n/ja.ts`)

- `regions.global` - "全ての地域"
- `regions.clearAll` - "すべてクリア"
- `regions.asiaPacific` - "アジア太平洋"
- `regions.apac` - "APAC"
- `regions.eastAsia` - "東アジア"
- `regions.southeastAsia` - "東南アジア"
- `regions.southAsia` - "南アジア"
- `regions.europe` - "ヨーロッパ"
- `regions.westernEurope` - "西ヨーロッパ"
- `regions.northernEurope` - "北ヨーロッパ"
- `regions.centralEurope` - "中央ヨーロッパ"
- `regions.southernEurope` - "南ヨーロッパ"
- `regions.easternEurope` - "東ヨーロッパ"
- `regions.americas` - "アメリカ大陸"
- `regions.northAmerica` - "北アメリカ"
- `regions.centralAmerica` - "中央アメリカ"
- `regions.caribbean` - "カリブ海"
- `regions.southAmerica` - "南アメリカ"
- `regions.middleEastAfrica` - "中東・アフリカ"
- `regions.middleEast` - "中東"
- `regions.northAfrica` - "北アフリカ"
- `regions.subSaharanAfrica` - "サハラ以南アフリカ"
- `regions.oceania` - "オセアニア"

#### Indonesian (`src/i18n/id.ts`)

- `regions.global` - "Global"
- `regions.clearAll` - "Hapus Semua"
- `regions.asiaPacific` - "Asia Pasifik"
- `regions.apac` - "APAC"
- `regions.eastAsia` - "Asia Timur"
- `regions.southeastAsia` - "Asia Tenggara"
- `regions.southAsia` - "Asia Selatan"
- `regions.europe` - "Eropa"
- `regions.westernEurope` - "Eropa Barat"
- `regions.northernEurope` - "Eropa Utara"
- `regions.centralEurope` - "Eropa Tengah"
- `regions.southernEurope` - "Eropa Selatan"
- `regions.easternEurope` - "Eropa Timur"
- `regions.americas` - "Amerika"
- `regions.northAmerica` - "Amerika Utara"
- `regions.centralAmerica` - "Amerika Tengah"
- `regions.caribbean` - "Karibia"
- `regions.southAmerica` - "Amerika Selatan"
- `regions.middleEastAfrica` - "Timur Tengah & Afrika"
- `regions.middleEast` - "Timur Tengah"
- `regions.northAfrica` - "Afrika Utara"
- `regions.subSaharanAfrica` - "Afrika Sub-Sahara"
- `regions.oceania` - "Oseania"

### 2. Component Updates

Updated `src/components/survey/builder/settings/CountrySelector.tsx`:

- Replaced all hardcoded English region names with `<Text tid="..." />` components
- Removed unused React import
- All region buttons now dynamically display text based on user's selected language

### 3. Benefits

- **Multilingual Support**: Region names now appear in the user's selected language
- **Better UX**: Users can now understand region groupings in their native language
- **Consistency**: Follows the same translation pattern as other components
- **Maintainable**: Easy to add new languages or update translations

### 4. User Experience

When users switch languages, they will now see:

- **English**: Global, APAC, Western Europe, etc.
- **Chinese**: 全球, 亚太区, 西欧, etc.
- **Japanese**: 全ての地域, APAC, 西ヨーロッパ, etc.
- **Indonesian**: Global, APAC, Eropa Barat, etc.

### 5. Technical Implementation

- Uses existing `<Text tid="..." />` component for translations
- Leverages the language context to automatically switch languages
- No changes needed to region selection logic - only display text is translated
- Maintains all existing functionality while adding multilingual support

This update makes the survey platform more accessible to international users by providing region names in their preferred language.
