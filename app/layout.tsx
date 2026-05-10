import type { Metadata, Viewport } from "next"
import { Noto_Sans_JP } from "next/font/google"
import { SpeedInsights } from "@vercel/speed-insights/next"
import "./globals.css"

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-sans-jp",
  display: "swap",
})

export const metadata: Metadata = {
  title: "GymNote",
  description: "ジムトレーニングを記録・分析するPWAアプリ",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GymNote",
  },
}

export const viewport: Viewport = {
  themeColor: "#1B3A6B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={`${notoSansJP.variable} font-sans bg-surface text-gray-900 antialiased`}>
        {children}
        <SpeedInsights />
      </body>
    </html>
  )
}
