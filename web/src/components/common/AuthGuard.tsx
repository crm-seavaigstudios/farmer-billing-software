'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Only check auth for internal CRM pages
    const publicPaths = ['/login', '/agency-admin', '/register'];
    
    // Check if the current route is public
    if (publicPaths.includes(pathname || '')) {
      setIsAuthenticated(true);
      return;
    }

    // For all other routes, require an active session
    const activeSession = typeof window !== 'undefined' ? localStorage.getItem('active_tenant') : null;
    
    if (!activeSession) {
      // Redirect to login if not authenticated
      router.push('/login');
    } else {
      setIsAuthenticated(true);
    }
  }, [pathname, router]);

  // Prevent rendering internal pages until auth is confirmed
  if (!isAuthenticated) {
    return <div className="min-h-screen bg-slateCanvas flex items-center justify-center text-white">Loading...</div>;
  }

  return <>{children}</>;
}
