import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rail Vazhi | ரெயில் வழி",
  description: "Know before you go - Indian railway gate closure predictor",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ta">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <header className="bg-rail-blue text-white px-4 py-3 shadow-md">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold leading-tight">ரெயில் வழி</h1>
            <p className="text-sm font-medium tracking-wide opacity-90">Rail Vazhi</p>
            <p className="text-xs text-blue-200 mt-0.5">Know before you go</p>
          </div>
        </header>
        <main className="min-w-[380px] max-w-2xl mx-auto">{children}</main>
      </body>
    </html>
  );
}
