'use client';

import { Plus, ChevronDown } from 'lucide-react';
import { Customer, Quote, ServiceType } from '@/lib/types';
import { SERVICE_CONFIG } from '@/lib/constants';
import CustomerCard from './CustomerCard';

interface CustomerPanelProps {
  customers: Customer[];
  quotes: Quote[];
  selectedCustomerId: string | null;
  activeFilter: ServiceType | 'all';
  searchQuery: string;
  onSelectCustomer: (id: string) => void;
  onAddCustomer: () => void;
}

export default function CustomerPanel({
  customers,
  quotes,
  selectedCustomerId,
  activeFilter,
  searchQuery,
  onSelectCustomer,
  onAddCustomer,
}: CustomerPanelProps) {
  // Filter customers
  const filtered = customers.filter((c) => {
    const matchesFilter = activeFilter === 'all' || c.service === activeFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.address.toLowerCase().includes(q) ||
      c.city.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.email.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  // Group by service type
  const groupedByService =
    activeFilter === 'all'
      ? (['mowing', 'fertilizer', 'pestControl', 'sprinklers', 'fullService'] as ServiceType[])
          .map((service) => ({
            service,
            items: filtered.filter((c) => c.service === service),
          }))
          .filter((g) => g.items.length > 0)
      : [{ service: activeFilter as ServiceType, items: filtered }];

  return (
    <div className="flex flex-col h-full bg-brand-dark border-r border-brand-border w-72 shrink-0">
      {/* Panel header */}
      <div className="px-3 py-3 border-b border-brand-border flex items-center justify-between">
        <div>
          <h2 className="text-brand-text font-semibold text-sm">Customers</h2>
          <p className="text-brand-muted text-xs mt-0.5">
            {filtered.length} of {customers.length} shown
          </p>
        </div>
        <button
          onClick={onAddCustomer}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-brand-primary hover:bg-brand-primaryHover text-white text-xs font-medium rounded-lg transition-colors shadow-glow"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </button>
      </div>

      {/* Customer list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-brand-muted">
            <p className="text-sm">No customers found</p>
            {searchQuery && (
              <p className="text-xs mt-1">Try adjusting your search</p>
            )}
          </div>
        ) : (
          <>
            {groupedByService.map(({ service, items }) => (
              <div key={service}>
                {/* Group header */}
                {activeFilter === 'all' && (
                  <div
                    className="sticky top-0 z-10 px-3 py-1.5 flex items-center gap-2 text-xs font-semibold border-b border-brand-border"
                    style={{
                      backgroundColor: `${SERVICE_CONFIG[service].color}10`,
                      color: SERVICE_CONFIG[service].color,
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: SERVICE_CONFIG[service].color }}
                    />
                    {SERVICE_CONFIG[service].label}
                    <span className="ml-auto opacity-70">{items.length}</span>
                  </div>
                )}

                {/* Customer cards */}
                {items.map((customer) => (
                  <CustomerCard
                    key={customer.id}
                    customer={customer}
                    quotes={quotes}
                    isSelected={selectedCustomerId === customer.id}
                    onClick={() => onSelectCustomer(customer.id)}
                  />
                ))}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Legend */}
      <div className="border-t border-brand-border px-3 py-2 bg-brand-darker">
        <p className="text-xs text-brand-muted font-medium mb-1.5 uppercase tracking-wider">
          Service Legend
        </p>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
          {(
            [
              'mowing',
              'fertilizer',
              'pestControl',
              'sprinklers',
              'fullService',
            ] as ServiceType[]
          ).map((s) => (
            <div key={s} className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: SERVICE_CONFIG[s].color }}
              />
              <span className="text-xs text-brand-muted">
                {SERVICE_CONFIG[s].label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
