export type Lang = "bg" | "en";

export const translations = {
  // Filter panel — new rows only
  filterOfficialPenaltyLabel: { bg: "⚠️ Наказателен паркинг", en: "⚠️ Official Penalty" },
  alwaysVisible: { bg: "Винаги видим", en: "Always visible" },

  // Municipal parking bottom sheet
  municipalPaidType: { bg: "Платен паркинг", en: "Paid Parking" },
  operatorLabel: { bg: "Оператор", en: "Operator" },
  navigateBtn: { bg: "Навигация", en: "Navigate" },
  favouriteBtn: { bg: "Любимо", en: "Favourite" },

  // Official penalty bottom sheet
  officialPenaltyName: { bg: "Наказателен паркинг", en: "Official Penalty Parking" },
  officialPenaltyOperator: { bg: "Общинско Предприятие Транспорт", en: "Общинско Предприятие Транспорт" },
  officialPenaltyInfo: {
    bg: "Официален общински наказателен паркинг",
    en: "Official municipal impound lot",
  },

  // Profile preferences
  preferencesSection: { bg: "Предпочитания", en: "Preferences" },
  languageLabel: { bg: "Език / Language", en: "Language / Език" },
  langBulgarian: { bg: "🇧🇬 Български", en: "🇧🇬 Bulgarian" },
  langEnglish: { bg: "🇬🇧 English", en: "🇬🇧 English" },
} as const;

export type TranslationKey = keyof typeof translations;
