import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import InstallPrompt from "@/components/InstallPrompt";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "منصة المساجد المتكاملة لإدارة الأداء",
  description:
    "منصة المساجد المتكاملة لإدارة الأداء — الإدخال والمتابعة ولوحة المعلومات",
  manifest: "/manifest.webmanifest",
  applicationName: "المساجد المتكاملة | الأداء",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "المساجد المتكاملة | الأداء",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#5A2114",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('mushar_theme');if(t==='dark'||(!t&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="font-sans antialiased">
        {children}
        <InstallPrompt />
      </body>
    </html>
  );
}
