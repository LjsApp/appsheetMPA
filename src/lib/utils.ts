import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency = 'IDR'): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr || dateStr === '-' || dateStr === 'undefined' || dateStr === 'null') return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
}

export function formatDeliveryTime(val: string | undefined | null): string {
  if (!val) return '';
  if (val.match(/^\d{4}-\d{2}-\d{2}T/)) {
    try {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
      }
    } catch(e) {}
  }
  return val;
}

export function generateId(prefix: string): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 100000).toString().padStart(6, '0');
  return `${prefix}-${year}-${rand}`;
}

export function getDriveImageUrl(url: string | undefined | null): string {
  if (!url) return '';
  // Convert /preview URL to direct image URL
  const match = url.match(/\/file\/d\/([^\/]+)/);
  if (match && match[1]) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`;
  }
  return url;
}
