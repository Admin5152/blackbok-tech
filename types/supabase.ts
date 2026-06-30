/**
 * Supabase row shapes (hand-maintained; run `supabase gen types` after migrations
 * and merge changes here). CHECK constraints on repair_requests:
 *   pricing_mode ∈ ('apple_matrix', 'diagnostic_quote')
 *   apple_matrix ⇒ device_type = 'smartphone'
 */
import type { DeviceType, PricingMode } from '../lib/repairDeviceTypes';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      repair_requests: {
        Row: {
          id: string;
          display_id: string | null;
          user_id: string | null;
          customer_id: string | null;
          user_name: string | null;
          device_brand: string | null;
          device_model: string | null;
          device_type: DeviceType | null;
          pricing_mode: PricingMode | null;
          issue_type: string | null;
          issue_description: string | null;
          ai_diagnosis: string | null;
          image_urls: string[] | null;
          accessories: string[] | null;
          urgency: string | null;
          fulfillment_method: string | null;
          preferred_date: string | null;
          preferred_time: string | null;
          contact_name: string | null;
          contact_phone: string | null;
          contact_email: string | null;
          repair_approval: string | null;
          data_backup: string | null;
          diagnostic_fee: string | null;
          agrees_to_terms: boolean | null;
          client_signature: string | null;
          estimated_cost: number | null;
          final_cost: number | null;
          technician_notes: string | null;
          admin_note: string | null;
          assigned_technician: string | null;
          status: string;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          display_id?: string | null;
          user_id?: string | null;
          customer_id?: string | null;
          user_name?: string | null;
          device_brand?: string | null;
          device_model?: string | null;
          device_type?: DeviceType | null;
          pricing_mode?: PricingMode;
          issue_type?: string | null;
          issue_description?: string | null;
          ai_diagnosis?: string | null;
          image_urls?: string[] | null;
          accessories?: string[] | null;
          urgency?: string | null;
          fulfillment_method?: string | null;
          preferred_date?: string | null;
          preferred_time?: string | null;
          contact_name?: string | null;
          contact_phone?: string | null;
          contact_email?: string | null;
          repair_approval?: string | null;
          data_backup?: string | null;
          diagnostic_fee?: string | null;
          agrees_to_terms?: boolean | null;
          client_signature?: string | null;
          estimated_cost?: number | null;
          final_cost?: number | null;
          technician_notes?: string | null;
          admin_note?: string | null;
          assigned_technician?: string | null;
          status?: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['repair_requests']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type RepairRequestRow = Database['public']['Tables']['repair_requests']['Row'];
export type RepairRequestInsert = Database['public']['Tables']['repair_requests']['Insert'];
