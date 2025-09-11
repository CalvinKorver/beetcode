import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Beetcode - Track Your LeetCode Progress',
  description: 'A powerful Chrome extension to track your LeetCode problem-solving journey with detailed analytics and progress insights.',
  keywords: 'LeetCode, coding, interview prep, Chrome extension, problem tracking',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50">
        {children}
      </body>
    </html>
  )
}