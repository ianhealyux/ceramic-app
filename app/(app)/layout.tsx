'use client';

import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect } from 'react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-ceramic-200 border-t-ceramic-600" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  const isUpload = pathname === '/upload';

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-ceramic-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 md:px-6 md:py-4">
          <Link href="/upload" className="text-xl font-bold text-ceramic-800">
            Cerámica
          </Link>
          <nav>
            <Link
              href="/upload"
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                isUpload
                  ? 'bg-ceramic-100 text-ceramic-800'
                  : 'text-ceramic-500 hover:text-ceramic-700'
              }`}
            >
              Nueva publicación
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6 md:px-6 md:py-8">
        {children}
      </main>
    </div>
  );
}
