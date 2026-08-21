import React from 'react';
import { cn } from '../../utils/cn';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'status' | 'priority' | 'category' | 'default';
  value?: string;
  className?: string;
}

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  assigned: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  in_progress: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
  resolved: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  closed: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
  reopened: 'bg-red-50 text-red-700 ring-1 ring-red-200',
};

const PRIORITY_STYLES: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  normal: 'bg-blue-50 text-blue-700',
  urgent: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
  emergency: 'bg-red-50 text-red-700 ring-1 ring-red-200',
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
  reopened: 'Reopened',
};

export function Badge({ children, variant = 'default', value, className }: BadgeProps) {
  let style = 'bg-gray-100 text-gray-700';
  let display = children;

  if (variant === 'status' && value) {
    style = STATUS_STYLES[value] || style;
    display = STATUS_LABELS[value] || value;
  } else if (variant === 'priority' && value) {
    style = PRIORITY_STYLES[value] || style;
    display = value.charAt(0).toUpperCase() + value.slice(1);
  }

  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', style, className)}>
      {display}
    </span>
  );
}
