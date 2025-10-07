export const countries = [
  // North America
  { code: "US", name: "United States", dialCode: "+1" },
  { code: "CA", name: "Canada", dialCode: "+1" },
  { code: "MX", name: "Mexico", dialCode: "+52" },

  // Central America & Caribbean
  { code: "CR", name: "Costa Rica", dialCode: "+506" },
  { code: "PA", name: "Panama", dialCode: "+507" },
  { code: "DO", name: "Dominican Republic", dialCode: "+1" },
  { code: "GT", name: "Guatemala", dialCode: "+502" },
  { code: "HN", name: "Honduras", dialCode: "+504" },
  { code: "SV", name: "El Salvador", dialCode: "+503" },
  { code: "NI", name: "Nicaragua", dialCode: "+505" },
  { code: "JM", name: "Jamaica", dialCode: "+1" },
  { code: "BS", name: "Bahamas", dialCode: "+1" },
  { code: "BB", name: "Barbados", dialCode: "+1" },
  { code: "TT", name: "Trinidad and Tobago", dialCode: "+1" },

  // South America
  { code: "AR", name: "Argentina", dialCode: "+54" },
  { code: "BR", name: "Brazil", dialCode: "+55" },
  { code: "CL", name: "Chile", dialCode: "+56" },
  { code: "CO", name: "Colombia", dialCode: "+57" },
  { code: "PE", name: "Peru", dialCode: "+51" },
  { code: "VE", name: "Venezuela", dialCode: "+58" },
  { code: "EC", name: "Ecuador", dialCode: "+593" },
  { code: "BO", name: "Bolivia", dialCode: "+591" },
  { code: "PY", name: "Paraguay", dialCode: "+595" },
  { code: "UY", name: "Uruguay", dialCode: "+598" },
  { code: "GY", name: "Guyana", dialCode: "+592" },
  { code: "SR", name: "Suriname", dialCode: "+597" },

  // Western Europe
  { code: "GB", name: "United Kingdom", dialCode: "+44" },
  { code: "DE", name: "Germany", dialCode: "+49" },
  { code: "FR", name: "France", dialCode: "+33" },
  { code: "IT", name: "Italy", dialCode: "+39" },
  { code: "ES", name: "Spain", dialCode: "+34" },
  { code: "PT", name: "Portugal", dialCode: "+351" },
  { code: "NL", name: "Netherlands", dialCode: "+31" },
  { code: "BE", name: "Belgium", dialCode: "+32" },
  { code: "IE", name: "Ireland", dialCode: "+353" },
  { code: "LU", name: "Luxembourg", dialCode: "+352" },
  { code: "MC", name: "Monaco", dialCode: "+377" },
  { code: "AD", name: "Andorra", dialCode: "+376" },

  // Northern Europe
  { code: "SE", name: "Sweden", dialCode: "+46" },
  { code: "NO", name: "Norway", dialCode: "+47" },
  { code: "DK", name: "Denmark", dialCode: "+45" },
  { code: "FI", name: "Finland", dialCode: "+358" },
  { code: "IS", name: "Iceland", dialCode: "+354" },
  { code: "EE", name: "Estonia", dialCode: "+372" },
  { code: "LV", name: "Latvia", dialCode: "+371" },
  { code: "LT", name: "Lithuania", dialCode: "+370" },

  // Central Europe
  { code: "CH", name: "Switzerland", dialCode: "+41" },
  { code: "AT", name: "Austria", dialCode: "+43" },
  { code: "PL", name: "Poland", dialCode: "+48" },
  { code: "CZ", name: "Czech Republic", dialCode: "+420" },
  { code: "SK", name: "Slovakia", dialCode: "+421" },
  { code: "HU", name: "Hungary", dialCode: "+36" },
  { code: "SI", name: "Slovenia", dialCode: "+386" },
  { code: "HR", name: "Croatia", dialCode: "+385" },

  // Southern Europe
  { code: "GR", name: "Greece", dialCode: "+30" },
  { code: "RO", name: "Romania", dialCode: "+40" },
  { code: "BG", name: "Bulgaria", dialCode: "+359" },
  { code: "RS", name: "Serbia", dialCode: "+381" },
  { code: "ME", name: "Montenegro", dialCode: "+382" },
  { code: "MK", name: "North Macedonia", dialCode: "+389" },
  { code: "AL", name: "Albania", dialCode: "+355" },
  { code: "MT", name: "Malta", dialCode: "+356" },
  { code: "CY", name: "Cyprus", dialCode: "+357" },

  // Eastern Europe
  { code: "RU", name: "Russia", dialCode: "+7" },
  { code: "UA", name: "Ukraine", dialCode: "+380" },
  { code: "BY", name: "Belarus", dialCode: "+375" },
  { code: "MD", name: "Moldova", dialCode: "+373" },

  // East Asia
  { code: "CN", name: "China", dialCode: "+86" },
  { code: "JP", name: "Japan", dialCode: "+81" },
  { code: "KR", name: "South Korea", dialCode: "+82" },
  { code: "TW", name: "Taiwan", dialCode: "+886" },
  { code: "HK", name: "Hong Kong", dialCode: "+852" },
  { code: "MO", name: "Macau", dialCode: "+853" },
  { code: "MN", name: "Mongolia", dialCode: "+976" },

  // Southeast Asia
  { code: "ID", name: "Indonesia", dialCode: "+62" },
  { code: "MY", name: "Malaysia", dialCode: "+60" },
  { code: "SG", name: "Singapore", dialCode: "+65" },
  { code: "TH", name: "Thailand", dialCode: "+66" },
  { code: "VN", name: "Vietnam", dialCode: "+84" },
  { code: "PH", name: "Philippines", dialCode: "+63" },
  { code: "MM", name: "Myanmar", dialCode: "+95" },
  { code: "KH", name: "Cambodia", dialCode: "+855" },
  { code: "LA", name: "Laos", dialCode: "+856" },
  { code: "BN", name: "Brunei", dialCode: "+673" },
  { code: "TL", name: "Timor-Leste", dialCode: "+670" },

  // South Asia
  { code: "IN", name: "India", dialCode: "+91" },
  { code: "PK", name: "Pakistan", dialCode: "+92" },
  { code: "BD", name: "Bangladesh", dialCode: "+880" },
  { code: "LK", name: "Sri Lanka", dialCode: "+94" },
  { code: "NP", name: "Nepal", dialCode: "+977" },
  { code: "BT", name: "Bhutan", dialCode: "+975" },
  { code: "MV", name: "Maldives", dialCode: "+960" },

  // Central Asia
  { code: "KZ", name: "Kazakhstan", dialCode: "+7" },
  { code: "UZ", name: "Uzbekistan", dialCode: "+998" },
  { code: "KG", name: "Kyrgyzstan", dialCode: "+996" },
  { code: "TJ", name: "Tajikistan", dialCode: "+992" },
  { code: "TM", name: "Turkmenistan", dialCode: "+993" },

  // Oceania
  { code: "AU", name: "Australia", dialCode: "+61" },
  { code: "NZ", name: "New Zealand", dialCode: "+64" },
  { code: "PG", name: "Papua New Guinea", dialCode: "+675" },
  { code: "FJ", name: "Fiji", dialCode: "+679" },
  { code: "SB", name: "Solomon Islands", dialCode: "+677" },
  { code: "VU", name: "Vanuatu", dialCode: "+678" },
  { code: "NC", name: "New Caledonia", dialCode: "+687" },
  { code: "PF", name: "French Polynesia", dialCode: "+689" },

  // Middle East
  { code: "AE", name: "United Arab Emirates", dialCode: "+971" },
  { code: "SA", name: "Saudi Arabia", dialCode: "+966" },
  { code: "QA", name: "Qatar", dialCode: "+974" },
  { code: "BH", name: "Bahrain", dialCode: "+973" },
  { code: "KW", name: "Kuwait", dialCode: "+965" },
  { code: "OM", name: "Oman", dialCode: "+968" },
  { code: "IL", name: "Israel", dialCode: "+972" },
  { code: "TR", name: "Turkey", dialCode: "+90" },
  { code: "IR", name: "Iran", dialCode: "+98" },
  { code: "IQ", name: "Iraq", dialCode: "+964" },
  { code: "JO", name: "Jordan", dialCode: "+962" },
  { code: "LB", name: "Lebanon", dialCode: "+961" },
  { code: "YE", name: "Yemen", dialCode: "+967" },

  // North Africa
  { code: "EG", name: "Egypt", dialCode: "+20" },
  { code: "MA", name: "Morocco", dialCode: "+212" },
  { code: "DZ", name: "Algeria", dialCode: "+213" },
  { code: "TN", name: "Tunisia", dialCode: "+216" },
  { code: "LY", name: "Libya", dialCode: "+218" },
  { code: "SD", name: "Sudan", dialCode: "+249" },

  // Sub-Saharan Africa
  { code: "ZA", name: "South Africa", dialCode: "+27" },
  { code: "NG", name: "Nigeria", dialCode: "+234" },
  { code: "KE", name: "Kenya", dialCode: "+254" },
  { code: "GH", name: "Ghana", dialCode: "+233" },
  { code: "ET", name: "Ethiopia", dialCode: "+251" },
  { code: "TZ", name: "Tanzania", dialCode: "+255" },
  { code: "UG", name: "Uganda", dialCode: "+256" },
  { code: "SN", name: "Senegal", dialCode: "+221" },
  { code: "CI", name: "Côte d'Ivoire", dialCode: "+225" },
  { code: "CM", name: "Cameroon", dialCode: "+237" },
  { code: "ZM", name: "Zambia", dialCode: "+260" },
  { code: "AO", name: "Angola", dialCode: "+244" },
  { code: "ZW", name: "Zimbabwe", dialCode: "+263" },
  { code: "MZ", name: "Mozambique", dialCode: "+258" },
  { code: "RW", name: "Rwanda", dialCode: "+250" },
  { code: "MU", name: "Mauritius", dialCode: "+230" },
  { code: "BW", name: "Botswana", dialCode: "+267" },
  { code: "NA", name: "Namibia", dialCode: "+264" },
].sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically by name

// Country name translations mapping
export const countryTranslations: Record<
  string,
  { en: string; ja: string; cn: string; id: string }
> = {
  // North America
  US: {
    en: "United States",
    ja: "アメリカ合衆国",
    cn: "美国",
    id: "Amerika Serikat",
  },
  CA: { en: "Canada", ja: "カナダ", cn: "加拿大", id: "Kanada" },
  MX: { en: "Mexico", ja: "メキシコ", cn: "墨西哥", id: "Meksiko" },

  // Central America & Caribbean
  CR: {
    en: "Costa Rica",
    ja: "コスタリカ",
    cn: "哥斯达黎加",
    id: "Kosta Rika",
  },
  PA: { en: "Panama", ja: "パナマ", cn: "巴拿马", id: "Panama" },
  DO: {
    en: "Dominican Republic",
    ja: "ドミニカ共和国",
    cn: "多明尼加共和国",
    id: "Republik Dominika",
  },
  GT: { en: "Guatemala", ja: "グアテマラ", cn: "危地马拉", id: "Guatemala" },
  HN: { en: "Honduras", ja: "ホンジュラス", cn: "洪都拉斯", id: "Honduras" },
  SV: {
    en: "El Salvador",
    ja: "エルサルバドル",
    cn: "萨尔瓦多",
    id: "El Salvador",
  },
  NI: { en: "Nicaragua", ja: "ニカラグア", cn: "尼加拉瓜", id: "Nikaragua" },
  JM: { en: "Jamaica", ja: "ジャマイカ", cn: "牙买加", id: "Jamaika" },
  BS: { en: "Bahamas", ja: "バハマ", cn: "巴哈马", id: "Bahama" },
  BB: { en: "Barbados", ja: "バルバドス", cn: "巴巴多斯", id: "Barbados" },
  TT: {
    en: "Trinidad and Tobago",
    ja: "トリニダード・トバゴ",
    cn: "特立尼达和多巴哥",
    id: "Trinidad dan Tobago",
  },

  // South America
  AR: { en: "Argentina", ja: "アルゼンチン", cn: "阿根廷", id: "Argentina" },
  BR: { en: "Brazil", ja: "ブラジル", cn: "巴西", id: "Brasil" },
  CL: { en: "Chile", ja: "チリ", cn: "智利", id: "Chili" },
  CO: { en: "Colombia", ja: "コロンビア", cn: "哥伦比亚", id: "Kolombia" },
  PE: { en: "Peru", ja: "ペルー", cn: "秘鲁", id: "Peru" },
  VE: { en: "Venezuela", ja: "ベネズエラ", cn: "委内瑞拉", id: "Venezuela" },
  EC: { en: "Ecuador", ja: "エクアドル", cn: "厄瓜多尔", id: "Ekuador" },
  BO: { en: "Bolivia", ja: "ボリビア", cn: "玻利维亚", id: "Bolivia" },
  PY: { en: "Paraguay", ja: "パラグアイ", cn: "巴拉圭", id: "Paraguay" },
  UY: { en: "Uruguay", ja: "ウルグアイ", cn: "乌拉圭", id: "Uruguay" },
  GY: { en: "Guyana", ja: "ガイアナ", cn: "圭亚那", id: "Guyana" },
  SR: { en: "Suriname", ja: "スリナム", cn: "苏里南", id: "Suriname" },

  // Western Europe
  GB: { en: "United Kingdom", ja: "イギリス", cn: "英国", id: "Britania Raya" },
  DE: { en: "Germany", ja: "ドイツ", cn: "德国", id: "Jerman" },
  FR: { en: "France", ja: "フランス", cn: "法国", id: "Prancis" },
  IT: { en: "Italy", ja: "イタリア", cn: "意大利", id: "Italia" },
  ES: { en: "Spain", ja: "スペイン", cn: "西班牙", id: "Spanyol" },
  PT: { en: "Portugal", ja: "ポルトガル", cn: "葡萄牙", id: "Portugal" },
  NL: { en: "Netherlands", ja: "オランダ", cn: "荷兰", id: "Belanda" },
  BE: { en: "Belgium", ja: "ベルギー", cn: "比利时", id: "Belgia" },
  IE: { en: "Ireland", ja: "アイルランド", cn: "爱尔兰", id: "Irlandia" },
  LU: {
    en: "Luxembourg",
    ja: "ルクセンブルク",
    cn: "卢森堡",
    id: "Luksemburg",
  },
  MC: { en: "Monaco", ja: "モナコ", cn: "摩纳哥", id: "Monako" },
  AD: { en: "Andorra", ja: "アンドラ", cn: "安道尔", id: "Andorra" },

  // Northern Europe
  SE: { en: "Sweden", ja: "スウェーデン", cn: "瑞典", id: "Swedia" },
  NO: { en: "Norway", ja: "ノルウェー", cn: "挪威", id: "Norwegia" },
  DK: { en: "Denmark", ja: "デンマーク", cn: "丹麦", id: "Denmark" },
  FI: { en: "Finland", ja: "フィンランド", cn: "芬兰", id: "Finlandia" },
  IS: { en: "Iceland", ja: "アイスランド", cn: "冰岛", id: "Islandia" },
  EE: { en: "Estonia", ja: "エストニア", cn: "爱沙尼亚", id: "Estonia" },
  LV: { en: "Latvia", ja: "ラトビア", cn: "拉脱维亚", id: "Latvia" },
  LT: { en: "Lithuania", ja: "リトアニア", cn: "立陶宛", id: "Lituania" },

  // Central Europe
  CH: { en: "Switzerland", ja: "スイス", cn: "瑞士", id: "Swiss" },
  AT: { en: "Austria", ja: "オーストリア", cn: "奥地利", id: "Austria" },
  PL: { en: "Poland", ja: "ポーランド", cn: "波兰", id: "Polandia" },
  CZ: { en: "Czech Republic", ja: "チェコ", cn: "捷克", id: "Republik Ceko" },
  SK: { en: "Slovakia", ja: "スロバキア", cn: "斯洛伐克", id: "Slovakia" },
  HU: { en: "Hungary", ja: "ハンガリー", cn: "匈牙利", id: "Hungaria" },
  SI: { en: "Slovenia", ja: "スロベニア", cn: "斯洛文尼亚", id: "Slovenia" },
  HR: { en: "Croatia", ja: "クロアチア", cn: "克罗地亚", id: "Kroasia" },

  // Southern Europe
  GR: { en: "Greece", ja: "ギリシャ", cn: "希腊", id: "Yunani" },
  RO: { en: "Romania", ja: "ルーマニア", cn: "罗马尼亚", id: "Rumania" },
  BG: { en: "Bulgaria", ja: "ブルガリア", cn: "保加利亚", id: "Bulgaria" },
  RS: { en: "Serbia", ja: "セルビア", cn: "塞尔维亚", id: "Serbia" },
  ME: { en: "Montenegro", ja: "モンテネグロ", cn: "黑山", id: "Montenegro" },
  MK: {
    en: "North Macedonia",
    ja: "北マケドニア",
    cn: "北马其顿",
    id: "Makedonia Utara",
  },
  AL: { en: "Albania", ja: "アルバニア", cn: "阿尔巴尼亚", id: "Albania" },
  MT: { en: "Malta", ja: "マルタ", cn: "马耳他", id: "Malta" },
  CY: { en: "Cyprus", ja: "キプロス", cn: "塞浦路斯", id: "Siprus" },

  // Eastern Europe
  RU: { en: "Russia", ja: "ロシア", cn: "俄罗斯", id: "Rusia" },
  UA: { en: "Ukraine", ja: "ウクライナ", cn: "乌克兰", id: "Ukraina" },
  BY: { en: "Belarus", ja: "ベラルーシ", cn: "白俄罗斯", id: "Belarus" },
  MD: { en: "Moldova", ja: "モルドバ", cn: "摩尔多瓦", id: "Moldova" },

  // East Asia
  CN: { en: "China", ja: "中国", cn: "中国", id: "Tiongkok" },
  JP: { en: "Japan", ja: "日本", cn: "日本", id: "Jepang" },
  KR: { en: "South Korea", ja: "韓国", cn: "韩国", id: "Korea Selatan" },
  TW: { en: "Taiwan", ja: "台湾", cn: "台湾", id: "Taiwan" },
  HK: { en: "Hong Kong", ja: "香港", cn: "香港", id: "Hong Kong" },
  MO: { en: "Macau", ja: "マカオ", cn: "澳门", id: "Makau" },
  MN: { en: "Mongolia", ja: "モンゴル", cn: "蒙古", id: "Mongolia" },

  // Southeast Asia
  ID: {
    en: "Indonesia",
    ja: "インドネシア",
    cn: "印度尼西亚",
    id: "Indonesia",
  },
  MY: { en: "Malaysia", ja: "マレーシア", cn: "马来西亚", id: "Malaysia" },
  SG: { en: "Singapore", ja: "シンガポール", cn: "新加坡", id: "Singapura" },
  TH: { en: "Thailand", ja: "タイ", cn: "泰国", id: "Thailand" },
  VN: { en: "Vietnam", ja: "ベトナム", cn: "越南", id: "Vietnam" },
  PH: { en: "Philippines", ja: "フィリピン", cn: "菲律宾", id: "Filipina" },
  MM: { en: "Myanmar", ja: "ミャンマー", cn: "缅甸", id: "Myanmar" },
  KH: { en: "Cambodia", ja: "カンボジア", cn: "柬埔寨", id: "Kamboja" },
  LA: { en: "Laos", ja: "ラオス", cn: "老挝", id: "Laos" },
  BN: { en: "Brunei", ja: "ブルネイ", cn: "文莱", id: "Brunei" },
  TL: {
    en: "Timor-Leste",
    ja: "東ティモール",
    cn: "东帝汶",
    id: "Timor Leste",
  },

  // South Asia
  IN: { en: "India", ja: "インド", cn: "印度", id: "India" },
  PK: { en: "Pakistan", ja: "パキスタン", cn: "巴基斯坦", id: "Pakistan" },
  BD: {
    en: "Bangladesh",
    ja: "バングラデシュ",
    cn: "孟加拉国",
    id: "Bangladesh",
  },
  LK: { en: "Sri Lanka", ja: "スリランカ", cn: "斯里兰卡", id: "Sri Lanka" },
  NP: { en: "Nepal", ja: "ネパール", cn: "尼泊尔", id: "Nepal" },
  BT: { en: "Bhutan", ja: "ブータン", cn: "不丹", id: "Bhutan" },
  MV: { en: "Maldives", ja: "モルディブ", cn: "马尔代夫", id: "Maladewa" },

  // Central Asia
  KZ: {
    en: "Kazakhstan",
    ja: "カザフスタン",
    cn: "哈萨克斯坦",
    id: "Kazakhstan",
  },
  UZ: {
    en: "Uzbekistan",
    ja: "ウズベキスタン",
    cn: "乌兹别克斯坦",
    id: "Uzbekistan",
  },
  KG: { en: "Kyrgyzstan", ja: "キルギス", cn: "吉尔吉斯斯坦", id: "Kirgistan" },
  TJ: {
    en: "Tajikistan",
    ja: "タジキスタン",
    cn: "塔吉克斯坦",
    id: "Tajikistan",
  },
  TM: {
    en: "Turkmenistan",
    ja: "トルクメニスタン",
    cn: "土库曼斯坦",
    id: "Turkmenistan",
  },

  // Oceania
  AU: {
    en: "Australia",
    ja: "オーストラリア",
    cn: "澳大利亚",
    id: "Australia",
  },
  NZ: {
    en: "New Zealand",
    ja: "ニュージーランド",
    cn: "新西兰",
    id: "Selandia Baru",
  },
  PG: {
    en: "Papua New Guinea",
    ja: "パプアニューギニア",
    cn: "巴布亚新几内亚",
    id: "Papua Nugini",
  },
  FJ: { en: "Fiji", ja: "フィジー", cn: "斐济", id: "Fiji" },
  SB: {
    en: "Solomon Islands",
    ja: "ソロモン諸島",
    cn: "所罗门群岛",
    id: "Kepulauan Solomon",
  },
  VU: { en: "Vanuatu", ja: "バヌアツ", cn: "瓦努阿图", id: "Vanuatu" },
  NC: {
    en: "New Caledonia",
    ja: "ニューカレドニア",
    cn: "新喀里多尼亚",
    id: "Kaledonia Baru",
  },
  PF: {
    en: "French Polynesia",
    ja: "フランス領ポリネシア",
    cn: "法属波利尼西亚",
    id: "Polinesia Prancis",
  },

  // Middle East
  AE: {
    en: "United Arab Emirates",
    ja: "アラブ首長国連邦",
    cn: "阿联酋",
    id: "Uni Emirat Arab",
  },
  SA: {
    en: "Saudi Arabia",
    ja: "サウジアラビア",
    cn: "沙特阿拉伯",
    id: "Arab Saudi",
  },
  QA: { en: "Qatar", ja: "カタール", cn: "卡塔尔", id: "Qatar" },
  BH: { en: "Bahrain", ja: "バーレーン", cn: "巴林", id: "Bahrain" },
  KW: { en: "Kuwait", ja: "クウェート", cn: "科威特", id: "Kuwait" },
  OM: { en: "Oman", ja: "オマーン", cn: "阿曼", id: "Oman" },
  IL: { en: "Israel", ja: "イスラエル", cn: "以色列", id: "Israel" },
  TR: { en: "Turkey", ja: "トルコ", cn: "土耳其", id: "Turki" },
  IR: { en: "Iran", ja: "イラン", cn: "伊朗", id: "Iran" },
  IQ: { en: "Iraq", ja: "イラク", cn: "伊拉克", id: "Irak" },
  JO: { en: "Jordan", ja: "ヨルダン", cn: "约旦", id: "Yordania" },
  LB: { en: "Lebanon", ja: "レバノン", cn: "黎巴嫩", id: "Lebanon" },
  YE: { en: "Yemen", ja: "イエメン", cn: "也门", id: "Yaman" },

  // North Africa
  EG: { en: "Egypt", ja: "エジプト", cn: "埃及", id: "Mesir" },
  MA: { en: "Morocco", ja: "モロッコ", cn: "摩洛哥", id: "Maroko" },
  DZ: { en: "Algeria", ja: "アルジェリア", cn: "阿尔及利亚", id: "Aljazair" },
  TN: { en: "Tunisia", ja: "チュニジア", cn: "突尼斯", id: "Tunisia" },
  LY: { en: "Libya", ja: "リビア", cn: "利比亚", id: "Libya" },
  SD: { en: "Sudan", ja: "スーダン", cn: "苏丹", id: "Sudan" },

  // Sub-Saharan Africa
  ZA: {
    en: "South Africa",
    ja: "南アフリカ",
    cn: "南非",
    id: "Afrika Selatan",
  },
  NG: { en: "Nigeria", ja: "ナイジェリア", cn: "尼日利亚", id: "Nigeria" },
  KE: { en: "Kenya", ja: "ケニア", cn: "肯尼亚", id: "Kenya" },
  GH: { en: "Ghana", ja: "ガーナ", cn: "加纳", id: "Ghana" },
  ET: { en: "Ethiopia", ja: "エチオピア", cn: "埃塞俄比亚", id: "Etiopia" },
  TZ: { en: "Tanzania", ja: "タンザニア", cn: "坦桑尼亚", id: "Tanzania" },
  UG: { en: "Uganda", ja: "ウガンダ", cn: "乌干达", id: "Uganda" },
  SN: { en: "Senegal", ja: "セネガル", cn: "塞内加尔", id: "Senegal" },
  CI: {
    en: "Côte d'Ivoire",
    ja: "コートジボワール",
    cn: "科特迪瓦",
    id: "Pantai Gading",
  },
  CM: { en: "Cameroon", ja: "カメルーン", cn: "喀麦隆", id: "Kamerun" },
  ZM: { en: "Zambia", ja: "ザンビア", cn: "赞比亚", id: "Zambia" },
  AO: { en: "Angola", ja: "アンゴラ", cn: "安哥拉", id: "Angola" },
  ZW: { en: "Zimbabwe", ja: "ジンバブエ", cn: "津巴布韦", id: "Zimbabwe" },
  MZ: { en: "Mozambique", ja: "モザンビーク", cn: "莫桑比克", id: "Mozambik" },
  RW: { en: "Rwanda", ja: "ルワンダ", cn: "卢旺达", id: "Rwanda" },
};
