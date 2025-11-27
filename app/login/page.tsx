
'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { translations } from '@/lib/translations';

export default function LoginPage() {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const t = translations[currentLanguage];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle login logic here
    console.log('Login attempt:', { email, password, rememberMe });
  };

  const handleGoogleLogin = () => {
    // Handle Google OAuth login
    console.log('Google login initiated');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <Header currentLanguage={currentLanguage} setCurrentLanguage={setCurrentLanguage} />
      
      <main className="pt-20 pb-16">
        <div className="max-w-md mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{t.login.title}</h1>
              <p className="text-gray-600">{t.login.subtitle}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  {t.login.email}
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t.login.emailPlaceholder}
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  {t.login.password}
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t.login.passwordPlaceholder}
                  required
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">{t.login.rememberMe}</span>
                </label>
                <Link href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-800">
                  {t.login.forgotPassword}
                </Link>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200"
              >
                {t.login.signIn}
              </button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">{t.login.orContinueWith}</span>
                </div>
              </div>

              <button
                onClick={handleGoogleLogin}
                className="mt-4 w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <i className="ri-google-fill text-xl mr-3 text-red-500"></i>
                {t.login.continueWithGoogle}
              </button>
            </div>

            <p className="mt-8 text-center text-sm text-gray-600">
              {t.login.noAccount}{' '}
              <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">
                {t.login.signUp}
              </Link>
            </p>
          </div>
        </div>
      </main>

      <Footer currentLanguage={currentLanguage} />
    </div>
  );
}
