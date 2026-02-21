'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Customer, ServiceType } from '@/lib/types';
import { SERVICE_CONFIG, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '@/lib/constants';

// Fix Leaflet icon paths in Next.js
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function createServiceMarker(service: ServiceType, isSelected: boolean) {
  const color = SERVICE_CONFIG[service].color;
  const size = isSelected ? 28 : 22;
  const ring = isSelected ? `box-shadow: 0 0 0 4px ${color}40, 0 3px 12px rgba(0,0,0,0.5);` : `box-shadow: 0 2px 8px rgba(0,0,0,0.45);`;
  const border = isSelected ? `border: 3px solid white;` : `border: 2.5px solid rgba(255,255,255,0.85);`;

  return L.divIcon({
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background-color: ${color};
        ${border}
        ${ring}
        transition: all 0.2s ease;
        cursor: pointer;
      "></div>
    `,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 4],
  });
}

function createPopupContent(customer: Customer): string {
  const color = SERVICE_CONFIG[customer.service].color;
  const label = SERVICE_CONFIG[customer.service].label;
  return `
    <div style="
      background: #0e2415;
      border: 1px solid #1e4228;
      border-radius: 10px;
      padding: 12px 14px;
      min-width: 200px;
      font-family: Inter, system-ui, sans-serif;
    ">
      <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
        <div style="
          width:10px; height:10px; border-radius:50%;
          background:${color}; flex-shrink:0;
          box-shadow: 0 0 0 2px ${color}30;
        "></div>
        <span style="color:#e4f0e8; font-weight:700; font-size:13px; line-height:1.2;">${customer.name}</span>
      </div>
      <div style="
        display:inline-block;
        background:${color}20; color:${color};
        border-radius:20px; padding:2px 8px;
        font-size:11px; font-weight:600;
        margin-bottom:8px; border:1px solid ${color}40;
      ">${label}</div>
      <div style="color:#8db898; font-size:12px; margin-bottom:3px;">📍 ${customer.address}, ${customer.city}, ${customer.state}</div>
      <div style="color:#8db898; font-size:12px;">📞 ${customer.phone}</div>
    </div>
  `;
}

// Component to handle map panning when selected customer changes
function MapController({
  selectedCustomer,
}: {
  selectedCustomer: Customer | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedCustomer) {
      map.flyTo([selectedCustomer.lat, selectedCustomer.lng], Math.max(map.getZoom(), 14), {
        duration: 0.8,
        easeLinearity: 0.25,
      });
    }
  }, [selectedCustomer, map]);

  return null;
}

interface MapViewProps {
  customers: Customer[];
  selectedCustomerId: string | null;
  activeFilter: ServiceType | 'all';
  onSelectCustomer: (id: string) => void;
}

export default function MapView({
  customers,
  selectedCustomerId,
  activeFilter,
  onSelectCustomer,
}: MapViewProps) {
  const markersRef = useRef<Record<string, L.Marker>>({});
  const mapRef = useRef<L.Map | null>(null);

  // Filter customers for display
  const visibleCustomers =
    activeFilter === 'all'
      ? customers
      : customers.filter((c) => c.service === activeFilter);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || null;

  return (
    <MapContainer
      center={DEFAULT_MAP_CENTER}
      zoom={DEFAULT_MAP_ZOOM}
      className="w-full h-full"
      ref={mapRef}
      zoomControl={false}
    >
      {/* Dark map tiles from CartoDB */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_matter/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={20}
      />

      {/* Custom zoom control position */}
      <ZoomControl />

      {/* Map controller for flying to selected customer */}
      <MapController selectedCustomer={selectedCustomer} />

      {/* Customer markers */}
      <MarkerLayer
        customers={visibleCustomers}
        selectedCustomerId={selectedCustomerId}
        onSelectCustomer={onSelectCustomer}
      />
    </MapContainer>
  );
}

// Zoom control in bottom-right
function ZoomControl() {
  const map = useMap();

  useEffect(() => {
    L.control
      .zoom({
        position: 'bottomright',
      })
      .addTo(map);
  }, [map]);

  return null;
}

// Marker layer using imperative Leaflet API for performance
function MarkerLayer({
  customers,
  selectedCustomerId,
  onSelectCustomer,
}: {
  customers: Customer[];
  selectedCustomerId: string | null;
  onSelectCustomer: (id: string) => void;
}) {
  const map = useMap();
  const markersRef = useRef<Record<string, L.Marker>>({});

  useEffect(() => {
    // Remove markers for customers no longer visible
    const visibleIds = new Set(customers.map((c) => c.id));
    Object.keys(markersRef.current).forEach((id) => {
      if (!visibleIds.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    // Add or update markers
    customers.forEach((customer) => {
      const isSelected = customer.id === selectedCustomerId;

      if (markersRef.current[customer.id]) {
        // Update existing marker icon
        markersRef.current[customer.id].setIcon(
          createServiceMarker(customer.service, isSelected),
        );
      } else {
        // Create new marker
        const marker = L.marker([customer.lat, customer.lng], {
          icon: createServiceMarker(customer.service, isSelected),
          zIndexOffset: isSelected ? 1000 : 0,
        });

        marker.bindPopup(createPopupContent(customer), {
          className: 'pys-popup',
          closeButton: false,
          maxWidth: 260,
          offset: [0, -8],
        });

        marker.on('click', () => {
          onSelectCustomer(customer.id);
          marker.openPopup();
        });

        marker.addTo(map);
        markersRef.current[customer.id] = marker;
      }
    });
  }, [customers, selectedCustomerId, map, onSelectCustomer]);

  // Update all marker icons when selection changes
  useEffect(() => {
    Object.entries(markersRef.current).forEach(([id, marker]) => {
      const customer = customers.find((c) => c.id === id);
      if (customer) {
        const isSelected = id === selectedCustomerId;
        marker.setIcon(createServiceMarker(customer.service, isSelected));
        marker.setZIndexOffset(isSelected ? 1000 : 0);
      }
    });
  }, [selectedCustomerId, customers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(markersRef.current).forEach((m) => m.remove());
      markersRef.current = {};
    };
  }, []);

  return null;
}
