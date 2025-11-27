
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
    <header className="fixed top-0 left-0 right-0 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 shadow-lg z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30">
              <i className="ri-calculator-line text-white text-xl"></i>
            </div>
            <span className="text-2xl font-bold text-white font-['Pacifico']">TaxHelp AI</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-white/90 hover:text-white font-medium transition-colors px-3 py-2 rounded-lg hover:bg-white/10">
              Home
            </Link>
            <Link href="/file-taxes" className="text-white/90 hover:text-white font-medium transition-colors px-3 py-2 rounded-lg hover:bg-white/10">
              File Taxes
            </Link>
            <Link href="/refund-calculator" className="text-white/90 hover:text-white font-medium transition-colors px-3 py-2 rounded-lg hover:bg-white/10">
              Calculator
            </Link>
            <Link href="/plans" className="text-white/90 hover:text-white font-medium transition-colors px-3 py-2 rounded-lg hover:bg-white/10">
              Pricing
            </Link>
            <Link href="/tax-news" className="text-white/90 hover:text-white font-medium transition-colors px-3 py-2 rounded-lg hover:bg-white/10">
              Tax News
            </Link>
          </nav>

          {/* Language Selector & Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Language Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsLanguageOpen(!isLanguageOpen)}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg border border-white/30 hover:border-white/50 transition-colors bg-white/10 backdrop-blur-sm"
              >
                <span className="text-lg">{currentLang.flag}</span>
                <span className="text-sm font-medium text-white">{currentLang.code.toUpperCase()}</span>
                <i className="ri-arrow-down-s-line text-white/80"></i>
              </button>

              {isLanguageOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
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
              className="text-white/90 hover:text-white font-medium transition-colors px-4 py-2 rounded-lg hover:bg-white/10"
            >
              {t.nav.signIn}
            </Link>
            <Link
              href="/register"
              className="bg-white text-blue-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-50 transition-all duration-200 whitespace-nowrap shadow-lg"
            >
              {t.nav.getStarted}
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <i className={`ri-${isMenuOpen ? 'close' : 'menu'}-line text-xl text-white`}></i>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-white/20 py-4">
            <nav className="flex flex-col space-y-2">
              <Link
                href="/"
                className="text-white/90 hover:text-white font-medium transition-colors px-3 py-2 rounded-lg hover:bg-white/10"
                onClick={() => setIsMenuOpen(false)}
              >
                {t.nav.home}
              </Link>
              <Link
                href="/file-taxes"
                className="text-white/90 hover:text-white font-medium transition-colors px-3 py-2 rounded-lg hover:bg-white/10"
                onClick={() => setIsMenuOpen(false)}
              >
                {t.nav.fileTaxes}
              </Link>
              <Link
                href="/refund-calculator"
                className="text-white/90 hover:text-white font-medium transition-colors px-3 py-2 rounded-lg hover:bg-white/10"
                onClick={() => setIsMenuOpen(false)}
              >
                {t.nav.calculator}
              </Link>
              <Link
                href="/plans"
                className="text-white/90 hover:text-white font-medium transition-colors px-3 py-2 rounded-lg hover:bg-white/10"
                onClick={() => setIsMenuOpen(false)}
              >
                {t.nav.pricing}
              </Link>
              <Link
                href="/tax-news"
                className="text-white/90 hover:text-white font-medium transition-colors px-3 py-2 rounded-lg hover:bg-white/10"
                onClick={() => setIsMenuOpen(false)}
              >
                Tax News
              </Link>
              
              <div className="pt-4 border-t border-white/20">
                <div className="flex flex-col space-y-3">
                  <Link
                    href="/login"
                    className="text-white/90 hover:text-white font-medium transition-colors px-3 py-2 rounded-lg hover:bg-white/10"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {t.nav.signIn}
                  </Link>
                  <Link
                    href="/register"
                    className="bg-white text-blue-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-50 transition-all duration-200 text-center whitespace-nowrap shadow-lg"
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
