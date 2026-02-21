'use client';

import { ServiceType } from '@/lib/types';
import { SERVICE_CONFIG, ALL_SERVICE_TYPES } from '@/lib/constants';
import { Customer } from '@/lib/types';
import clsx from 'clsx';

interface FilterBarProps {
  activeFilter: ServiceType | 'all';
  customers: Customer[];
  onFilterChange: (filter: ServiceType | 'all') => void;
}

export default function FilterBar({
  activeFilter,
  customers,
  onFilterChange,
}: FilterBarProps) {
  const allCount = customers.length;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-brand-darker border-b border-brand-border overflow-x-auto shrink-0 scrollbar-none">
      {/* All */}
      <button
        onClick={() => onFilterChange('all')}
        className={clsx(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap border',
          activeFilter === 'all'
            ? 'bg-brand-primary text-white border-brand-primaryHover shadow-glow'
            : 'text-brand-muted border-brand-border hover:text-brand-text hover:border-brand-borderLight',
        )}
      >
        <span
          className={clsx(
            'w-1.5 h-1.5 rounded-full',
            activeFilter === 'all' ? 'bg-white' : 'bg-brand-muted',
          )}
        />
        All Customers
        <span
          className={clsx(
            'ml-0.5 px-1.5 py-0.5 rounded-md text-xs font-bold',
            activeFilter === 'all'
              ? 'bg-white/20 text-white'
              : 'bg-brand-border text-brand-muted',
          )}
        >
          {allCount}
        </span>
      </button>

      <div className="w-px h-5 bg-brand-border shrink-0" />

      {/* Service filters */}
      {ALL_SERVICE_TYPES.map((service) => {
        const config = SERVICE_CONFIG[service];
        const count = customers.filter((c) => c.service === service).length;
        const isActive = activeFilter === service;

        return (
          <button
            key={service}
            onClick={() => onFilterChange(service)}
            className={clsx(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap border',
              isActive ? 'shadow-sm' : 'hover:border-brand-borderLight',
            )}
            style={
              isActive
                ? {
                    backgroundColor: `${config.color}20`,
                    color: config.color,
                    borderColor: `${config.color}60`,
                  }
                : {
                    color: '#8db898',
                    borderColor: '#1e4228',
                  }
            }
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: config.color }}
            />
            {config.label}
            <span
              className="ml-0.5 px-1.5 py-0.5 rounded-md text-xs font-bold"
              style={
                isActive
                  ? {
                      backgroundColor: `${config.color}25`,
                      color: config.color,
                    }
                  : {
                      backgroundColor: '#1e4228',
                      color: '#8db898',
                    }
              }
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
