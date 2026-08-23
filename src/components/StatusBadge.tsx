import { cn } from '@/lib/utils';

interface BadgeProps {
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
}

const STATUS_MAP: Record<string, BadgeProps['variant']> = {
  // Inquiry
  Draft: 'default',
  Sourcing: 'info',
  Pricing: 'purple',
  Quoted: 'warning',
  Won: 'success',
  Lost: 'danger',
  Cancelled: 'danger',

  // Sourcing
  'Not Sent': 'default',
  Sent: 'info',
  'Waiting Response': 'warning',
  Responded: 'success',
  'No Response': 'danger',
  Rejected: 'danger',
  Expired: 'danger',

  // Quotation
  'Waiting Approval': 'warning',
  Approved: 'success',
  Viewed: 'info',
  Negotiation: 'purple',
  Revised: 'warning',

  // Vendor Quotation Received
  'Vendor Quotation Received': 'info',

  // Active/Inactive
  Active: 'success',
  Inactive: 'default',
};

const VARIANT_CLASSES: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
};

export default function StatusBadge({ label, variant }: BadgeProps) {
  const v = variant ?? STATUS_MAP[label] ?? 'default';
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', VARIANT_CLASSES[v])}>
      {label}
    </span>
  );
}
