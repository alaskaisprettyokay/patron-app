import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Inter, JetBrains_Mono, Fraunces } from "next/font/google";
import { WaveMark } from "@/design/marks/WaveMark";
import "@rainbow-me/rainbowkit/styles.css";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });
const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["italic"],
  weight: ["700"],
  variable: "--font-fraunces",
});

const Providers = dynamic(() => import("./providers").then((m) => m.Providers), {
  ssr: false,
});

const ConnectButtonWrapper = dynamic(
  () => import("@/components/ConnectButtonWrapper"),
  { ssr: false }
);

export const metadata: Metadata = {
  title: "onda",
  description:
    "Detect what you're listening to. Send gifts directly to artists.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable} ${fraunces.variable}`}>
      <body className="min-h-screen">
        <Providers>
          <nav className="border-b border-rule">
            <div className="max-w-4xl mx-auto px-5 sm:px-8">
              <div className="flex justify-between items-center h-14">
                <a href="/" aria-label="onda — home" className="text-ink hover:text-onda transition-colors">
                  <WaveMark height={22} />
                </a>
                <div className="flex items-center gap-6">
                  <a href="/dashboard" className="text-ink-light hover:text-ink transition-colors text-sm">
                    dashboard
                  </a>
                  <a href="/claim" className="text-ink-light hover:text-ink transition-colors text-sm">
                    claim
                  </a>
                  <ConnectButtonWrapper />
                </div>
              </div>
            </div>
          </nav>
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
