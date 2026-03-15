
export type Category = 'iPhone' | 'Laptop' | 'Accessories' | 'Gaming' | 'Audio' | 'Trades' | 'Tablet';

export interface ProductVariant {
  name: string;
  options: string[];
}

export interface Product {
  id: string;
  name: string;
  category: Category;
  price: number;
  description: string;
  image: string;
  stock: number;
  featured?: boolean;
  new?: boolean;
  discount?: number;
  rating?: number;
  reviewCount?: number;
  specs?: string[];
  variants?: ProductVariant[];
  colors?: string[];
  storage?: string[];
  ram?: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'user' | 'admin' | 'sales' | 'repair';
  address?: string;
  wishlist?: string[];
  avatarLetter?: string;
}

export interface CartItem extends Product {
  quantity: number;
  selectedOptions?: Record<string, string>;
}

export interface Order {
  id: string;
  userId: string;
  userName: string;
  items: CartItem[];
  total: number;
  status: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  date: string;
  paymentMethod: string;
  tracking_number?: string;
  estimated_delivery?: string;
  actual_delivery?: string;
  shipping_address?: string;
  payment_status?: 'pending' | 'paid' | 'failed' | 'refunded';
  shipping_method?: string;
  shipping_cost?: number;
}

export interface RepairRequest {
  id: string;
  userId: string;
  userName: string;
  device: string;
  issue: string;
  /** Lifecycle: Received → Diagnosing → Estimate Sent → In Repair → Ready → Completed | Rejected */
  status: 'Received' | 'Diagnosing' | 'Estimate Sent' | 'In Repair' | 'Ready' | 'Completed' | 'Rejected';
  date: string;
  aiDiagnosis?: string;
  /** Cost string set by admin, e.g. "$120" */
  estimatedCost?: string;
  adminNote?: string;
  imageUrl?: string;
  fulfillmentMethod?: 'Headquarters' | 'Pickup';
}

export interface TradeRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  device: string;
  /** Set by admin after inspection */
  condition?: 'Like New' | 'Excellent' | 'Good' | 'Fair' | 'Poor';
  /** Lifecycle: Pending → Inspecting → Offer Made (Awaiting User) → Accepted | Rejected → Completed */
  status: 'Pending' | 'Inspecting' | 'Offer Made' | 'Awaiting User' | 'Accepted' | 'Completed' | 'Rejected';
  date: string;
  estimatedValue: number;
  finalValue?: number;
  adminNote?: string;
  imageUrl?: string;
  // Extended fields
  targetDevice?: string;
  userDescription?: string;
  preferredDate?: string;
  preferredTime?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  fulfillmentMethod?: 'Headquarters' | 'Pickup';
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
