'use client';

import { useState } from 'react';
import {
  X,
  MapPin,
  Phone,
  Mail,
  FileText,
  Plus,
  Pencil,
  Trash2,
  DollarSign,
  Calendar,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
import { Customer, Quote, QuoteStatus } from '@/lib/types';
import { SERVICE_CONFIG, QUOTE_STATUS_CONFIG, ALL_QUOTE_STATUSES } from '@/lib/constants';
import ServiceBadge from './ServiceBadge';
import clsx from 'clsx';

interface CustomerDetailProps {
  customer: Customer;
  quotes: Quote[];
  onClose: () => void;
  onAddQuote: () => void;
  onUpdateQuote: (quote: Quote) => void;
  onDeleteQuote: (quoteId: string) => void;
  onEditCustomer: (customer: Customer) => void;
  onDeleteCustomer: (customerId: string) => void;
}

function QuoteCard({
  quote,
  onUpdateStatus,
  onDelete,
}: {
  quote: Quote;
  onUpdateStatus: (q: Quote, status: QuoteStatus) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const statusConfig = QUOTE_STATUS_CONFIG[quote.status];

  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(quote.amount);

  const formattedDate = new Date(quote.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="border border-brand-border rounded-xl overflow-hidden bg-brand-darker">
      {/* Quote header */}
      <div
        className="flex items-start gap-3 p-3 cursor-pointer hover:bg-brand-card/40 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <span className="text-brand-text text-sm font-semibold leading-tight">
              {quote.title}
            </span>
            <span className="text-brand-gold font-bold text-sm shrink-0">
              {formattedAmount}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {/* Status badge */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowStatusMenu(!showStatusMenu);
                }}
                className={clsx(
                  'flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border transition-colors',
                  statusConfig.tailwindText,
                  statusConfig.tailwindBg,
                  statusConfig.tailwindBorder,
                  'hover:opacity-80',
                )}
              >
                {statusConfig.label}
                <ChevronDown className="w-3 h-3" />
              </button>

              {showStatusMenu && (
                <div className="absolute top-full left-0 mt-1 z-50 bg-brand-card border border-brand-border rounded-lg shadow-panel overflow-hidden min-w-[130px]">
                  {ALL_QUOTE_STATUSES.map((s) => {
                    const sc = QUOTE_STATUS_CONFIG[s];
                    return (
                      <button
                        key={s}
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateStatus(quote, s);
                          setShowStatusMenu(false);
                        }}
                        className={clsx(
                          'w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-brand-cardHover transition-colors',
                          sc.tailwindText,
                          quote.status === s ? 'font-bold' : '',
                        )}
                      >
                        {sc.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <span className="text-brand-muted text-xs">{formattedDate}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-1">
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-brand-muted" />
          ) : (
            <ChevronDown className="w-4 h-4 text-brand-muted" />
          )}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-brand-border bg-brand-card/30">
          {quote.description && (
            <p className="text-brand-muted text-xs leading-relaxed mt-2">
              {quote.description}
            </p>
          )}

          {quote.validUntil && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-brand-muted">
              <Calendar className="w-3 h-3" />
              <span>
                Valid until{' '}
                {new Date(quote.validUntil).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 mt-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(quote.id);
              }}
              className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1 rounded hover:bg-red-900/20"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomerDetail({
  customer,
  quotes,
  onClose,
  onAddQuote,
  onUpdateQuote,
  onDeleteQuote,
  onEditCustomer,
  onDeleteCustomer,
}: CustomerDetailProps) {
  const config = SERVICE_CONFIG[customer.service];
  const customerQuotes = quotes.filter((q) => q.customerId === customer.id);

  const totalRevenue = customerQuotes
    .filter((q) => q.status === 'approved' || q.status === 'completed')
    .reduce((sum, q) => sum + q.amount, 0);

  const pendingRevenue = customerQuotes
    .filter((q) => q.status === 'sent' || q.status === 'draft')
    .reduce((sum, q) => sum + q.amount, 0);

  const handleUpdateQuoteStatus = (quote: Quote, status: QuoteStatus) => {
    onUpdateQuote({
      ...quote,
      status,
      updatedAt: new Date().toISOString(),
    });
  };

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${customer.address}, ${customer.city}, ${customer.state} ${customer.zip}`,
  )}`;

  return (
    <div className="flex flex-col h-full w-80 bg-brand-dark border-l border-brand-border shrink-0">
      {/* Header */}
      <div
        className="px-4 pt-4 pb-3 border-b border-brand-border"
        style={{ borderTopColor: config.color, borderTopWidth: '3px' }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h2 className="text-brand-text font-bold text-base leading-tight truncate">
              {customer.name}
            </h2>
            <div className="mt-1.5">
              <ServiceBadge service={customer.service} showDot />
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-brand-muted hover:text-brand-text hover:bg-brand-card transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Revenue summary */}
        <div className="flex gap-3 mt-3">
          <div className="flex-1 bg-brand-card rounded-lg px-3 py-2">
            <div className="text-brand-muted text-xs font-medium">Contracted</div>
            <div className="text-brand-gold font-bold text-sm mt-0.5">
              ${totalRevenue.toLocaleString()}
            </div>
          </div>
          {pendingRevenue > 0 && (
            <div className="flex-1 bg-brand-card rounded-lg px-3 py-2">
              <div className="text-brand-muted text-xs font-medium">Pending</div>
              <div className="text-blue-400 font-bold text-sm mt-0.5">
                ${pendingRevenue.toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* Contact info */}
        <div className="px-4 py-3 border-b border-brand-border">
          <h3 className="text-brand-muted text-xs font-semibold uppercase tracking-wider mb-2">
            Contact
          </h3>
          <div className="space-y-2">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2 text-xs text-brand-muted hover:text-brand-light transition-colors group"
            >
              <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-brand-primary group-hover:text-brand-light" />
              <span>
                {customer.address}
                <br />
                {customer.city}, {customer.state} {customer.zip}
              </span>
              <ExternalLink className="w-3 h-3 mt-0.5 opacity-0 group-hover:opacity-100 shrink-0" />
            </a>

            <a
              href={`tel:${customer.phone}`}
              className="flex items-center gap-2 text-xs text-brand-muted hover:text-brand-light transition-colors"
            >
              <Phone className="w-3.5 h-3.5 shrink-0 text-brand-primary" />
              {customer.phone}
            </a>

            {customer.email && (
              <a
                href={`mailto:${customer.email}`}
                className="flex items-center gap-2 text-xs text-brand-muted hover:text-brand-light transition-colors truncate"
              >
                <Mail className="w-3.5 h-3.5 shrink-0 text-brand-primary" />
                <span className="truncate">{customer.email}</span>
              </a>
            )}
          </div>
        </div>

        {/* Notes */}
        {customer.notes && (
          <div className="px-4 py-3 border-b border-brand-border">
            <h3 className="text-brand-muted text-xs font-semibold uppercase tracking-wider mb-2">
              Notes
            </h3>
            <p className="text-brand-muted text-xs leading-relaxed bg-brand-card/50 rounded-lg p-2.5">
              {customer.notes}
            </p>
          </div>
        )}

        {/* Quotes section */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-brand-muted text-xs font-semibold uppercase tracking-wider">
              Quotes & Contracts ({customerQuotes.length})
            </h3>
            <button
              onClick={onAddQuote}
              className="flex items-center gap-1 text-xs font-medium text-brand-primary hover:text-brand-light transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New Quote
            </button>
          </div>

          {customerQuotes.length === 0 ? (
            <button
              onClick={onAddQuote}
              className="w-full border-2 border-dashed border-brand-border rounded-xl py-6 flex flex-col items-center gap-2 text-brand-muted hover:border-brand-primary hover:text-brand-primary transition-colors"
            >
              <FileText className="w-6 h-6" />
              <span className="text-xs font-medium">Add first quote</span>
            </button>
          ) : (
            <div className="space-y-2">
              {customerQuotes
                .sort(
                  (a, b) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime(),
                )
                .map((quote) => (
                  <QuoteCard
                    key={quote.id}
                    quote={quote}
                    onUpdateStatus={handleUpdateQuoteStatus}
                    onDelete={onDeleteQuote}
                  />
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div className="border-t border-brand-border px-4 py-3 flex gap-2">
        <button
          onClick={() => onDeleteCustomer(customer.id)}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors border border-red-900/40"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Remove
        </button>
        <button
          onClick={() => onEditCustomer(customer)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-brand-text bg-brand-primary hover:bg-brand-primaryHover rounded-lg transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
          Edit Customer
        </button>
      </div>
    </div>
  );
}
