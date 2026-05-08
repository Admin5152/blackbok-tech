export type AppRole = 'admin' | 'moderator' | 'user';

export interface Profile {
  id: string;
  name?: string;
  avatar_letter?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  region?: string;
  is_suspended?: boolean;
  suspended_at?: string;
  suspension_reason?: string;
  created_at?: string;
  updated_at?: string;
}

// Aliases for backward compatibility in UI
export type User = Profile & {
  role?: AppRole | 'sales' | 'repair';
  wishlist?: string[];
  // camelCase aliases used throughout UI components
  avatarLetter?: string;
  password?: string;
};

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

export type Category = 'iPhone' | 'Laptop' | 'Accessories' | 'Gaming' | 'Audio' | string;

export interface Product {
  id: string;
  name: string;
  brand?: string;
  model?: string;
  sku?: string;
  category?: Category;
  description?: string;
  price: number;
  discount?: number;
  stock?: number;
  image_url?: string;
  // Fallback alias for backward compatibility
  image?: string; 
  specs?: string[];
  colors?: string[];
  condition?: string;
  status?: string;
  featured?: boolean;
  is_new?: boolean;
  // Alias for backward comp:
  new?: boolean;
  rating?: number;
  review_count?: number;
  // Alias for backward comp:
  reviewCount?: number;
  created_at?: string;
  updated_at?: string;
  // Additional backward comp:
  variants?: ProductVariant[];
  storage?: string[];
  ram?: string[];
}

export interface ProductVariant {
  id?: string;
  product_id?: string;
  sku?: string;
  color?: string;
  ram?: string;
  storage?: string;
  price_modifier?: number;
  stock?: number;
  created_at?: string;
  updated_at?: string;
  // Backward comp (used in constants.ts seed data & UI)
  name?: string;
  options?: string[];
}

export interface CartItem {
  id: string;
  user_id?: string;
  product_id?: string;
  variant_id?: string;
  quantity: number;
  created_at?: string;
  updated_at?: string;
  // Backward compatibility: the UI expects a Product-like structure in cart.
  // These default to safe values so callers don't need null checks.
  name: string;
  price: number;
  image?: string;
  image_url?: string;
  category?: Category;
  description?: string;
  stock: number;
  selectedOptions?: Record<string, string>;
}

export interface Wishlist {
  id: string;
  user_id: string;
  product_id: string;
  created_at?: string;
}

export interface Order {
  id: string;
  display_id?: string;
  user_id?: string;
  customer_id?: string;
  status: string;
  payment_status?: string;
  payment_method?: string;
  shipping_address?: string;
  shipping_method?: string;
  shipping_cost?: number;
  total_price?: number;
  tracking_number?: string;
  estimated_delivery?: string;
  actual_delivery?: string;
  created_at?: string;
  updated_at?: string;
  // Backward compat camelCase aliases used in UI
  userId?: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  items: CartItem[];
  total: number;
  date: string;
  paymentMethod?: string;
  shipping_address_display?: string;
  tracking_updates?: TrackingUpdate[];
}

export interface OrderItem {
  id: string;
  order_id?: string;
  product_id?: string;
  variant_id?: string;
  quantity?: number;
  price?: number;
  unit_price?: number;
  created_at?: string;
  updated_at?: string;
}

export interface TrackingUpdate {
  id: string;
  order_id: string;
  status: string;
  description?: string;
  location?: string;
  created_at?: string;
  // Backward comp:
  timestamp?: string;
}

export interface Review {
  id: string;
  product_id: string;
  user_id?: string;
  user_name?: string;
  rating: number;
  title?: string;
  body?: string;
  created_at?: string;
}

export interface RepairRequest {
  id: string;
  display_id?: string;
  user_id?: string;
  customer_id?: string;
  user_name?: string;
  device_brand?: string;
  device_model?: string;
  issue_type?: string;
  issue_description?: string;
  ai_diagnosis?: string;
  image_urls?: string[];
  accessories?: string[];
  urgency?: string;
  fulfillment_method?: string;
  preferred_date?: string;
  preferred_time?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  repair_approval?: string;
  data_backup?: string;
  diagnostic_fee?: string;
  agrees_to_terms?: boolean;
  client_signature?: string;
  estimated_cost?: number;
  final_cost?: number;
  technician_notes?: string;
  admin_note?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  // Backward comp:
  userId?: string;
  userName?: string;
  device?: string;
  issue?: string;
  date?: string;
  aiDiagnosis?: string;
  estimatedCost?: string | number;
  adminNote?: string;
  imageUrl?: string;
  fulfillmentMethod?: string;
}

export interface TradeInRequest {
  id: string;
  display_id?: string;
  user_id?: string;
  customer_id?: string;
  user_name?: string;
  user_email?: string;
  user_description?: string;
  device_brand?: string;
  device_name?: string;
  condition?: string;
  accessories?: string[];
  target_device?: string;
  target_product_id?: string;
  estimated_value?: number;
  offered_price?: number;
  final_value?: number;
  preferred_date?: string;
  preferred_time?: string;
  fulfillment_method?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  admin_notes?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  // Backward comp:
  userId?: string;
  userName?: string;
  userEmail?: string;
  device?: string;
  date?: string;
  estimatedValue?: number;
  finalValue?: number;
  adminNote?: string;
  imageUrl?: string;
  targetDevice?: string;
  userDescription?: string;
  preferredDate?: string;
  preferredTime?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  fulfillmentMethod?: string;
}

// Export a TradeRequest alias to avoid breaking everything
export type TradeRequest = TradeInRequest;

export interface InventoryAdjustment {
  id: string;
  product_id: string;
  variant_id?: string;
  quantity_change: number;
  adjustment_type: string;
  reason?: string;
  adjusted_by?: string;
  created_at?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PurchaseOrder {
  id: string;
  supplier_id?: string;
  status?: string;
  total_cost?: number;
  notes?: string;
  ordered_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  product_id: string;
  variant_id?: string;
  quantity: number;
  unit_cost?: number;
  created_at?: string;
}

export interface Message {
  id: string;
  display_id?: string;
  sender_name: string;
  sender_email: string;
  subject: string;
  body?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MessageThread {
  id: string;
  message_id: string;
  sender: string;
  content: string;
  created_at?: string;
}

export interface EmailBlocklist {
  id: number;
  email: string;
  reason?: string;
  created_at?: string;
}

export interface EmailLog {
  id: string;
  user_id?: string;
  to_email: string;
  event_type: string;
  provider: string;
  provider_id?: string;
  status_code?: number;
  error?: string;
  attempt?: number;
  created_at?: string;
}

export interface EmailSendQueue {
  id: string;
  payload: any;
  provider_hint?: string;
  state?: string;
  attempts?: number;
  last_error?: string;
  scheduled_at?: string;
  created_at?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
