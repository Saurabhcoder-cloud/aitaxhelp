'use client';

import { useState } from 'react';
import Link from 'next/link';
import { translations } from '@/lib/translations';

interface HeaderProps {
  currentLanguage: string;
  setCurrentLanguage: (lang: string) => void;
}

export default function Header({ currentLanguage, setCurrentLanguage }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);

  const t = translations[currentLanguage];

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
    { code: 'hi', name: 'हिंदी', flag: '🇮🇳' }
  ];

  const currentLang = languages.find(lang => lang.code === currentLanguage) || languages[0];

  return (
    <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <i className="ri-calculator-line text-white text-lg"></i>
            </div>
            <span className="text-xl font-bold text-gray-900 font-['Pacifico']">TaxHelp AI</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
              {t.nav.home}
            </Link>
            <Link href="/file-taxes" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
              {t.nav.fileTaxes}
            </Link>
            <Link href="/refund-calculator" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
              {t.nav.calculator}
            </Link>
            <Link href="/plans" className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
              {t.nav.pricing}
            </Link>
          </nav>

          {/* Language Selector & Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Language Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsLanguageOpen(!isLanguageOpen)}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg border border-gray-300 hover:border-gray-400 transition-colors"
              >
                <span className="text-lg">{currentLang.flag}</span>
                <span className="text-sm font-medium text-gray-700">{currentLang.code.toUpperCase()}</span>
                <i className="ri-arrow-down-s-line text-gray-500"></i>
              </button>

              {isLanguageOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setCurrentLanguage(lang.code);
                        setIsLanguageOpen(false);
                      }}
                      className="w-full flex items-center space-x-3 px-4 py-2 text-left hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-lg">{lang.flag}</span>
                      <span className="text-sm font-medium text-gray-700">{lang.name}</span>
                      {currentLanguage === lang.code && (
                        <i className="ri-check-line text-blue-600 ml-auto"></i>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Link
              href="/login"
              className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
            >
              {t.nav.signIn}
            </Link>
            <Link
              href="/register"
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 whitespace-nowrap"
            >
              {t.nav.getStarted}
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <i className={`ri-${isMenuOpen ? 'close' : 'menu'}-line text-xl text-gray-700`}></i>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <nav className="flex flex-col space-y-4">
              <Link
                href="/"
                className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                {t.nav.home}
              </Link>
              <Link
                href="/file-taxes"
                className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                {t.nav.fileTaxes}
              </Link>
              <Link
                href="/refund-calculator"
                className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                {t.nav.calculator}
              </Link>
              <Link
                href="/plans"
                className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                {t.nav.pricing}
              </Link>
              
              <div className="pt-4 border-t border-gray-200">
                <div className="flex flex-col space-y-3">
                  <Link
                    href="/login"
                    className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {t.nav.signIn}
                  </Link>
                  <Link
                    href="/register"
                    className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 text-center whitespace-nowrap"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {t.nav.getStarted}
                  </Link>
                </div>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
