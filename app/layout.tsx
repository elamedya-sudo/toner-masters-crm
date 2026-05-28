import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "700"], // Normal ve Kalın font ağırlıkları
  variable: "--font-nunito",
});

export const metadata: Metadata = {
  title: "Toner Masters CRM",
  description: "Aydın Abi İçin Özel B2B & E-Ticaret CRM Sistemi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className={`${nunito.variable} font-sans antialiased bg-slate-50 text-slate-900`}>
        {/* Tüm sayfalar bu main etiketinin içinde render edilecek */}
        <main className="min-h-screen flex w-full">
          {children}
        </main>
      </body>
    </html>
  );
}