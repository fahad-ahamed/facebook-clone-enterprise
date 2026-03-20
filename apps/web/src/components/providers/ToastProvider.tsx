'use client';

import { Toaster, toast as hotToast } from 'react-hot-toast';
import { type ReactNode } from 'react';

interface ToastProviderProps {
  children: ReactNode;
}

// Custom toast wrapper with Facebook-like styling
export const toast = {
  success: (message: string, duration: number = 4000) => {
    hotToast.success(message, {
      duration,
      style: {
        background: '#10b981',
        color: '#fff',
        fontWeight: '500',
        borderRadius: '8px',
        padding: '12px 16px',
      },
      iconTheme: {
        primary: '#fff',
        secondary: '#10b981',
      },
    });
  },
  
  error: (message: string, duration: number = 5000) => {
    hotToast.error(message, {
      duration,
      style: {
        background: '#ef4444',
        color: '#fff',
        fontWeight: '500',
        borderRadius: '8px',
        padding: '12px 16px',
      },
      iconTheme: {
        primary: '#fff',
        secondary: '#ef4444',
      },
    });
  },
  
  info: (message: string, duration: number = 4000) => {
    hotToast(message, {
      duration,
      style: {
        background: '#3b82f6',
        color: '#fff',
        fontWeight: '500',
        borderRadius: '8px',
        padding: '12px 16px',
      },
    });
  },
  
  promise: <T,>(
    promise: Promise<T>,
    {
      loading,
      success,
      error,
    }: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((err: Error) => string);
    }
  ) => {
    return hotToast.promise(promise, {
      loading,
      success,
      error,
    }, {
      style: {
        borderRadius: '8px',
        padding: '12px 16px',
        fontWeight: '500',
      },
    });
  },
  
  custom: (jsx: React.ReactNode, duration: number = 4000) => {
    return hotToast.custom(jsx, { duration });
  },
  
  dismiss: (toastId?: string) => {
    hotToast.dismiss(toastId);
  },
};

export function ToastProvider({ children }: ToastProviderProps) {
  return (
    <>
      {children}
      <Toaster
        position="bottom-center"
        gutter={12}
        containerStyle={{
          bottom: 24,
        }}
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1f2937',
            color: '#fff',
            fontWeight: '500',
            borderRadius: '8px',
            padding: '12px 16px',
            maxWidth: '400px',
          },
        }}
      />
    </>
  );
}

export { hotToast };
