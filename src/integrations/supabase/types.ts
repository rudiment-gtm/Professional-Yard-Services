// This file mirrors supabase/migrations/20260727000000_init.sql.
// Regenerate with `supabase gen types typescript` once the project is live —
// this hand-written version exists so the app type-checks before that.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  // Required by @supabase/postgrest-js's generic client typing (recent
  // versions read this to resolve schema generics — omitting it collapses
  // every insert/update payload type to `never`).
  __InternalSupabase: {
    PostgrestVersion: "12";
  };
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          display_name: string | null;
          avatar_url: string | null;
          advanced_filters: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { user_id: string };
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
        Relationships: [];
      };
      accounts: {
        Row: {
          id: string;
          account_name: string;
          qb_customer_name: string | null;
          account_notes: string | null;
          services: string[];
          account_status: string;
          cancel_date: string | null;
          billing_address: string | null;
          billing_city: string | null;
          billing_state: string | null;
          billing_zip: string | null;
          route_address: string | null;
          route_city: string | null;
          route_state: string | null;
          route_zip: string | null;
          latitude: number | null;
          longitude: number | null;
          salutation: string | null;
          first_name: string | null;
          middle_initial: string | null;
          last_name: string | null;
          primary_contact: string | null;
          secondary_contact: string | null;
          job_title: string | null;
          main_phone: string | null;
          alt_phone: string | null;
          fax: string | null;
          main_email: string | null;
          linkedin_url: string | null;
          website: string | null;
          visit_count: number;
          last_visit_date: string | null;
          next_follow_up_date: string | null;
          last_contacted_at: string | null;
          last_contacted_source: string | null;
          hubspot_company_id: string | null;
          hubspot_contact_id: string | null;
          qb_raw_rows: Json;
          created_by_user_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['accounts']['Row']> & { account_name: string };
        Update: Partial<Database['public']['Tables']['accounts']['Row']>;
        Relationships: [];
      };
      account_notes: {
        Row: {
          id: string;
          account_id: string;
          note_text: string;
          author_name: string | null;
          author_user_id: string | null;
          hubspot_synced: boolean;
          hubspot_id: string | null;
          hubspot_synced_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['account_notes']['Row']> & {
          account_id: string;
          note_text: string;
        };
        Update: Partial<Database['public']['Tables']['account_notes']['Row']>;
        Relationships: [{
          foreignKeyName: "account_notes_account_id_fkey";
          columns: ["account_id"];
          isOneToOne: false;
          referencedRelation: "accounts";
          referencedColumns: ["id"];
        }];
      };
      prospect_contacts: {
        Row: {
          id: string;
          account_id: string;
          first_name: string;
          last_name: string;
          title: string | null;
          linkedin_url: string | null;
          email: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['prospect_contacts']['Row']> & {
          account_id: string;
          first_name: string;
          last_name: string;
        };
        Update: Partial<Database['public']['Tables']['prospect_contacts']['Row']>;
        Relationships: [{
          foreignKeyName: "prospect_contacts_account_id_fkey";
          columns: ["account_id"];
          isOneToOne: false;
          referencedRelation: "accounts";
          referencedColumns: ["id"];
        }];
      };
      account_events: {
        Row: {
          id: string;
          account_id: string;
          event_type: string;
          event_medium: string | null;
          notes: string | null;
          start_at: string;
          end_at: string;
          assigned_to: string;
          author_user_id: string | null;
          author_name: string | null;
          hubspot_id: string | null;
          hubspot_synced_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['account_events']['Row']> & {
          account_id: string;
          start_at: string;
          end_at: string;
          assigned_to: string;
        };
        Update: Partial<Database['public']['Tables']['account_events']['Row']>;
        Relationships: [{
          foreignKeyName: "account_events_account_id_fkey";
          columns: ["account_id"];
          isOneToOne: false;
          referencedRelation: "accounts";
          referencedColumns: ["id"];
        }];
      };
      quotes: {
        Row: {
          id: string;
          account_id: string;
          title: string;
          amount: number;
          status: string;
          description: string | null;
          valid_until: string | null;
          hubspot_quote_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['quotes']['Row']> & {
          account_id: string;
          title: string;
          amount: number;
        };
        Update: Partial<Database['public']['Tables']['quotes']['Row']>;
        Relationships: [{
          foreignKeyName: "quotes_account_id_fkey";
          columns: ["account_id"];
          isOneToOne: false;
          referencedRelation: "accounts";
          referencedColumns: ["id"];
        }];
      };
      saved_routes: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          stops: Json;
          origin: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['saved_routes']['Row']> & {
          user_id: string;
          name: string;
          stops: Json;
        };
        Update: Partial<Database['public']['Tables']['saved_routes']['Row']>;
        Relationships: [];
      };
      shared_routes: {
        Row: {
          id: string;
          code: string;
          created_by: string;
          stops: Json;
          origin: Json | null;
          expires_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['shared_routes']['Row']> & {
          created_by: string;
          stops: Json;
        };
        Update: Partial<Database['public']['Tables']['shared_routes']['Row']>;
        Relationships: [];
      };
      hubspot_sync_log: {
        Row: {
          id: string;
          account_id: string | null;
          action: string;
          status: string;
          hubspot_id: string | null;
          matched_owner_id: string | null;
          error_message: string | null;
          request_payload: Json | null;
          response_payload: Json | null;
          invoked_by_email: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['hubspot_sync_log']['Row']> & {
          action: string;
          status: string;
        };
        Update: Partial<Database['public']['Tables']['hubspot_sync_log']['Row']>;
        Relationships: [{
          foreignKeyName: "hubspot_sync_log_account_id_fkey";
          columns: ["account_id"];
          isOneToOne: false;
          referencedRelation: "accounts";
          referencedColumns: ["id"];
        }];
      };
      clay_sync_log: {
        Row: {
          id: string;
          request_id: string | null;
          rows_received: number | null;
          rows_after_dedupe: number | null;
          dropped_duplicates: number | null;
          would_be_updates: number | null;
          inserted: number | null;
          updated: number | null;
          geocoded: number | null;
          validation_errors: Json | null;
          update_errors: Json | null;
          http_status: number | null;
          source_ip: string | null;
          user_agent: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['clay_sync_log']['Row']>;
        Update: Partial<Database['public']['Tables']['clay_sync_log']['Row']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
