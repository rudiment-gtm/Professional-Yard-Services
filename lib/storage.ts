import { Customer, Quote } from './types';
import { SEED_CUSTOMERS, SEED_QUOTES } from './seedData';

const CUSTOMERS_KEY = 'pys_customers';
const QUOTES_KEY = 'pys_quotes';

function isClient(): boolean {
  return typeof window !== 'undefined';
}

// ─── Customers ───────────────────────────────────────────────────────────────

export function getCustomers(): Customer[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(CUSTOMERS_KEY);
    if (!raw) {
      // Seed initial data
      saveCustomers(SEED_CUSTOMERS);
      return SEED_CUSTOMERS;
    }
    return JSON.parse(raw) as Customer[];
  } catch {
    return SEED_CUSTOMERS;
  }
}

export function saveCustomers(customers: Customer[]): void {
  if (!isClient()) return;
  localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
}

export function addCustomer(customer: Customer): Customer[] {
  const customers = getCustomers();
  const updated = [...customers, customer];
  saveCustomers(updated);
  return updated;
}

export function updateCustomer(updated: Customer): Customer[] {
  const customers = getCustomers();
  const list = customers.map((c) => (c.id === updated.id ? updated : c));
  saveCustomers(list);
  return list;
}

export function deleteCustomer(id: string): Customer[] {
  const customers = getCustomers();
  const list = customers.filter((c) => c.id !== id);
  saveCustomers(list);
  return list;
}

// ─── Quotes ──────────────────────────────────────────────────────────────────

export function getQuotes(): Quote[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(QUOTES_KEY);
    if (!raw) {
      saveQuotes(SEED_QUOTES);
      return SEED_QUOTES;
    }
    return JSON.parse(raw) as Quote[];
  } catch {
    return SEED_QUOTES;
  }
}

export function saveQuotes(quotes: Quote[]): void {
  if (!isClient()) return;
  localStorage.setItem(QUOTES_KEY, JSON.stringify(quotes));
}

export function addQuote(quote: Quote): Quote[] {
  const quotes = getQuotes();
  const updated = [...quotes, quote];
  saveQuotes(updated);
  return updated;
}

export function updateQuote(updated: Quote): Quote[] {
  const quotes = getQuotes();
  const list = quotes.map((q) => (q.id === updated.id ? updated : q));
  saveQuotes(list);
  return list;
}

export function deleteQuote(id: string): Quote[] {
  const quotes = getQuotes();
  const list = quotes.filter((q) => q.id !== id);
  saveQuotes(list);
  return list;
}

export function getQuotesForCustomer(customerId: string): Quote[] {
  return getQuotes().filter((q) => q.customerId === customerId);
}

export function resetToSeedData(): void {
  if (!isClient()) return;
  saveCustomers(SEED_CUSTOMERS);
  saveQuotes(SEED_QUOTES);
}
