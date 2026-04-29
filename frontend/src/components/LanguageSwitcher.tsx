'use client';

import { useLanguage } from '../context/LanguageContext';

const LANGUAGE_LABELS: Record<string, string> = {
  en: '🇬🇧 English',
  es: '🇪🇸 Español',
  fr: '🇫🇷 Français',
  hi: '🇮🇳 हिन्दी',
  de: '🇩🇪 Deutsch',
  ja: '🇯🇵 日本語',
  zh: '🇨🇳 中文',
  ar: '🇸🇦 العربية',
  pt: '🇧🇷 Português',
  ru: '🇷🇺 Русский',
};

export default function LanguageSwitcher() {
  const { language, setLanguage, supportedLanguages } = useLanguage();

  if (supportedLanguages.length <= 1) return null;

  return (
    <div className="relative group">
      <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-all">
        <span>{LANGUAGE_LABELS[language]?.split(' ')[0] || '🌐'}</span>
        <span className="hidden sm:inline">{language.toUpperCase()}</span>
        <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div className="absolute right-0 top-full mt-2 w-44 py-2 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
        {supportedLanguages.map((lang) => (
          <button
            key={lang}
            onClick={() => setLanguage(lang)}
            className={`w-full text-left px-4 py-2.5 text-sm transition-all ${
              lang === language
                ? 'bg-indigo-500/20 text-indigo-300'
                : 'text-white/60 hover:bg-white/5 hover:text-white'
            }`}
          >
            {LANGUAGE_LABELS[lang] || lang.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}
