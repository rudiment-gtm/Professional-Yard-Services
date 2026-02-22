'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Customer, ServiceType } from '@/lib/types';
import { SERVICE_CONFIG, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '@/lib/constants';

// ── Marker factory ────────────────────────────────────────────────────────────
// Uses divIcon so we control color without needing image assets.
// Selected markers get a pulsing ring (animated via .pys-pulse-ring in globals.css).

function createServiceMarker(service: ServiceType, isSelected: boolean): L.DivIcon {
  const color = SERVICE_CONFIG[service].color;
  const size  = isSelected ? 28 : 22;
  const border = isSelected
    ? `border: 3px solid white;`
    : `border: 2.5px solid rgba(255,255,255,0.85);`;
  const shadow = isSelected
    ? `box-shadow: 0 0 0 4px ${color}40, 0 3px 14px rgba(0,0,0,0.55);`
    : `box-shadow: 0 2px 8px rgba(0,0,0,0.45);`;

  // .pys-pulse-ring is defined in globals.css
  const pulse = isSelected
    ? `<div class="pys-pulse-ring" style="
          position:absolute; inset:-6px; border-radius:50%;
          background:${color}; pointer-events:none;
        "></div>`
    : '';

  return L.divIcon({
    html: `
      <div style="position:relative; width:${size}px; height:${size}px;">
        ${pulse}
        <div style="
          position:relative; z-index:1;
          width:${size}px; height:${size}px;
          border-radius:50%;
          background-color:${color};
          ${border}
          ${shadow}
          cursor:pointer;
        "></div>
      </div>`,
    className: '',
    iconSize:    [size, size],
    iconAnchor:  [size / 2, size / 2],
    popupAnchor: [0, -(size / 2) - 4],
  });
}

// ── Popup content ─────────────────────────────────────────────────────────────

function createPopupContent(customer: Customer): string {
  const color = SERVICE_CONFIG[customer.service].color;
  const label = SERVICE_CONFIG[customer.service].label;
  return `
    <div style="
      background:#0e2415; border:1px solid #1e4228; border-radius:10px;
      padding:12px 14px; min-width:210px; max-width:260px;
      font-family:Inter,system-ui,sans-serif; line-height:1.4;
    ">
      <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
        <div style="
          width:10px; height:10px; border-radius:50%; flex-shrink:0;
          background:${color}; box-shadow:0 0 0 2px ${color}30;
        "></div>
        <span style="color:#e4f0e8; font-weight:700; font-size:13px;">${customer.name}</span>
      </div>
      <div style="
        display:inline-block; margin-bottom:8px;
        background:${color}20; color:${color};
        border-radius:20px; padding:2px 9px;
        font-size:11px; font-weight:600; border:1px solid ${color}40;
      ">${label}</div>
      <div style="color:#8db898; font-size:12px; margin-bottom:3px;">
        \u{1F4CD} ${customer.address}, ${customer.city}, ${customer.state}
      </div>
      <div style="color:#8db898; font-size:12px;">\u{1F4DE} ${customer.phone}</div>
    </div>`;
}

// ── FitBoundsController ───────────────────────────────────────────────────────
// Fits the map to show all visible customers whenever the set of IDs changes
// (filter applied, customers added/removed). Does NOT re-fit on selection —
// flyTo in MapController handles that.

function FitBoundsController({ customers }: { customers: Customer[] }) {
  const map = useMap();
  const prevKeyRef = useRef<string>('');

  useEffect(() => {
    if (customers.length === 0) return;
    const key = customers.map((c) => c.id).sort().join(',');
    if (key === prevKeyRef.current) return;
    prevKeyRef.current = key;

    const bounds = L.latLngBounds(customers.map((c) => [c.lat, c.lng]));
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15, animate: true });
  }, [customers, map]);

  return null;
}

// ── MapController ─────────────────────────────────────────────────────────────

function MapController({ selectedCustomer }: { selectedCustomer: Customer | null }) {
  const map = useMap();

  useEffect(() => {
    if (!selectedCustomer) return;
    map.flyTo(
      [selectedCustomer.lat, selectedCustomer.lng],
      Math.max(map.getZoom(), 14),
      { duration: 0.8, easeLinearity: 0.25 },
    );
  }, [selectedCustomer, map]);

  return null;
}

// ── ZoomControl ───────────────────────────────────────────────────────────────
// Bottom-right placement, guarded by a ref so React StrictMode's double-invoke
// of effects does not add the control twice.

function ZoomControl() {
  const map = useMap();
  const addedRef = useRef(false);

  useEffect(() => {
    if (addedRef.current) return;
    addedRef.current = true;
    const ctrl = L.control.zoom({ position: 'bottomright' });
    ctrl.addTo(map);
    return () => {
      ctrl.remove();
      addedRef.current = false;
    };
  }, [map]);

  return null;
}

// ── MarkerLayer ───────────────────────────────────────────────────────────────
// Manages markers imperatively (outside React's render cycle) for performance.

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

  // Add / remove / refresh markers when visible customers change
  useEffect(() => {
    const visibleIds = new Set(customers.map((c) => c.id));

    for (const id of Object.keys(markersRef.current)) {
      if (!visibleIds.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    }

    for (const customer of customers) {
      const isSelected = customer.id === selectedCustomerId;

      if (markersRef.current[customer.id]) {
        markersRef.current[customer.id].setIcon(
          createServiceMarker(customer.service, isSelected),
        );
        markersRef.current[customer.id].setZIndexOffset(isSelected ? 1000 : 0);
      } else {
        const marker = L.marker([customer.lat, customer.lng], {
          icon: createServiceMarker(customer.service, isSelected),
          zIndexOffset: isSelected ? 1000 : 0,
        });

        marker.bindPopup(createPopupContent(customer), {
          className: 'pys-popup',
          closeButton: false,
          maxWidth: 280,
          offset: [0, -8],
        });

        marker.on('click', () => {
          onSelectCustomer(customer.id);
          marker.openPopup();
        });

        marker.addTo(map);
        markersRef.current[customer.id] = marker;
      }
    }
  }, [customers, selectedCustomerId, map, onSelectCustomer]);

  // Refresh icon styles when only the selection changes
  useEffect(() => {
    for (const [id, marker] of Object.entries(markersRef.current)) {
      const customer = customers.find((c) => c.id === id);
      if (!customer) continue;
      const isSelected = id === selectedCustomerId;
      marker.setIcon(createServiceMarker(customer.service, isSelected));
      marker.setZIndexOffset(isSelected ? 1000 : 0);
    }
  }, [selectedCustomerId, customers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      for (const m of Object.values(markersRef.current)) m.remove();
      markersRef.current = {};
    };
  }, []);

  return null;
}

// ── MapView (public export) ───────────────────────────────────────────────────

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
  const visibleCustomers =
    activeFilter === 'all'
      ? customers
      : customers.filter((c) => c.service === activeFilter);

  const selectedCustomer =
    customers.find((c) => c.id === selectedCustomerId) ?? null;

  return (
    <MapContainer
      center={DEFAULT_MAP_CENTER}
      zoom={DEFAULT_MAP_ZOOM}
      className="w-full h-full"
      zoomControl={false}
    >
      {/*
        CartoDB Dark Matter — a full tile-based street map (OpenStreetMap data)
        with a dark theme that matches the PYS dashboard. Fully zoomable and
        pannable; shows streets, neighborhoods, city labels, and landmarks.
        No API key required.
      */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_matter/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={20}
        minZoom={3}
      />

      <ZoomControl />
      <FitBoundsController customers={visibleCustomers} />
      <MapController selectedCustomer={selectedCustomer} />
      <MarkerLayer
        customers={visibleCustomers}
        selectedCustomerId={selectedCustomerId}
        onSelectCustomer={onSelectCustomer}
      />
    </MapContainer>
  );
}
