// Account data schema for the ProYard sales map.
// Source of truth for account/CRM data is HubSpot; this table is the
// map-optimized read/write layer the app actually queries against.

export type AccountStatus = 'lead' | 'active' | 'canceled' | 'new_customer';

export type ServiceType = 'mowing' | 'fertilizer' | 'pestControl' | 'sprinklers';

export const ALL_SERVICE_TYPES: ServiceType[] = ['mowing', 'fertilizer', 'pestControl', 'sprinklers'];

export function isFullService(services: ServiceType[]): boolean {
  return ALL_SERVICE_TYPES.every((s) => services.includes(s));
}

export interface Account {
  id: string;

  // Identity
  accountName: string;          // QB parent Customer name / HubSpot Company name
  qbCustomerName?: string;      // original QuickBooks base name, for traceability/re-import
  accountNotes?: string;        // QB "Company" column, repurposed as free-text notes

  // Services (multi-select). "Full Service" is derived via isFullService(), not stored.
  services: ServiceType[];

  // Status
  accountStatus: AccountStatus;
  cancelDate?: string | null;   // no source data on import; set manually going forward

  // Two distinct addresses — QB's "Bill to" vs "Ship to" (the job site the rep actually drives to)
  billingAddress?: string;
  billingCity?: string;
  billingState?: string;
  billingZip?: string;
  routeAddress?: string;
  routeCity?: string;
  routeState?: string;
  routeZip?: string;

  // Map coordinates — geocoded from the route (job-site) address
  latitude: number;
  longitude: number;

  // Contact — full QB contact shape preserved; many accounts only have a
  // subset filled in (company + email/phone, no named person), so nothing
  // here should be assumed present.
  salutation?: string;          // QB "Mr./Ms./..."
  firstName?: string;
  middleInitial?: string;
  lastName?: string;
  primaryContact?: string;      // QB's free-text "Primary Contact" field
  secondaryContact?: string;
  jobTitle?: string;
  mainPhone?: string;
  altPhone?: string;
  fax?: string;
  mainEmail?: string;
  linkedinUrl?: string;
  website?: string;

  // Activity
  visitCount: number;
  lastVisitDate?: string;
  nextFollowUpDate?: string;
  lastContactedAt?: string | null;
  lastContactedSource?: string | null;

  // HubSpot sync (mirrors the account_id-on-CRM-object pattern)
  hubspotCompanyId?: string;
  hubspotContactId?: string;

  // Raw preservation — every original QB job row that rolled up into this
  // account, untouched. The "don't lose any data" guarantee: anything not
  // modeled explicitly above is still here to query or promote to a real
  // column later.
  qbRawRows?: Record<string, string>[];

  // Transient preview flag set when this Account came from an Around Me POI
  // and has NOT been persisted to the database yet. Used by AccountDrawer to
  // defer account creation until the rep logs an event.
  isAroundMePreview?: boolean;
  aroundMeSourceId?: string;
}

export interface RouteStopRecord {
  accountId: string;
  order: number;
  estimatedArrival?: string;
  completed: boolean;
}

export interface Route {
  id: string;
  name: string;
  stops: RouteStopRecord[];
  totalDistance?: number;
  estimatedDuration?: number;
  createdAt: string;
}

// Status display configuration
export const statusConfig: Record<AccountStatus, {
  label: string;
  color: string;
  bgClass: string;
  description: string;
}> = {
  lead: {
    label: 'Lead',
    color: 'hsl(195, 85%, 45%)',
    bgClass: 'status-badge-lead',
    description: 'New prospects, not yet a customer',
  },
  active: {
    label: 'Active',
    color: 'hsl(152, 75%, 40%)',
    bgClass: 'status-badge-active',
    description: 'Current customer with at least one active service',
  },
  canceled: {
    label: 'Canceled',
    color: 'hsl(0, 84%, 55%)',
    bgClass: 'status-badge-canceled',
    description: 'Former customer — win-back candidate',
  },
  new_customer: {
    label: 'New Customer',
    color: 'hsl(38, 92%, 50%)',
    bgClass: 'status-badge-new-customer',
    description: 'Closed this year',
  },
};

export const serviceConfig: Record<ServiceType, { label: string; color: string }> = {
  mowing: { label: 'Mowing', color: '#FDD835' },
  fertilizer: { label: 'Fertilizer', color: '#4CAF50' },
  pestControl: { label: 'Pest Control', color: '#FF6F00' },
  sprinklers: { label: 'Sprinklers', color: '#1E88E5' },
};

export const FULL_SERVICE_CONFIG = { label: 'Full Service', color: '#1976D2' };

// Prospect categories for "Around Me" — property/business types worth
// prospecting for yard service (replaces Smart Route's B2B "Industry" concept).
export type ProspectCategory =
  | 'hoa'
  | 'apartment'
  | 'commercial'
  | 'retail'
  | 'restaurant'
  | 'office'
  | 'newConstruction'
  | 'other';

export const prospectCategoryLabels: Record<ProspectCategory, string> = {
  hoa: 'HOA / Community',
  apartment: 'Apartment Complex',
  commercial: 'Commercial Property',
  retail: 'Retail Plaza',
  restaurant: 'Restaurant',
  office: 'Office Park',
  newConstruction: 'New Construction',
  other: 'Other',
};
