
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Script from 'next/script';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TaxHelp AI - AI-Powered Global Tax Filing Made Simple',
  description: 'Automate your tax filing with AI. Upload documents, get instant calculations, and file taxes globally with confidence.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Script 
          src="https://readdy.ai/api/public/assistant/widget?projectId=f4674a2c-1fdc-4270-9d07-3e67b2f3fd97"
          strategy="afterInteractive"
          mode="hybrid"
          voice-show-transcript="true"
          theme="light"
          size="compact"
          accent-color="#14B8A6"
          button-base-color="#000000"
          button-accent-color="#FFFFFF"
        />
      </body>
    </html>
  );
}
