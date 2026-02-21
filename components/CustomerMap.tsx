'use client';

import dynamic from 'next/dynamic';
import { Customer, ServiceType } from '@/lib/types';

// Dynamically import MapView with SSR disabled — Leaflet requires the DOM
const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-brand-darker">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-brand-muted text-sm">Loading map...</p>
      </div>
    </div>
  ),
});

interface CustomerMapProps {
  customers: Customer[];
  selectedCustomerId: string | null;
  activeFilter: ServiceType | 'all';
  onSelectCustomer: (id: string) => void;
}

export default function CustomerMap(props: CustomerMapProps) {
  return <MapView {...props} />;
}
