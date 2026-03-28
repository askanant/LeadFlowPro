import { type LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
  bg?: string;
  subtitle?: string;
}

export function StatCard({ title, value, icon: Icon, color = 'text-blue-600', bg = 'bg-blue-50', subtitle }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bg} ${color}`}>
          <Icon size={18} />
        </div>
      </div>
      <p className="text-3xl font-bold tracking-tight text-gray-900">{value}</p>
      {subtitle && <p className="text-xs text-gray-600 mt-1.5">{subtitle}</p>}
    </div>
  );
}
