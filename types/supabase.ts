/**
 * Supabase row shapes for the trade-in v7 schema.
 *
 * Hand-maintained from blackbox-schema-after-migration.md — run
 * `npx supabase gen types typescript --project-id crkmhpfgrvcnmqgiekjb`
 * after migrations and merge changes here.
 *
 * Used by lib/tradeApi.ts and lib/tradePricingStore.ts — no `any` on DB rows.
 */
import type { DeviceType, PricingMode } from '../lib/repairDeviceTypes';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/** trade_devices.device_type / trade_questions.device_type */
export type TradeDeviceType = 'iphone' | 'ipad';

/** product_variants.sim_type / trade_base_values.sim_variant */
export type SimVariant = 'ps' | 'es' | 'single' | 'wifi' | 'cell_ps' | 'cell_es';

/** trade_answers.outcome vocabulary */
export type TradeAnswerOutcome =
  | 'none'
  | 'deduct_full'
  | 'deduct_half'
  | 'deduct_quarter'
  | 'aesthetic_a1'
  | 'aesthetic_a2'
  | 'battery_replaced_policy'
  | 'camera_replaced_policy'
  | 'hard_stop';

/** One line in compute_trade_estimate deductions array */
export interface TradeEstimateDeductionLine {
  component: string;
  amount: number;
}

/** Return shape of compute_trade_estimate RPC */
export interface TradeEstimateResult {
  base_value: number;
  deductions: TradeEstimateDeductionLine[];
  total_deductions: number;
  estimate: number;
  needs_verification: boolean;
  hard_stop: boolean;
  threshold: number;
  threshold_source: 'model' | 'global' | string;
  below_threshold: boolean;
  threshold_message: string | null;
}

/** One answer entry sent to compute_trade_estimate */
export interface TradeAnswerInput {
  answer_id: string;
  /** Optional free-text when answer requires_description */
  description?: string;
}

/** Answer change log entry stored in answers_snapshot */
export interface TradeAnswerChangeLog {
  question_code: string;
  old_answer_id: string | null;
  new_answer_id: string;
  timestamp: string;
}

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
        Insert: Partial<Database['public']['Tables']['repair_requests']['Row']>;
        Update: Partial<Database['public']['Tables']['repair_requests']['Row']>;
        Relationships: [];
      };

      trade_devices: {
        Row: {
          model: string;
          device_type: TradeDeviceType;
          product_line: string | null;
          series: string | null;
          generation: string | null;
          screen_size: string | null;
          biometric: 'face_id' | 'touch_id';
          image_url: string | null;
          is_active: boolean;
          sort_order: number;
          threshold_value: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['trade_devices']['Row']> & {
          model: string;
          device_type: TradeDeviceType;
        };
        Update: Partial<Database['public']['Tables']['trade_devices']['Row']>;
        Relationships: [];
      };

      trade_config: {
        Row: {
          key: string;
          value: string;
          description: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['trade_config']['Row']> & {
          key: string;
          value: string;
        };
        Update: Partial<Database['public']['Tables']['trade_config']['Row']>;
        Relationships: [];
      };

      trade_questions: {
        Row: {
          id: string;
          device_type: TradeDeviceType;
          component: string | null;
          code: string;
          question_text: string;
          help_text: string | null;
          is_gate: boolean;
          display_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['trade_questions']['Row']> & {
          device_type: TradeDeviceType;
          code: string;
          question_text: string;
        };
        Update: Partial<Database['public']['Tables']['trade_questions']['Row']>;
        Relationships: [];
      };

      trade_answers: {
        Row: {
          id: string;
          question_id: string;
          answer_text: string;
          outcome: TradeAnswerOutcome;
          flag_verify: boolean;
          requires_description: boolean;
          display_order: number;
        };
        Insert: Partial<Database['public']['Tables']['trade_answers']['Row']> & {
          question_id: string;
          answer_text: string;
          outcome: TradeAnswerOutcome;
        };
        Update: Partial<Database['public']['Tables']['trade_answers']['Row']>;
        Relationships: [];
      };

      trade_base_values: {
        Row: {
          id: string;
          model: string;
          storage: string;
          sim_variant: SimVariant;
          base_value: number;
          created_at: string;
          updated_at: string;
          is_active: boolean;
        };
        Insert: Partial<Database['public']['Tables']['trade_base_values']['Row']> & {
          model: string;
          storage: string;
          sim_variant: SimVariant;
          base_value: number;
        };
        Update: Partial<Database['public']['Tables']['trade_base_values']['Row']>;
        Relationships: [];
      };

      trade_fault_deductions: {
        Row: {
          id: string;
          model: string;
          fault_code: string;
          fault_label: string;
          deduction: number;
          created_at: string;
          updated_at: string;
          is_active: boolean;
        };
        Insert: Partial<Database['public']['Tables']['trade_fault_deductions']['Row']> & {
          model: string;
          fault_code: string;
          fault_label: string;
          deduction: number;
        };
        Update: Partial<Database['public']['Tables']['trade_fault_deductions']['Row']>;
        Relationships: [];
      };

      trade_aesthetic_overrides: {
        Row: {
          model: string;
          grade: 'a1' | 'a2';
          amount: number;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['trade_aesthetic_overrides']['Row']> & {
          model: string;
          grade: 'a1' | 'a2';
          amount: number;
        };
        Update: Partial<Database['public']['Tables']['trade_aesthetic_overrides']['Row']>;
        Relationships: [];
      };

      audit_log: {
        Row: {
          id: number;
          created_at: string;
          actor_id: string | null;
          action: string;
          entity: string;
          entity_id: string;
          old_data: Json | null;
          new_data: Json | null;
        };
        Insert: Partial<Database['public']['Tables']['audit_log']['Row']> & {
          action: string;
          entity: string;
          entity_id: string;
        };
        Update: never;
        Relationships: [];
      };

      trade_in_requests: {
        Row: {
          id: string;
          display_id: string | null;
          user_id: string | null;
          customer_id: string | null;
          user_name: string | null;
          user_email: string | null;
          user_description: string | null;
          device_brand: string | null;
          device_name: string | null;
          device_type: string | null;
          pricing_mode: string | null;
          storage_tier: string | null;
          sim_variant: string | null;
          needs_manual_review: boolean | null;
          base_trade_value: number | null;
          deduction_breakdown: Json | null;
          component_flags: Json | null;
          target_product_price: number | null;
          top_up_amount: number | null;
          condition: string | null;
          accessories: string[] | null;
          target_device: string | null;
          target_product_id: string | null;
          target_variant_id: string | null;
          estimated_value: number | null;
          offered_price: number | null;
          final_value: number | null;
          preferred_date: string | null;
          preferred_time: string | null;
          fulfillment_method: string | null;
          contact_name: string | null;
          contact_phone: string | null;
          contact_email: string | null;
          admin_notes: string | null;
          status: string | null;
          created_at: string | null;
          updated_at: string | null;
          imei_serial: string | null;
          your_color: string | null;
          target_color: string | null;
          answers_snapshot: Json | null;
          answers_edited: boolean;
          needs_verification: boolean;
          below_threshold: boolean;
          expires_at: string | null;
          terms_accepted_at: string | null;
          phone_verified_at: string | null;
          pickup_address: string | null;
          pickup_area: string | null;
          preferred_window: string | null;
        };
        Insert: Partial<Database['public']['Tables']['trade_in_requests']['Row']>;
        Update: Partial<Database['public']['Tables']['trade_in_requests']['Row']>;
        Relationships: [];
      };
    };
    Views: {
      /** Admin queue — resolved contact + is_expired; falls back to trade_in_requests if missing */
      v_trade_requests_admin: {
        Row: Database['public']['Tables']['trade_in_requests']['Row'] & {
          resolved_name: string | null;
          resolved_email: string | null;
          resolved_phone: string | null;
          imei_masked: string | null;
          is_expired: boolean | null;
        };
        Relationships: [];
      };
      v_trade_threshold_worksheet: {
        Row: {
          model: string;
          device_type: TradeDeviceType;
          lowest_base: number | null;
          highest_base: number | null;
          current_threshold: number | null;
          status: string;
        };
        Relationships: [];
      };
      v_trade_targets: {
        Row: {
          product_id: string;
          name: string;
          slug: string | null;
          category: string | null;
          condition: string | null;
          trade_model: string | null;
          product_image: string | null;
          variant_id: string | null;
          sku: string | null;
          color: string | null;
          storage: string | null;
          ram: string | null;
          sim_type: SimVariant | null;
          effective_price: number;
          variant_stock: number;
          display_image: string | null;
        };
        Relationships: [];
      };
      v_product_page: {
        Row: {
          id: string;
          slug: string | null;
          display_id: string | null;
          name: string;
          brand: string | null;
          description: string | null;
          category: string | null;
          condition: string | null;
          currency: string;
          status: string | null;
          base_price: number;
          discount: number | null;
          rating: number | null;
          review_count: number | null;
          is_new: boolean | null;
          featured: boolean | null;
          colors: string[] | null;
          storage: string[] | null;
          ram: string[] | null;
          specs: string[] | null;
          specifications: Json | null;
          image_url: string | null;
          trade_model: string | null;
          total_stock: number;
          price_from: number | null;
          price_to: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      compute_trade_estimate: {
        Args: {
          p_model: string;
          p_storage: string;
          p_sim: string;
          p_answers: Json;
        };
        Returns: TradeEstimateResult;
      };
      fn_resolve_product_variant: {
        Args: {
          p_trade_model: string;
          p_storage?: string;
          p_sim?: string;
          p_color?: string;
        };
        Returns: {
          product_id: string;
          variant_id: string | null;
          product_name: string;
          color: string | null;
          storage: string | null;
          sim_type: SimVariant | null;
          effective_price: number;
          match_quality: string;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// Convenience row aliases
export type RepairRequestRow = Database['public']['Tables']['repair_requests']['Row'];
export type RepairRequestInsert = Database['public']['Tables']['repair_requests']['Insert'];
export type TradeDeviceRow = Database['public']['Tables']['trade_devices']['Row'];
export type TradeConfigRow = Database['public']['Tables']['trade_config']['Row'];
export type TradeQuestionRow = Database['public']['Tables']['trade_questions']['Row'];
export type TradeAnswerRow = Database['public']['Tables']['trade_answers']['Row'];
export type TradeBaseValueRow = Database['public']['Tables']['trade_base_values']['Row'];
export type TradeFaultDeductionRow = Database['public']['Tables']['trade_fault_deductions']['Row'];
export type TradeAestheticOverrideRow = Database['public']['Tables']['trade_aesthetic_overrides']['Row'];
export type AuditLogRow = Database['public']['Tables']['audit_log']['Row'];
export type TradeInRequestRow = Database['public']['Tables']['trade_in_requests']['Row'];
export type TradeTargetRow = Database['public']['Views']['v_trade_targets']['Row'];
export type ProductPageRow = Database['public']['Views']['v_product_page']['Row'];
export type TradeRequestsAdminRow = Database['public']['Views']['v_trade_requests_admin']['Row'];
export type TradeThresholdWorksheetRow = Database['public']['Views']['v_trade_threshold_worksheet']['Row'];

/** Question with nested answers — joined client-side */
export interface TradeQuestionWithAnswers extends TradeQuestionRow {
  answers: TradeAnswerRow[];
}

/** 8-value + hard_stop outcome vocabulary for questionnaire editor */
export const TRADE_ANSWER_OUTCOMES: readonly TradeAnswerOutcome[] = [
  'none',
  'deduct_full',
  'deduct_half',
  'deduct_quarter',
  'aesthetic_a1',
  'aesthetic_a2',
  'battery_replaced_policy',
  'camera_replaced_policy',
  'hard_stop',
] as const;
