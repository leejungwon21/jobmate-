import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'JOBMATE - 취업 준비의 모든 것',
  description: '자기소개서 작성, 지원 관리, 면접 일정, 면접 복기를 하나로 관리하세요.',
  manifest: '/manifest.json',
  icons: { icon: '/favicon.ico' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#03C75A',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
