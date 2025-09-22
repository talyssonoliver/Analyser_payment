/**
 * Export the useToast hook from the toast component
 */

export { useToast, type Toast } from '@/components/ui/toast';

// Re-export toast function for convenience
export const toast = (toastData: Omit<import('@/components/ui/toast').Toast, 'id'>) => {
  if (typeof window === 'undefined') return;
  
  // Dispatch a custom event that the ToastProvider will handle
  const event = new CustomEvent('app-toast', {
    detail: toastData
  });
  window.dispatchEvent(event);
};