
export type Category = 'iPhone' | 'Laptop' | 'Accessories' | 'Gaming' | 'Audio';

export interface ProductVariant {
  name: string; // e.g., "Color", "Storage"
  options: string[]; // e.g., ["Space Gray", "Silver"], ["128GB", "256GB"]
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
}

export interface User {
  id: string;
  name: string;
  email: string;
  password: String,
  role: 'user' | 'admin';
  wishlist?: string[]; // Array of product IDs
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
}

export interface RepairRequest {
  id: string;
  userId: string;
  userName: string;
  device: string;
  issue: string;
  status: 'Received' | 'Diagnosing' | 'In Repair' | 'Ready' | 'Completed';
  date: string;
  aiDiagnosis?: string;
  estimatedCost?: string;
  imageUrl?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
