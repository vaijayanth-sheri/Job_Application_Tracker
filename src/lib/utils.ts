import { type JobStatus, type Relevancy, type SkillPriority, type SkillStatus } from '@/types/database';

/** Merge class names, filtering falsy values */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

/** Format date to readable string */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Format date for input[type=date] */
export function toInputDate(dateStr: string | null | undefined): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  return new Date(dateStr).toISOString().split('T')[0];
}

/** Status color mapping */
export const STATUS_COLORS: Record<JobStatus, { bg: string; text: string; dot: string }> = {
  wishlist: { bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-400' },
  applied: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  interview: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  offer: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  rejected: { bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500' },
};

/** Relevancy color mapping */
export const RELEVANCY_COLORS: Record<Relevancy, { bg: string; text: string }> = {
  low: { bg: 'bg-gray-100', text: 'text-gray-600' },
  medium: { bg: 'bg-sky-100', text: 'text-sky-700' },
  high: { bg: 'bg-violet-100', text: 'text-violet-700' },
};

/** Skill priority colors */
export const PRIORITY_COLORS: Record<SkillPriority, { bg: string; text: string }> = {
  low: { bg: 'bg-gray-100', text: 'text-gray-600' },
  medium: { bg: 'bg-amber-100', text: 'text-amber-700' },
  high: { bg: 'bg-rose-100', text: 'text-rose-700' },
};

/** Skill status colors */
export const SKILL_STATUS_COLORS: Record<SkillStatus, { bg: string; text: string }> = {
  to_learn: { bg: 'bg-slate-100', text: 'text-slate-700' },
  in_progress: { bg: 'bg-blue-100', text: 'text-blue-700' },
  learned: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
};

/** Label formatting */
export function statusLabel(status: string): string {
  return status
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Stats card gradient mapping */
export const STAT_GRADIENTS: Record<string, string> = {
  total: 'from-brand-600 to-brand-800',
  wishlist: 'from-slate-600 to-slate-800',
  applied: 'from-blue-600 to-blue-800',
  interview: 'from-amber-600 to-amber-800',
  offer: 'from-emerald-600 to-emerald-800',
  rejected: 'from-rose-600 to-rose-800',
};
