import type { Metadata } from "next";
import "./globals.css";
import { LocaleProvider } from "@/components/layout/locale-provider";
import { FooterCTA } from "@/components/layout/footer-cta";
import { Header } from "@/components/layout/header";
import { Toaster } from "@/components/ui/toaster";
import enMessages from "@/lib/messages/en.json";

export const metadata: Metadata = {
  title: enMessages.meta.title as string,
  description: enMessages.meta.description as string,
  openGraph: {
    title: enMessages.meta.title as string,
    description: enMessages.meta.description as string,
    url: "https://taxhelp.ai",
    siteName: "TaxHelp AI",
  },
  metadataBase: new URL("https://taxhelp.ai"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <LocaleProvider>
          <Toaster>
            <div className="flex min-h-screen flex-col">
              <Header />
              <main className="flex-1">{children}</main>
              <FooterCTA />
            </div>
          </Toaster>
        </LocaleProvider>
      </body>
    </html>
  );
}
