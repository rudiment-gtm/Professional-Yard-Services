'use client';

import { MapPin, Phone, ChevronRight } from 'lucide-react';
import { Customer, Quote } from '@/lib/types';
import { SERVICE_CONFIG } from '@/lib/constants';
import clsx from 'clsx';

interface CustomerCardProps {
  customer: Customer;
  quotes: Quote[];
  isSelected: boolean;
  onClick: () => void;
}

export default function CustomerCard({
  customer,
  quotes,
  isSelected,
  onClick,
}: CustomerCardProps) {
  const config = SERVICE_CONFIG[customer.service];
  const customerQuotes = quotes.filter((q) => q.customerId === customer.id);
  const activeQuote = customerQuotes.find(
    (q) => q.status === 'approved' || q.status === 'sent',
  );
  const totalValue = customerQuotes
    .filter((q) => q.status === 'approved' || q.status === 'completed')
    .reduce((sum, q) => sum + q.amount, 0);

  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full text-left px-3 py-3 border-b border-brand-border transition-all group',
        isSelected
          ? 'bg-brand-card border-l-2'
          : 'hover:bg-brand-card/50 border-l-2 border-l-transparent',
      )}
      style={
        isSelected
          ? { borderLeftColor: config.color }
          : undefined
      }
    >
      <div className="flex items-start gap-3">
        {/* Color dot / service indicator */}
        <div className="shrink-0 mt-0.5">
          <div
            className="w-3 h-3 rounded-full shadow-sm"
            style={{
              backgroundColor: config.color,
              boxShadow: `0 0 0 2px ${config.color}40`,
            }}
          />
        </div>

        <div className="flex-1 min-w-0">
          {/* Name + service */}
          <div className="flex items-start justify-between gap-2">
            <span
              className={clsx(
                'text-sm font-semibold truncate leading-tight',
                isSelected ? 'text-brand-text' : 'text-brand-text/90',
              )}
            >
              {customer.name}
            </span>
            <ChevronRight
              className={clsx(
                'w-3.5 h-3.5 shrink-0 mt-0.5 transition-transform',
                isSelected
                  ? 'text-brand-text rotate-90'
                  : 'text-brand-muted group-hover:translate-x-0.5',
              )}
            />
          </div>

          {/* Service badge */}
          <span
            className="inline-block mt-1 text-xs font-medium rounded-full px-2 py-0.5"
            style={{
              color: config.color,
              backgroundColor: `${config.color}15`,
            }}
          >
            {config.label}
          </span>

          {/* Address */}
          <div className="flex items-center gap-1 mt-1.5 text-brand-muted text-xs">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">
              {customer.address}, {customer.city}
            </span>
          </div>

          {/* Phone + Quote value */}
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-1 text-brand-muted text-xs">
              <Phone className="w-3 h-3 shrink-0" />
              <span>{customer.phone}</span>
            </div>
            {totalValue > 0 && (
              <span className="text-xs font-semibold text-brand-gold">
                ${totalValue.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
