'use client';

import { useEffect, useState } from 'react';
import '@/styles/toast-legacy.css';

export type ToastType = 'success' | 'error' | 'warn' | 'info';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

let toastListener: ((message: ToastMessage) => void) | null = null;

export function showToast(message: string, type: ToastType = 'success') {
  if (toastListener) {
    toastListener({
      id: Math.random().toString(36),
      message,
      type
    });
  }
}

export function ToastLegacy() {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    toastListener = (message: ToastMessage) => {
      setToast(message);
      setShow(true);

      setTimeout(() => {
        setShow(false);
        setTimeout(() => setToast(null), 300);
      }, 3000);
    };

    return () => {
      toastListener = null;
    };
  }, []);

  if (!toast) return null;

  return (
    <output
      aria-live="polite"
      className={`toast ${toast.type} ${show ? 'show' : ''}`}
      id="toast"
    >
      {toast.message}
    </output>
  );
}