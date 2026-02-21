import { ServiceType, QuoteStatus, ServiceConfig, QuoteStatusConfig } from './types';

export const SERVICE_CONFIG: Record<ServiceType, ServiceConfig> = {
  mowing: {
    label: 'Mowing',
    color: '#FDD835',
    tailwindBg: 'bg-yellow-400',
    tailwindText: 'text-yellow-400',
    tailwindBorder: 'border-yellow-400',
    tailwindRing: 'ring-yellow-400',
  },
  fertilizer: {
    label: 'Fertilizer',
    color: '#4CAF50',
    tailwindBg: 'bg-green-500',
    tailwindText: 'text-green-400',
    tailwindBorder: 'border-green-500',
    tailwindRing: 'ring-green-500',
  },
  pestControl: {
    label: 'Pest Control',
    color: '#FF6F00',
    tailwindBg: 'bg-orange-500',
    tailwindText: 'text-orange-400',
    tailwindBorder: 'border-orange-500',
    tailwindRing: 'ring-orange-500',
  },
  sprinklers: {
    label: 'Sprinklers',
    color: '#1E88E5',
    tailwindBg: 'bg-blue-500',
    tailwindText: 'text-blue-400',
    tailwindBorder: 'border-blue-500',
    tailwindRing: 'ring-blue-500',
  },
  fullService: {
    label: 'Full Service',
    color: '#9C27B0',
    tailwindBg: 'bg-purple-600',
    tailwindText: 'text-purple-400',
    tailwindBorder: 'border-purple-600',
    tailwindRing: 'ring-purple-600',
  },
};

export const QUOTE_STATUS_CONFIG: Record<QuoteStatus, QuoteStatusConfig> = {
  draft: {
    label: 'Draft',
    tailwindText: 'text-gray-400',
    tailwindBg: 'bg-gray-700',
    tailwindBorder: 'border-gray-600',
  },
  sent: {
    label: 'Sent',
    tailwindText: 'text-blue-400',
    tailwindBg: 'bg-blue-900/40',
    tailwindBorder: 'border-blue-700',
  },
  approved: {
    label: 'Approved',
    tailwindText: 'text-green-400',
    tailwindBg: 'bg-green-900/40',
    tailwindBorder: 'border-green-700',
  },
  declined: {
    label: 'Declined',
    tailwindText: 'text-red-400',
    tailwindBg: 'bg-red-900/40',
    tailwindBorder: 'border-red-700',
  },
  completed: {
    label: 'Completed',
    tailwindText: 'text-emerald-400',
    tailwindBg: 'bg-emerald-900/40',
    tailwindBorder: 'border-emerald-700',
  },
};

export const ALL_SERVICE_TYPES: ServiceType[] = [
  'mowing',
  'fertilizer',
  'pestControl',
  'sprinklers',
  'fullService',
];

export const ALL_QUOTE_STATUSES: QuoteStatus[] = [
  'draft',
  'sent',
  'approved',
  'declined',
  'completed',
];

// Default map center (Austin, TX)
export const DEFAULT_MAP_CENTER: [number, number] = [30.267153, -97.743057];
export const DEFAULT_MAP_ZOOM = 12;
