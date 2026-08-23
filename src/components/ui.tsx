import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'gray';
  icon?: ReactNode;
}

const COLOR_MAP = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', value: 'text-blue-700' },
  green: { bg: 'bg-green-50', text: 'text-green-600', value: 'text-green-700' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', value: 'text-amber-700' },
  red: { bg: 'bg-red-50', text: 'text-red-600', value: 'text-red-700' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600', value: 'text-purple-700' },
  gray: { bg: 'bg-gray-50', text: 'text-gray-600', value: 'text-gray-700' },
};

export function StatCard({ label, value, sub, color = 'blue', icon }: StatCardProps) {
  const c = COLOR_MAP[color];
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className={cn('text-3xl font-bold mt-1', c.value)}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        {icon && (
          <div className={cn('p-2.5 rounded-lg', c.bg)}>
            <span className={cn('w-6 h-6', c.text)}>{icon}</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}

export function FormField({ label, required, error, children }: FormFieldProps) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function Input({ error, className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        'w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 transition-all',
        error
          ? 'border-red-300 focus:ring-red-200'
          : 'border-gray-200 focus:ring-blue-100 focus:border-blue-400',
        className,
      )}
      {...props}
    />
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[];
  error?: boolean;
}

export function Select({ options, error, className, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        'w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 transition-all bg-white',
        error
          ? 'border-red-300 focus:ring-red-200'
          : 'border-gray-200 focus:ring-blue-100 focus:border-blue-400',
        className,
      )}
      {...props}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const BTN_VARIANTS = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm',
  secondary: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-sm',
  danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm',
  ghost: 'bg-transparent hover:bg-gray-100 text-gray-600',
};
const BTN_SIZES = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-2.5 text-base',
};

export function Button({ variant = 'primary', size = 'md', loading, children, className, disabled, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-1',
        BTN_VARIANTS[variant],
        BTN_SIZES[size],
        (disabled || loading) && 'opacity-60 cursor-not-allowed',
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      )}
      {children}
    </button>
  );
}
