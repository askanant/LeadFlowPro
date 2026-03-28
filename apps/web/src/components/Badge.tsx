import { cn } from '../lib/cn';

const variants: Record<string, string> = {
  active:        'bg-green-100/80 text-green-800',
  paused:        'bg-amber-100/80 text-amber-800',
  draft:         'bg-gray-100 text-gray-600',
  completed:     'bg-blue-100/80 text-blue-800',
  new:           'bg-indigo-100/80 text-indigo-700',
  contacted:     'bg-violet-100/80 text-violet-700',
  qualified:     'bg-teal-100/80 text-teal-700',
  disqualified:  'bg-red-100/80 text-red-700',
  converted:     'bg-green-100/80 text-green-800',
  meta:          'bg-blue-100/80 text-blue-700',
  google:        'bg-red-100/80 text-red-700',
  linkedin:      'bg-sky-100/80 text-sky-700',
  inbound:       'bg-green-100/80 text-green-700',
  outbound:      'bg-gray-100 text-gray-600',
  completed_call:'bg-blue-100/80 text-blue-700',
  failed:        'bg-red-100/80 text-red-700',
  'no-answer':   'bg-gray-100 text-gray-500',
  busy:          'bg-amber-100/80 text-amber-700',
  delivered:     'bg-green-100/80 text-green-700',
  pending:       'bg-amber-100/80 text-amber-700',
  inactive:      'bg-gray-100 text-gray-600',
};

const variantStyles: Record<string, string> = {
  default: '',
  secondary: 'bg-orange-100/80 text-orange-800',
  outline: 'bg-white border border-gray-300 text-gray-700',
};

export function Badge({ label, variant = 'default', className }: { label: string; variant?: 'default' | 'secondary' | 'outline'; className?: string }) {
  const key = label?.toLowerCase().replace(/\s+/g, '_');
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide',
        variantStyles[variant],
        variants[key] ?? 'bg-gray-100 text-gray-600',
        className
      )}
    >
      {label}
    </span>
  );
}
