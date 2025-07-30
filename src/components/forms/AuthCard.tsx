import React from 'react';

interface AuthCardProps {
  logo?: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  social?: React.ReactNode;
  footer?: React.ReactNode;
}

export default function AuthCard({ logo, title, subtitle, children, social, footer }: AuthCardProps) {
  return (
    <div className="w-full max-w-md rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xl px-8 py-10 flex flex-col items-center">
      {logo && <div className="mb-6">{logo}</div>}
      <h1 className="text-2xl font-bold mb-1 text-neutral-900 dark:text-neutral-100 text-center">{title}</h1>
      {subtitle && <p className="mb-6 text-neutral-500 dark:text-neutral-400 text-center text-base">{subtitle}</p>}
      <div className="w-full flex flex-col gap-3 mb-4">{children}</div>
      {social && (
        <>
          <div className="flex items-center w-full my-4">
            <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
            <span className="mx-3 text-xs text-neutral-400 dark:text-neutral-500">Or authorize with</span>
            <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
          </div>
          <div className="w-full flex gap-3 mb-2">{social}</div>
        </>
      )}
      {footer && <div className="w-full mt-4 text-sm text-neutral-500 dark:text-neutral-400 text-center">{footer}</div>}
    </div>
  );
} 