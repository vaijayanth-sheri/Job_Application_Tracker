import type { Metadata } from 'next';
import './globals.css';
import LayoutShell from '@/components/LayoutShell';

export const metadata: Metadata = {
  title: 'JobTracker — Track Your Job Applications',
  description:
    'A lightweight, fast, and intuitive web-based application to track job applications, job boards, and skill gaps.',
  keywords: 'job tracker, job application, career, job search',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
