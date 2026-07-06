'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { ToastProvider } from '@/components/ui/Toast';
import QuickNotesPanel from '@/components/QuickNotesPanel';

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  return (
    <ToastProvider>
      {isLoginPage ? (
        <>{children}</>
      ) : (
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 lg:ml-64 relative min-h-screen bg-slate-50/30 overflow-x-hidden">
            {/* Decorative Background Blobs */}
            <div className="absolute top-40 -left-20 w-96 h-96 bg-brand-100/40 rounded-full blur-[100px] pointer-events-none -z-10"></div>
            <div className="absolute top-[600px] right-0 w-[500px] h-[500px] bg-blue-100/40 rounded-full blur-[120px] pointer-events-none -z-10"></div>
            
            {/* Background Graphic Masked */}
            <div 
              className="absolute top-0 right-0 w-full h-[450px] z-0 pointer-events-none opacity-40 mix-blend-multiply" 
              style={{ 
                backgroundImage: 'url(/hero_mountain.png)', 
                backgroundPosition: 'right top', 
                backgroundSize: 'cover', 
                backgroundRepeat: 'no-repeat', 
                maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)'
              }}
            ></div>

            <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-6 relative z-10">
              {children}
            </div>
          </main>
          <QuickNotesPanel />
        </div>
      )}
    </ToastProvider>
  );
}
