import { supabase } from './supabase';
import { 
  Profile, 
  UserRole, 
  Product, 
  ProductVariant, 
  CartItem, 
  Wishlist, 
  Order, 
  OrderItem, 
  TrackingUpdate, 
  Review, 
  RepairRequest, 
  TradeInRequest,
  InventoryAdjustment,
  Supplier,
  PurchaseOrder,
  PurchaseOrderItem,
  Message,
  MessageThread,
  EmailLog,
  EmailSendQueue
} from '../types';

const normalizeCategory = (category?: string): string => {
  if (!category) return 'Accessories';
  const value = category.trim().toLowerCase();

  if (['iphone', 'iphones', 'phone', 'phones', 'mobile', 'mobile phone', 'mobile phones', 'smartphone', 'smartphones'].includes(value)) {
    return 'iPhone';
  }
  if (['laptop', 'laptops', 'notebook', 'notebooks', 'macbook', 'macbooks', 'computer', 'computers'].includes(value)) {
    return 'Laptop';
  }
  if (['accessory', 'accessories', 'case', 'cases', 'wearable', 'wearables'].includes(value)) {
    return 'Accessories';
  }
  if (['gaming', 'game', 'games', 'console', 'consoles'].includes(value)) {
    return 'Gaming';
  }
  if (['audio', 'headphone', 'headphones', 'earbuds', 'speaker', 'speakers'].includes(value)) {
    return 'Audio';
  }
  if (['tablet', 'tablets', 'ipad', 'ipads'].includes(value)) {
    return 'Tablet';
  }

  return category;
};

// ==========================================
// AUTHENTICATION & PROFILES
// ==========================================

export const signUp = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  
  // Fetch user profile and role
  if (data.user) {
    const profile = await getUserProfile(data.user.id);
    const roles = await getUserRoles(data.user.id);
    const role = roles[0]?.role || 'user';
    
    return {
      user: {
        ...data.user,
        name: profile?.name || data.user.email?.split('@')[0] || 'User',
        role: role
      },
      session: data.session
    };
  }
  
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const handleSignOut = async (setUser: (user: null) => void, navigateTo: (view: string) => void) => {
  try {
    await signOut();
  } catch (error: any) {
    console.error('Sign out error:', error);
  } finally {
    setUser(null);
    navigateTo('home');
  }
};

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const getUserProfile = async (userId: string): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
};

export const updateUserProfile = async (userId: string, updates: Partial<Profile>) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const getUserRoles = async (userId: string): Promise<UserRole[]> => {
  const { data, error } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return data || [];
};

// ==========================================
// PRODUCTS & VARIANTS
// ==========================================

// ==========================================
// PRODUCT MANAGEMENT (ADMIN)
// ==========================================

export const createProduct = async (product: Partial<Product>) => {
  const { data, error } = await supabase
    .from('products')
    .insert({
      name: product.name,
      description: product.description,
      price: product.price,
      image_url: product.image || product.image_url,
      category: product.category,
      rating: product.rating,
      review_count: product.review_count || product.reviewCount,
      discount: product.discount,
      is_new: product.new || product.is_new,
      stock: product.stock || 0,
      featured: product.featured
    })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateProduct = async (id: string, updates: Partial<Product>) => {
  const { data, error } = await supabase
    .from('products')
    .update({
      name: updates.name,
      description: updates.description,
      price: updates.price,
      image_url: updates.image || updates.image_url,
      category: updates.category,
      rating: updates.rating,
      review_count: updates.review_count || updates.reviewCount,
      discount: updates.discount,
      is_new: updates.new || updates.is_new,
      stock: updates.stock,
      featured: updates.featured
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteProduct = async (id: string) => {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
};

export const getProducts = async (): Promise<Product[]> => {
  const { data, error } = await supabase
    .from('products')
    .select('*, product_variants(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  
  // Map for backward compatibility
  return data.map((p: any) => ({
    ...p,
    category: normalizeCategory(p.category),
    image: p.image_url,
    new: p.is_new,
    reviewCount: p.review_count,
    variants: p.product_variants
  }));
};

export const getProduct = async (id: string): Promise<Product | null> => {
  const { data, error } = await supabase
    .from('products')
    .select('*, product_variants(*)')
    .eq('id', id)
    .single();
  if (error) throw error;
  if (!data) return null;
  return {
    ...data,
    category: normalizeCategory(data.category),
    image: data.image_url,
    new: data.is_new,
    reviewCount: data.review_count,
    variants: data.product_variants
  };
};

// ==========================================
// CART
// ==========================================

export const getCartItems = async (userId: string): Promise<CartItem[]> => {
  const { data, error } = await supabase
    .from('cart_items')
    .select('*, products(*), product_variants(*)')
    .eq('user_id', userId);
  if (error) throw error;
  return data.map((item: any) => ({
    ...item,
    name: item.products?.name,
    price: item.product_variants ? (Number(item.products?.price) + Number(item.product_variants.price_modifier)) : Number(item.products?.price),
    image: item.products?.image_url,
    selectedOptions: item.product_variants ? { variant: item.product_variants.sku } : {}
  }));
};

export const addToCart = async (userId: string, productId: string, variantId?: string, quantity: number = 1) => {
  const payload: any = { user_id: userId, product_id: productId, quantity };
  if (variantId) payload.variant_id = variantId;

  const { data, error } = await supabase
    .from('cart_items')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateCartItemQuantity = async (itemId: string, quantity: number) => {
  const { data, error } = await supabase
    .from('cart_items')
    .update({ quantity })
    .eq('id', itemId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const removeFromCart = async (itemId: string) => {
  const { error } = await supabase.from('cart_items').delete().eq('id', itemId);
  if (error) throw error;
};

export const clearCartItems = async (userId: string) => {
  const { error } = await supabase.from('cart_items').delete().eq('user_id', userId);
  if (error) throw error;
};

// ==========================================
// WISHLIST
// ==========================================

export const getWishlist = async (userId: string): Promise<Wishlist[]> => {
  const { data, error } = await supabase.from('wishlist').select('*, products(*)').eq('user_id', userId);
  if (error) throw error;
  return data;
};

export const addToWishlist = async (userId: string, productId: string) => {
  const { data, error } = await supabase.from('wishlist').insert({ user_id: userId, product_id: productId }).select().single();
  if (error) throw error;
  return data;
};

export const removeFromWishlist = async (id: string) => {
  const { error } = await supabase.from('wishlist').delete().eq('id', id);
  if (error) throw error;
};

// ==========================================
// REVIEWS
// ==========================================

export const getReviews = async (productId: string): Promise<Review[]> => {
  const { data, error } = await supabase.from('reviews').select('*').eq('product_id', productId).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const addReview = async (review: Omit<Review, 'id' | 'created_at'>) => {
  const { data, error } = await supabase.from('reviews').insert(review).select().single();
  if (error) throw error;
  return data;
};

// ==========================================
// ORDERS & CHECKOUT
// ==========================================

export const placeOrder = async (
  userId: string, 
  customerId: string, 
  shippingAddress: string, 
  paymentMethod: string, 
  shippingMethod: string = 'Standard Delivery',
  cartItems: CartItem[] = []
) => {
  // First try RPC if available
  try {
    const { data, error } = await supabase.rpc('place_order', {
      p_user_id: userId,
      p_customer_id: customerId,
      p_shipping_address: shippingAddress,
      p_payment_method: paymentMethod,
      p_shipping_method: shippingMethod
    });

    if (!error && data) return data;
    if (error) console.warn('place_order RPC failed, falling back to direct insert:', error.message);
  } catch (rpcError) {
    console.warn('place_order RPC unavailable, falling back to direct insert:', rpcError);
  }

  // Fallback path: write directly to orders and order_items tables
  const subtotal = cartItems.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity || 1)), 0);
  const shippingCost = shippingMethod.toLowerCase().includes('pick') ? 0 : 50;
  const total = subtotal + shippingCost;

  const { data: latestOrder } = await supabase
    .from('orders')
    .select('display_id')
    .not('display_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastDisplay = latestOrder?.display_id || 'ORD00000';
  const lastNumber = Number(String(lastDisplay).replace(/[^0-9]/g, '')) || 0;
  const nextDisplayId = `ORD${String(lastNumber + 1).padStart(5, '0')}`;

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      display_id: nextDisplayId,
      user_id: userId,
      customer_id: customerId,
      status: 'pending',
      payment_status: paymentMethod === 'delivery' ? 'pending' : 'paid',
      payment_method: paymentMethod,
      shipping_address: shippingAddress,
      shipping_method: shippingMethod,
      shipping_cost: shippingCost,
      total_price: total
    })
    .select()
    .single();

  if (orderError) throw orderError;

  if (cartItems.length > 0) {
    const lineItems = cartItems.map((item) => ({
      order_id: order.id,
      product_id: item.product_id || item.id,
      quantity: Number(item.quantity || 1),
      price: Number(item.price || 0),
      unit_price: Number(item.price || 0)
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(lineItems);
    if (itemsError) throw itemsError;
  }

  return order;
};

export const getOrders = async (userId?: string): Promise<Order[]> => {
  let query = supabase.from('orders').select('*, profiles(*), order_items(*, products(*, product_variants(*)))').order('created_at', { ascending: false });
  if (userId) query = query.eq('user_id', userId);
  
  const { data, error } = await query;
  if (error) throw error;

  return data.map((o: any) => ({
    ...o,
    userId: o.user_id,
    userName: o.profiles?.name || 'Unknown',
    userEmail: o.profiles?.email || 'N/A',
    items: o.order_items.map((i: any) => ({
      ...i,
      name: i.products?.name,
      image: i.products?.image_url,
      selectedOptions: i.product_variants ? { variant: i.product_variants.sku } : {}
    })),
    total: Number(o.total_price),
    date: o.created_at
  }));
};

export const getOrder = async (id: string): Promise<Order | null> => {
  const { data, error } = await supabase.from('orders').select('*, profiles(*), order_items(*, products(*))').eq('id', id).single();
  if (error) throw error;
  if (!data) return null;
  
  return {
    ...data,
    userId: data.user_id,
    userName: data.profiles?.name || 'Unknown',
    userEmail: data.profiles?.email || 'N/A',
    items: data.order_items.map((i: any) => ({
      ...i,
      name: i.products?.name,
      image: i.products?.image_url
    })),
    total: Number(data.total_price),
    date: data.created_at
  };
};

export const updateOrderStatus = async (id: string, status: string) => {
  const { data, error } = await supabase.from('orders').update({ status }).eq('id', id).select().single();
  if (error) throw error;
  return data;
};

// ==========================================
// TRACKING UPDATES
// ==========================================

export const getTrackingUpdates = async (orderId: string): Promise<TrackingUpdate[]> => {
  const { data, error } = await supabase.from('tracking_updates').select('*').eq('order_id', orderId).order('created_at', { ascending: true });
  if (error) throw error;
  return data.map((t: any) => ({ ...t, timestamp: t.created_at }));
};

export const addTrackingUpdate = async (update: Omit<TrackingUpdate, 'id' | 'created_at'>) => {
  const { data, error } = await supabase.from('tracking_updates').insert(update).select().single();
  if (error) throw error;
  return data;
};

// ==========================================
// REPAIR REQUESTS
// ==========================================

export const createRepairRequest = async (repair: Partial<RepairRequest>) => {
  const { data, error } = await supabase.from('repair_requests').insert({ ...repair, status: 'pending' }).select().single();
  if (error) throw error;
  return data;
};

export const getRepairRequests = async (userId?: string): Promise<RepairRequest[]> => {
  let query = supabase.from('repair_requests').select('*').order('created_at', { ascending: false });
  if (userId) query = query.eq('user_id', userId);
  const { data, error } = await query;
  if (error) throw error;
  return data.map((r: any) => ({
    ...r,
    userId: r.user_id,
    userName: r.user_name || '',
    device: `${r.device_brand || ''} ${r.device_model || ''}`,
    issue: r.issue_type || '',
    date: r.created_at,
    imageUrl: r.image_urls?.[0] || '',
    estimatedCost: r.estimated_cost,
    aiDiagnosis: r.ai_diagnosis,
    adminNote: r.admin_note,
    fulfillmentMethod: r.fulfillment_method
  }));
};

export const updateRepairRequest = async (id: string, updates: Partial<RepairRequest>) => {
  const { data, error } = await supabase.from('repair_requests').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
};

// ==========================================
// TRADE-IN REQUESTS
// ==========================================

export const createTradeRequest = async (trade: Partial<TradeInRequest>) => {
  const { data, error } = await supabase.from('trade_in_requests').insert({ ...trade, status: 'submitted', estimated_value: trade.estimated_value || 0 }).select().single();
  if (error) throw error;
  return data;
};

export const getTradeRequests = async (userId?: string): Promise<TradeInRequest[]> => {
  let query = supabase.from('trade_in_requests').select('*').order('created_at', { ascending: false });
  if (userId) query = query.eq('user_id', userId);
  const { data, error } = await query;
  if (error) throw error;
  return data.map((t: any) => ({
    ...t,
    userId: t.user_id,
    userName: t.user_name,
    userEmail: t.user_email,
    device: `${t.device_brand || ''} ${t.device_name || ''}`,
    date: t.created_at,
    estimatedValue: Number(t.estimated_value) || 0,
    finalValue: t.final_value ? Number(t.final_value) : undefined,
    adminNote: t.admin_notes,
    targetDevice: t.target_device,
    userDescription: t.user_description,
    preferredDate: t.preferred_date,
    preferredTime: t.preferred_time,
    contactName: t.contact_name,
    contactEmail: t.contact_email,
    contactPhone: t.contact_phone,
    fulfillmentMethod: t.fulfillment_method
  }));
};

export const updateTradeRequest = async (id: string, updates: Partial<TradeInRequest>) => {
  const { data, error } = await supabase.from('trade_in_requests').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
};

// ==========================================
// ADMIN / INVENTORY / MESSAGING
// ==========================================

// ==========================================
// USER / ROLE MANAGEMENT (ADMIN)
// ==========================================

export const updateUserRole = async (userId: string, role: string) => {
  // First delete existing role(s)
  await supabase.from('user_roles').delete().eq('user_id', userId);
  // Insert new role
  const { data, error } = await supabase
    .from('user_roles')
    .insert({ user_id: userId, role })
    .select()
    .single();
  if (error) throw error;
  return data;
};

// ==========================================
// CUSTOMER HELPER (CHECKOUT COMPAT)
// ==========================================

/**
 * For guest / new checkouts: upserts a profile row and returns the user id.
 * If the user is already authenticated the profile already exists.
 */
export const getOrCreateCustomer = async (
  name: string,
  email: string,
  phone: string,
  address: string
) => {
  // Check if a customer with this email exists
  const { data: existing, error: findError } = await supabase
    .from('customers')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existing) return existing;

  // Create a new customer record
  const { data, error } = await supabase
    .from('customers')
    .insert({ name, email, phone, address })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const getInventoryAdjustments = async (productId: string) => {
  const { data, error } = await supabase.from('inventory_adjustments').select('*').eq('product_id', productId).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const createInventoryAdjustment = async (adjustment: Partial<InventoryAdjustment>) => {
  const { data, error } = await supabase.from('inventory_adjustments').insert(adjustment).select().single();
  if (error) throw error;
  return data;
};

export const getUsers = async (): Promise<Profile[]> => {
  const { data, error } = await supabase.from('profiles').select('*, user_roles(*)').order('created_at', { ascending: false });
  if (error) throw error;
  return data.map((p: any) => ({
    ...p,
    role: p.user_roles?.[0]?.role || 'user'
  }));
};

export const getMessages = async () => {
  const { data, error } = await supabase.from('messages').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};
