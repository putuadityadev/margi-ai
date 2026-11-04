import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// EN namespaces
import enCommon from '../locales/en/common.json';
import enLanding from '../locales/en/landing.json';
import enAuth from '../locales/en/auth.json';
import enExplore from '../locales/en/explore.json';
import enTrip from '../locales/en/trip.json';
import enApp from '../locales/en/app.json';

// ID namespaces
import idCommon from '../locales/id/common.json';
import idLanding from '../locales/id/landing.json';
import idAuth from '../locales/id/auth.json';
import idExplore from '../locales/id/explore.json';
import idTrip from '../locales/id/trip.json';
import idApp from '../locales/id/app.json';

export const defaultNS = 'common';
export const resources = {
  en: {
    common: enCommon,
    landing: enLanding,
    auth: enAuth,
    explore: enExplore,
    trip: enTrip,
    app: enApp,
  },
  id: {
    common: idCommon,
    landing: idLanding,
    auth: idAuth,
    explore: idExplore,
    trip: idTrip,
    app: idApp,
  },
} as const;

export type SupportedLanguage = 'en' | 'id';

function detectInitialLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') return 'en';

  const stored = localStorage.getItem('margi_locale');
  if (stored === 'id' || stored === 'en') {
    return stored;
  }

  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('id')) {
    return 'id';
  }

  return 'en';
}

const initialLang = detectInitialLanguage();

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLang,
  fallbackLng: 'en',
  defaultNS,
  ns: ['common', 'landing', 'analyzer', 'results', 'auth', 'admin', 'explore', 'trip'],
  interpolation: {
    escapeValue: false, // React handles XSS escaping
  },
});

// Sync html lang attribute
if (typeof document !== 'undefined') {
  document.documentElement.lang = initialLang;
}

i18n.on('languageChanged', (lng: string) => {
  const normalized = lng.startsWith('id') ? 'id' : 'en';
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('margi_locale', normalized);
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = normalized;
  }
});

export { i18n };
