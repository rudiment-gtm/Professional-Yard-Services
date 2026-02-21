'use client';

import { Search, Menu, RefreshCw, Users, LogOut } from 'lucide-react';
import { Customer, ServiceType } from '@/lib/types';
import { SERVICE_CONFIG, ALL_SERVICE_TYPES } from '@/lib/constants';

interface HeaderProps {
  customers: Customer[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onResetData: () => void;
}

export default function Header({
  customers,
  searchQuery,
  onSearchChange,
  onResetData,
}: HeaderProps) {
  const totalCustomers = customers.length;

  return (
    <header className="h-16 bg-brand-dark border-b border-brand-border flex items-center px-4 gap-4 shrink-0 z-10">
      {/* Logo */}
      <div className="flex items-center gap-3 min-w-[220px]">
        {/* Icon mark */}
        <div className="w-9 h-9 rounded-lg bg-brand-primary flex items-center justify-center shadow-glow shrink-0">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
            <path d="M17 8.5c0-2.76-2.24-5-5-5s-5 2.24-5 5c0 1.85 1.01 3.47 2.5 4.33V10.5h5v2.33c1.49-.86 2.5-2.48 2.5-4.33z" />
          </svg>
        </div>
        <div>
          <span className="text-brand-text font-bold text-sm leading-tight block">
            Professional Yard
          </span>
          <span className="text-brand-gold text-xs font-semibold leading-tight block tracking-wider uppercase">
            Services
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
          <input
            type="text"
            placeholder="Search customers by name or address..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-brand-darker border border-brand-border rounded-lg pl-9 pr-3 py-2 text-sm text-brand-text placeholder-brand-muted focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="hidden lg:flex items-center gap-4 ml-2">
        <div className="flex items-center gap-2 text-brand-muted text-sm">
          <Users className="w-4 h-4" />
          <span>
            <span className="text-brand-text font-semibold">{totalCustomers}</span>{' '}
            Customers
          </span>
        </div>
      </div>

      {/* Service Counts */}
      <div className="hidden xl:flex items-center gap-2">
        {ALL_SERVICE_TYPES.map((service) => {
          const count = customers.filter((c) => c.service === service).length;
          const config = SERVICE_CONFIG[service];
          return (
            <div
              key={service}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md"
              style={{ backgroundColor: `${config.color}15` }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: config.color }}
              />
              <span
                className="text-xs font-semibold"
                style={{ color: config.color }}
              >
                {count}
              </span>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={onResetData}
          title="Reset to demo data"
          className="p-2 rounded-lg text-brand-muted hover:text-brand-text hover:bg-brand-card transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
