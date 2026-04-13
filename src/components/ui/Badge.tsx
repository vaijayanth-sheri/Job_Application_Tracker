'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: string;
  bg?: string;
  text?: string;
  dot?: string;
  className?: string;
}

export default function Badge({ children, bg, text, dot, className }: BadgeProps) {
  return (
    <span className={cn('badge', bg, text, className)}>
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', dot)} />}
      {children}
    </span>
  );
}
