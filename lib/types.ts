export type ServiceType =
  | 'mowing'
  | 'fertilizer'
  | 'pestControl'
  | 'sprinklers'
  | 'fullService';

export type QuoteStatus =
  | 'draft'
  | 'sent'
  | 'approved'
  | 'declined'
  | 'completed';

export interface Customer {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  service: ServiceType;
  lat: number;
  lng: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Quote {
  id: string;
  customerId: string;
  title: string;
  amount: number;
  status: QuoteStatus;
  description: string;
  validUntil: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceConfig {
  label: string;
  color: string;
  tailwindBg: string;
  tailwindText: string;
  tailwindBorder: string;
  tailwindRing: string;
}

export interface QuoteStatusConfig {
  label: string;
  tailwindText: string;
  tailwindBg: string;
  tailwindBorder: string;
}
