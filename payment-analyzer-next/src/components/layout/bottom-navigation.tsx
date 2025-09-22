/**
 * Bottom Navigation Component
 * Mobile navigation matching the original app design
 */

'use client';

import { useRouter, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Home, 
  FileSearch, 
  FileText, 
  History, 
  Settings,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: number;
  matchPaths?: string[];
}

const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: Home,
    href: '/dashboard',
    matchPaths: ['/dashboard'],
  },
  {
    id: 'analysis',
    label: 'Analyse',
    icon: FileSearch,
    href: '/analysis',
    matchPaths: ['/analysis'],
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: FileText,
    href: '/reports',
    matchPaths: ['/reports'],
  },
  {
    id: 'history',
    label: 'History',
    icon: History,
    href: '/history',
    matchPaths: ['/history'],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    href: '/settings',
    matchPaths: ['/settings'],
  },
];

export interface BottomNavigationProps {
  currentPage?: string;
  visible?: boolean;
  badges?: Record<string, number>;
  className?: string;
}

export function BottomNavigation({
  currentPage,
  visible = true,
  badges = {},
  className,
}: BottomNavigationProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleNavigation = (href: string) => {
    router.push(href);
  };

  const isActive = (item: NavigationItem) => {
    if (currentPage) {
      return currentPage === item.id;
    }
    
    // Fallback to pathname matching
    return item.matchPaths?.some(path => pathname.startsWith(path)) || pathname === item.href;
  };

  if (!visible) return null;

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      exit={{ y: 100 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'bg-white/80 backdrop-blur-md',
        'border-t border-slate-200',
        'safe-area-inset-bottom', // Handle device safe areas
        className
      )}
    >
      <div className="flex items-center justify-around h-16 px-4">
        {navigationItems.map((item) => {
          const active = isActive(item);
          const badge = badges[item.id] || item.badge;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.href)}
              className={cn(
                'relative flex flex-col items-center justify-center',
                'min-w-0 flex-1 py-2 px-1',
                'transition-colors duration-200',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                'rounded-lg'
              )}
              aria-label={item.label}
            >
              {/* Icon with background */}
              <div className={cn(
                'relative flex items-center justify-center',
                'w-8 h-8 rounded-lg transition-all duration-200',
                active 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              )}>
                <Icon className="w-5 h-5" />
                
                {/* Badge */}
                {badge && badge > 0 && (
                  <Badge
                    variant="error"
                    size="sm"
                    rounded
                    className="absolute -top-1 -right-1 min-w-[18px] h-4.5 text-xs"
                  >
                    {badge > 99 ? '99+' : badge}
                  </Badge>
                )}
              </div>

              {/* Label */}
              <span className={cn(
                'text-xs font-medium mt-1 leading-tight',
                'max-w-full truncate',
                active ? 'text-blue-600' : 'text-slate-500'
              )}>
                {item.label}
              </span>

              {/* Active indicator */}
              {active && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute bottom-0 left-1/2 w-1 h-1 bg-blue-600 rounded-full"
                  style={{ x: '-50%' }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </motion.nav>
  );
}

// Hook to update navigation badges (for future use)
export function useNavigationBadges() {
  // This would connect to global state to show badges for:
  // - Pending analyses
  // - New reports available
  // - Validation errors
  // etc.
  
  return {
    analysis: 0, // Number of pending analyses
    reports: 0,  // Number of new reports
    history: 0,  // Number of recent items
    settings: 0, // Number of notifications/updates
  };
}

// Custom navigation for specific contexts
export function AnalysisNavigation({
  currentStep,
  totalSteps,
  onStepClick,
  className,
}: {
  currentStep: number;
  totalSteps: number;
  onStepClick?: (step: number) => void;
  className?: string;
}) {
  const steps = ['Upload', 'Validate', 'Results'];

  return (
    <nav className={cn(
      'flex items-center justify-center space-x-4 py-4',
      'bg-white/80 backdrop-blur-md border-t border-slate-200',
      className
    )}>
      {steps.slice(0, totalSteps).map((label, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isCompleted = stepNumber < currentStep;

        return (
          <button
            key={stepNumber}
            onClick={() => onStepClick?.(stepNumber)}
            disabled={!onStepClick}
            className={cn(
              'flex items-center space-x-2 px-3 py-2 rounded-lg',
              'transition-all duration-200',
              isActive && 'bg-blue-100 text-blue-700',
              isCompleted && 'text-green-600',
              !isActive && !isCompleted && 'text-slate-500',
              onStepClick && 'hover:bg-slate-100 cursor-pointer',
              !onStepClick && 'cursor-default'
            )}
          >
            <div className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold',
              isActive && 'bg-blue-600 text-white',
              isCompleted && 'bg-green-600 text-white',
              !isActive && !isCompleted && 'bg-slate-300 text-slate-600'
            )}>
              {stepNumber}
            </div>
            <span className="text-sm font-medium">
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}