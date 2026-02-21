'use client';

import { useState } from 'react';
import { X, DollarSign } from 'lucide-react';
import { Customer, Quote, QuoteStatus } from '@/lib/types';
import { QUOTE_STATUS_CONFIG, ALL_QUOTE_STATUSES } from '@/lib/constants';
import { v4 as uuidv4 } from 'uuid';
import clsx from 'clsx';

interface AddQuoteModalProps {
  customer: Customer;
  onSave: (quote: Quote) => void;
  onClose: () => void;
}

export default function AddQuoteModal({
  customer,
  onSave,
  onClose,
}: AddQuoteModalProps) {
  const [form, setForm] = useState({
    title: '',
    amount: '',
    status: 'draft' as QuoteStatus,
    description: '',
    validUntil: '',
  });

  const set = (key: keyof typeof form) => (val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.amount) return;

    const now = new Date().toISOString();
    const quote: Quote = {
      id: uuidv4(),
      customerId: customer.id,
      title: form.title,
      amount: parseFloat(form.amount.replace(/[^0-9.]/g, '')) || 0,
      status: form.status,
      description: form.description,
      validUntil: form.validUntil,
      createdAt: now,
      updatedAt: now,
    };

    onSave(quote);
  };

  // Format amount as currency input
  const handleAmountChange = (val: string) => {
    const clean = val.replace(/[^0-9.]/g, '');
    set('amount')(clean);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-brand-dark border border-brand-border rounded-2xl shadow-panel w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border">
          <div>
            <h2 className="text-brand-text font-bold text-base">New Quote</h2>
            <p className="text-brand-muted text-xs mt-0.5">
              For:{' '}
              <span className="text-brand-light font-medium">
                {customer.name}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-brand-muted hover:text-brand-text hover:bg-brand-card transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="px-5 py-4 space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-brand-muted mb-1">
                Quote Title<span className="text-red-400 ml-0.5">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => set('title')(e.target.value)}
                placeholder="e.g. Spring Mowing Package"
                className="w-full bg-brand-darker border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text placeholder-brand-muted/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors"
              />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-medium text-brand-muted mb-1">
                Amount ($)<span className="text-red-400 ml-0.5">*</span>
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
                <input
                  type="text"
                  value={form.amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-brand-darker border border-brand-border rounded-lg pl-8 pr-3 py-2 text-sm text-brand-text placeholder-brand-muted/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors"
                />
              </div>
              {form.amount && (
                <p className="text-xs text-brand-gold mt-1 font-medium">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                  }).format(parseFloat(form.amount) || 0)}
                </p>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-medium text-brand-muted mb-2">
                Status
              </label>
              <div className="flex flex-wrap gap-2">
                {ALL_QUOTE_STATUSES.map((status) => {
                  const config = QUOTE_STATUS_CONFIG[status];
                  const isActive = form.status === status;
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() =>
                        setForm((f) => ({ ...f, status }))
                      }
                      className={clsx(
                        'px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                        isActive
                          ? clsx(config.tailwindText, config.tailwindBg, config.tailwindBorder)
                          : 'text-brand-muted border-brand-border hover:border-brand-borderLight',
                      )}
                    >
                      {config.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-brand-muted mb-1">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => set('description')(e.target.value)}
                placeholder="Describe the scope of work, materials, visit frequency..."
                rows={3}
                className="w-full bg-brand-darker border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text placeholder-brand-muted/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors resize-none"
              />
            </div>

            {/* Valid Until */}
            <div>
              <label className="block text-xs font-medium text-brand-muted mb-1">
                Valid Until
              </label>
              <input
                type="date"
                value={form.validUntil}
                onChange={(e) => set('validUntil')(e.target.value)}
                className="w-full bg-brand-darker border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-brand-border flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-brand-muted border border-brand-border rounded-lg hover:text-brand-text hover:border-brand-borderLight transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!form.title || !form.amount}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-brand-primary hover:bg-brand-primaryHover disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shadow-glow"
            >
              Save Quote
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
