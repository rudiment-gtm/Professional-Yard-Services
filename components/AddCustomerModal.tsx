'use client';

import { useState, useEffect } from 'react';
import { X, MapPin, Loader2 } from 'lucide-react';
import { Customer, ServiceType } from '@/lib/types';
import { SERVICE_CONFIG, ALL_SERVICE_TYPES, DEFAULT_MAP_CENTER } from '@/lib/constants';
import { v4 as uuidv4 } from 'uuid';
import clsx from 'clsx';

interface AddCustomerModalProps {
  existingCustomer?: Customer | null;
  onSave: (customer: Customer) => void;
  onClose: () => void;
}

const EMPTY_FORM = {
  name: '',
  address: '',
  city: '',
  state: 'TX',
  zip: '',
  phone: '',
  email: '',
  service: 'mowing' as ServiceType,
  notes: '',
};

async function geocodeAddress(
  address: string,
  city: string,
  state: string,
  zip: string,
): Promise<{ lat: number; lng: number } | null> {
  const query = `${address}, ${city}, ${state} ${zip}`;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
      { headers: { 'Accept-Language': 'en' } },
    );
    const data = await res.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch {
    // Geocoding failed silently
  }
  return null;
}

function InputField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-brand-muted mb-1">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-brand-darker border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text placeholder-brand-muted/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors"
      />
    </div>
  );
}

export default function AddCustomerModal({
  existingCustomer,
  onSave,
  onClose,
}: AddCustomerModalProps) {
  const isEditing = !!existingCustomer;

  const [form, setForm] = useState(
    existingCustomer
      ? {
          name: existingCustomer.name,
          address: existingCustomer.address,
          city: existingCustomer.city,
          state: existingCustomer.state,
          zip: existingCustomer.zip,
          phone: existingCustomer.phone,
          email: existingCustomer.email,
          service: existingCustomer.service,
          notes: existingCustomer.notes,
        }
      : EMPTY_FORM,
  );

  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (key: keyof typeof form) => (val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.address || !form.city) return;

    setSaving(true);
    setGeocodeError('');

    // Attempt geocoding
    setGeocoding(true);
    const coords = await geocodeAddress(
      form.address,
      form.city,
      form.state,
      form.zip,
    );
    setGeocoding(false);

    let lat = DEFAULT_MAP_CENTER[0];
    let lng = DEFAULT_MAP_CENTER[1];

    if (coords) {
      lat = coords.lat;
      lng = coords.lng;
    } else if (existingCustomer) {
      lat = existingCustomer.lat;
      lng = existingCustomer.lng;
    } else {
      setGeocodeError(
        'Could not find address on map — customer added with default location. You can update the address later.',
      );
    }

    const now = new Date().toISOString();
    const customer: Customer = {
      id: existingCustomer?.id || uuidv4(),
      name: form.name,
      address: form.address,
      city: form.city,
      state: form.state,
      zip: form.zip,
      phone: form.phone,
      email: form.email,
      service: form.service,
      notes: form.notes,
      lat,
      lng,
      createdAt: existingCustomer?.createdAt || now,
      updatedAt: now,
    };

    onSave(customer);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-brand-dark border border-brand-border rounded-2xl shadow-panel w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border">
          <div>
            <h2 className="text-brand-text font-bold text-base">
              {isEditing ? 'Edit Customer' : 'Add New Customer'}
            </h2>
            <p className="text-brand-muted text-xs mt-0.5">
              {isEditing
                ? 'Update customer information'
                : 'Fill in the customer details below'}
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-5 py-4 space-y-4">
            {/* Name */}
            <InputField
              label="Customer Name"
              value={form.name}
              onChange={set('name')}
              placeholder="e.g. Smith Residence"
              required
            />

            {/* Service Type */}
            <div>
              <label className="block text-xs font-medium text-brand-muted mb-2">
                Service Type<span className="text-red-400 ml-0.5">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {ALL_SERVICE_TYPES.map((service) => {
                  const config = SERVICE_CONFIG[service];
                  const isActive = form.service === service;
                  return (
                    <button
                      key={service}
                      type="button"
                      onClick={() =>
                        setForm((f) => ({ ...f, service }))
                      }
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all text-left"
                      style={
                        isActive
                          ? {
                              backgroundColor: `${config.color}20`,
                              borderColor: `${config.color}70`,
                              color: config.color,
                            }
                          : {
                              backgroundColor: 'transparent',
                              borderColor: '#1e4228',
                              color: '#8db898',
                            }
                      }
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: config.color }}
                      />
                      {config.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Address */}
            <InputField
              label="Street Address"
              value={form.address}
              onChange={set('address')}
              placeholder="e.g. 123 Oak Street"
              required
            />

            {/* City / State / Zip */}
            <div className="grid grid-cols-5 gap-2">
              <div className="col-span-3">
                <InputField
                  label="City"
                  value={form.city}
                  onChange={set('city')}
                  placeholder="Austin"
                  required
                />
              </div>
              <div className="col-span-1">
                <InputField
                  label="State"
                  value={form.state}
                  onChange={set('state')}
                  placeholder="TX"
                />
              </div>
              <div className="col-span-1">
                <InputField
                  label="ZIP"
                  value={form.zip}
                  onChange={set('zip')}
                  placeholder="78701"
                />
              </div>
            </div>

            {/* Phone / Email */}
            <div className="grid grid-cols-2 gap-3">
              <InputField
                label="Phone"
                value={form.phone}
                onChange={set('phone')}
                type="tel"
                placeholder="(512) 555-0100"
              />
              <InputField
                label="Email"
                value={form.email}
                onChange={set('email')}
                type="email"
                placeholder="name@email.com"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-brand-muted mb-1">
                Notes
              </label>
              <textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Gate codes, special instructions, preferences..."
                rows={3}
                className="w-full bg-brand-darker border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text placeholder-brand-muted/50 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors resize-none"
              />
            </div>

            {/* Geocode info */}
            <div className="flex items-start gap-2 text-xs text-brand-muted bg-brand-card/50 rounded-lg px-3 py-2">
              <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-brand-primary" />
              <span>
                The address will be automatically located on the map using
                OpenStreetMap geocoding.
              </span>
            </div>

            {geocodeError && (
              <div className="text-xs text-amber-400 bg-amber-900/20 border border-amber-700/30 rounded-lg px-3 py-2">
                {geocodeError}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 px-5 py-4 border-t border-brand-border bg-brand-dark flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-brand-muted border border-brand-border rounded-lg hover:text-brand-text hover:border-brand-borderLight transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !form.name || !form.address || !form.city}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-brand-primary hover:bg-brand-primaryHover disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shadow-glow"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {geocoding ? 'Locating...' : 'Saving...'}
                </>
              ) : (
                <>{isEditing ? 'Save Changes' : 'Add Customer'}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
