'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, ComponentType } from 'react';
import { 
  loadFramerMotion, 
  StaticDiv,
  type MotionDivProps
} from '@/lib/optimization/dynamic-motion';
import {
  Home,
  FileSearch,
  FileText,
  History,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useIsDesktop } from '@/lib/hooks/useMediaQuery';
import { authService } from '@/lib/services/auth-service';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Re-using the same navigation items from bottom-navigation for consistency
const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, href: '/dashboard' },
  { id: 'analysis', label: 'Analysis', icon: FileSearch, href: '/analysis' },
  { id: 'reports', label: 'Reports', icon: FileText, href: '/reports' },
  { id: 'history', label: 'History', icon: History, href: '/history' },
  { id: 'settings', label: 'Settings', icon: Settings, href: '/settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const isDesktop = useIsDesktop();

  // Dynamic motion loading
  const [motionComponents, setMotionComponents] = useState<{
    MotionDiv: ComponentType<MotionDivProps>;
  }>({
    MotionDiv: StaticDiv,
  });

  useEffect(() => {
    // Load framer-motion only when sidebar is mounted
    loadFramerMotion().then(({ motion }) => {
      setMotionComponents({
        MotionDiv: motion.div as ComponentType<MotionDivProps>,
      });
    });
  }, []);

  const { MotionDiv } = motionComponents;

  const handleLogout = async () => {
    await authService.signOut();
    // This will trigger a redirect to the login page via the auth listener
  };

  // Don't render on mobile to prevent hydration mismatch
  if (!isDesktop) {
    return null;
  }

  return (
    <aside className="flex flex-col bg-white border-r border-slate-200 h-screen sticky top-0">
      <div className="flex items-center justify-center h-16 border-b border-slate-200">
        <h1 className="text-xl font-bold text-blue-600">Pay-Analyzer</h1>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigationItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link key={item.id} href={item.href} className="block">
              <MotionDiv
                whileHover={{ x: 5 }}
                className={cn(
                  'flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <Icon className="w-5 h-5 mr-3" />
                <span>{item.label}</span>
              </MotionDiv>
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-slate-200">
        {user && (
            <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center">
                    <span className="font-semibold text-blue-700">{user.email?.[0].toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{user.email}</p>
                    <p className="text-xs text-slate-500">User</p>
                </div>
            </div>
        )}
        <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
          <LogOut className="w-5 h-5 mr-3" />
          Logout
        </Button>
      </div>
    </aside>
  );
}
