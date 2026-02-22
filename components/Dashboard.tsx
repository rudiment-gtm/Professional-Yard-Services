'use client';

import { useState, useEffect, useCallback } from 'react';
import { Customer, Quote, ServiceType } from '@/lib/types';
import {
  getCustomers,
  getQuotes,
  addCustomer,
  updateCustomer,
  deleteCustomer,
  addQuote,
  updateQuote,
  deleteQuote,
  saveCustomers,
  resetToSeedData,
} from '@/lib/storage';
import Header from './Header';
import FilterBar from './FilterBar';
import CustomerPanel from './CustomerPanel';
import CustomerMap from './CustomerMap';
import CustomerDetail from './CustomerDetail';
import AddCustomerModal from './AddCustomerModal';
import AddQuoteModal from './AddQuoteModal';
import CsvImportModal from './CsvImportModal';

export default function Dashboard() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<ServiceType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showAddQuote, setShowAddQuote] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setCustomers(getCustomers());
    setQuotes(getQuotes());
  }, []);

  // Derived: selected customer object
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || null;

  // ── Customer actions ────────────────────────────────────────────────────────

  const handleSaveCustomer = useCallback(
    (customer: Customer) => {
      if (customers.find((c) => c.id === customer.id)) {
        setCustomers(updateCustomer(customer));
      } else {
        setCustomers(addCustomer(customer));
        setSelectedCustomerId(customer.id);
      }
      setShowAddCustomer(false);
      setEditingCustomer(null);
    },
    [customers],
  );

  const handleDeleteCustomer = useCallback((id: string) => {
    if (!confirm('Remove this customer? Their quotes will remain saved.')) return;
    setCustomers(deleteCustomer(id));
    setSelectedCustomerId(null);
  }, []);

  const handleEditCustomer = useCallback((customer: Customer) => {
    setEditingCustomer(customer);
    setShowAddCustomer(true);
  }, []);

  // ── CSV import ──────────────────────────────────────────────────────────────

  const handleCsvImport = useCallback((imported: Customer[]) => {
    // Merge with existing list and persist; modal stays open to show Done step
    const current = getCustomers();
    const merged = [...current, ...imported];
    saveCustomers(merged);
    setCustomers(merged);
  }, []);

  // ── Quote actions ───────────────────────────────────────────────────────────

  const handleSaveQuote = useCallback((quote: Quote) => {
    setQuotes(addQuote(quote));
    setShowAddQuote(false);
  }, []);

  const handleUpdateQuote = useCallback((quote: Quote) => {
    setQuotes(updateQuote(quote));
  }, []);

  const handleDeleteQuote = useCallback((quoteId: string) => {
    if (!confirm('Delete this quote?')) return;
    setQuotes(deleteQuote(quoteId));
  }, []);

  // ── Reset ───────────────────────────────────────────────────────────────────

  const handleResetData = useCallback(() => {
    if (!confirm('Reset to demo data? This will erase all changes.')) return;
    resetToSeedData();
    setCustomers(getCustomers());
    setQuotes(getQuotes());
    setSelectedCustomerId(null);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-brand-darkest overflow-hidden">
      {/* Top header */}
      <Header
        customers={customers}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onResetData={handleResetData}
      />

      {/* Filter bar */}
      <FilterBar
        activeFilter={activeFilter}
        customers={customers}
        onFilterChange={setActiveFilter}
      />

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Customer list panel */}
        <CustomerPanel
          customers={customers}
          quotes={quotes}
          selectedCustomerId={selectedCustomerId}
          activeFilter={activeFilter}
          searchQuery={searchQuery}
          onSelectCustomer={setSelectedCustomerId}
          onAddCustomer={() => {
            setEditingCustomer(null);
            setShowAddCustomer(true);
          }}
          onImportCsv={() => setShowCsvImport(true)}
        />

        {/* Center: Map */}
        <div className="flex-1 relative overflow-hidden">
          <CustomerMap
            customers={customers}
            selectedCustomerId={selectedCustomerId}
            activeFilter={activeFilter}
            onSelectCustomer={setSelectedCustomerId}
          />

          {/* Map overlay: service legend */}
          <div className="absolute top-3 left-3 z-10 pointer-events-none">
            <div className="bg-brand-dark/90 backdrop-blur-sm border border-brand-border rounded-xl px-3 py-2 shadow-panel">
              <p className="text-brand-muted text-xs font-semibold uppercase tracking-wider mb-1.5">
                Service Map
              </p>
              <div className="space-y-1">
                {(
                  [
                    { service: 'mowing',      color: '#FDD835', label: 'Mowing' },
                    { service: 'fertilizer',  color: '#4CAF50', label: 'Fertilizer' },
                    { service: 'pestControl', color: '#FF6F00', label: 'Pest Control' },
                    { service: 'sprinklers',  color: '#1E88E5', label: 'Sprinklers' },
                    { service: 'fullService', color: '#9C27B0', label: 'Full Service' },
                  ] as const
                ).map((item) => (
                  <div key={item.service} className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-brand-muted text-xs">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Map overlay: selected customer chip */}
          {selectedCustomer && (
            <div className="absolute top-3 right-3 z-10 pointer-events-none">
              <div
                className="bg-brand-dark/90 backdrop-blur-sm border rounded-xl px-3 py-2 shadow-panel"
                style={{
                  borderColor: `${
                    {
                      mowing:      '#FDD835',
                      fertilizer:  '#4CAF50',
                      pestControl: '#FF6F00',
                      sprinklers:  '#1E88E5',
                      fullService: '#9C27B0',
                    }[selectedCustomer.service]
                  }50`,
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      backgroundColor: {
                        mowing:      '#FDD835',
                        fertilizer:  '#4CAF50',
                        pestControl: '#FF6F00',
                        sprinklers:  '#1E88E5',
                        fullService: '#9C27B0',
                      }[selectedCustomer.service],
                    }}
                  />
                  <span className="text-brand-text text-xs font-semibold">
                    {selectedCustomer.name}
                  </span>
                </div>
                <p className="text-brand-muted text-xs mt-0.5">
                  {selectedCustomer.address}, {selectedCustomer.city}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right: Customer detail panel */}
        {selectedCustomer && (
          <CustomerDetail
            customer={selectedCustomer}
            quotes={quotes}
            onClose={() => setSelectedCustomerId(null)}
            onAddQuote={() => setShowAddQuote(true)}
            onUpdateQuote={handleUpdateQuote}
            onDeleteQuote={handleDeleteQuote}
            onEditCustomer={handleEditCustomer}
            onDeleteCustomer={handleDeleteCustomer}
          />
        )}
      </div>

      {/* Modals */}
      {showAddCustomer && (
        <AddCustomerModal
          existingCustomer={editingCustomer}
          onSave={handleSaveCustomer}
          onClose={() => {
            setShowAddCustomer(false);
            setEditingCustomer(null);
          }}
        />
      )}

      {showAddQuote && selectedCustomer && (
        <AddQuoteModal
          customer={selectedCustomer}
          onSave={handleSaveQuote}
          onClose={() => setShowAddQuote(false)}
        />
      )}

      {showCsvImport && (
        <CsvImportModal
          onImport={handleCsvImport}
          onClose={() => setShowCsvImport(false)}
        />
      )}
    </div>
  );
}
