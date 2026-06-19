import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

type Lang = "en" | "bg";

const TRANSLATIONS: Record<Lang, Record<string, string>> = {
  en: {
    map: "Map",
    dashboard: "Dashboard",
    vehicles: "Vehicles",
    alerts: "Alerts",
    profile: "Profile",
    settings: "Settings",
    darkMode: "Dark Mode",
    language: "Language",
    fontSize: "Font Size",
    normal: "Normal",
    large: "Large",
    extraLarge: "Extra Large",
    signOut: "Sign Out",
    personalInfo: "Personal Info",
    edit: "Edit",
    cancel: "Cancel",
    saveChanges: "Save Changes",
    firstName: "First Name",
    lastName: "Last Name",
    phone: "Phone",
    favourites: "Favourites",
    noFavourites: "No favourite spots yet. Tap ☆ on any parking lot to save it.",
    navigate: "Navigate",
    openIn: "Open in…",
    googleMaps: "Google Maps",
    waze: "Waze",
    rememberChoice: "Remember my choice",
    notifications: "Notifications",
    markAllRead: "Mark All Read",
    broadcasts: "Announcements",
    events: "Event Warnings",
    viewDetails: "View Details",
    park: "Park",
  },
  bg: {
    map: "Карта",
    dashboard: "Табло",
    vehicles: "Автомобили",
    alerts: "Известия",
    profile: "Профил",
    settings: "Настройки",
    darkMode: "Тъмен режим",
    language: "Език",
    fontSize: "Размер на шрифта",
    normal: "Нормален",
    large: "Голям",
    extraLarge: "Много голям",
    signOut: "Изход",
    personalInfo: "Лична информация",
    edit: "Редактирай",
    cancel: "Отказ",
    saveChanges: "Запази",
    firstName: "Собствено",
    lastName: "Фамилия",
    phone: "Телефон",
    favourites: "Любими",
    noFavourites: "Нямате запазени места. Натиснете ☆ върху паркинг.",
    navigate: "Навигирай",
    openIn: "Отвори в…",
    googleMaps: "Google Карти",
    waze: "Waze",
    rememberChoice: "Запомни избора ми",
    notifications: "Известия",
    markAllRead: "Маркирай всички",
    broadcasts: "Съобщения",
    events: "Предупреждения",
    viewDetails: "Детайли",
    park: "Паркирай",
  },
};

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  setLang: () => {},
  t: (k) => k,
});

const STORAGE_KEY = "parkease_language";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === "en" || stored === "bg") setLangState(stored);
    });
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    AsyncStorage.setItem(STORAGE_KEY, l);
  }, []);

  const t = useCallback((key: string) => TRANSLATIONS[lang][key] ?? key, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
