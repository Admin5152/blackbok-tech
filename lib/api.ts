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

// Sort embedded product_images by `sort_order` ascending so consumers get a
// stable order. Primary images are surfaced first by the gallery component
// itself, not here, so list views with simple "first image" rendering still
// work via the existing `image_url` fallback.
const normalizeProductImages = (raw: any): any[] => {
  if (!Array.isArray(raw)) return [];
  return [...raw].sort(
    (a: any, b: any) => Number(a?.sort_order ?? 0) - Number(b?.sort_order ?? 0)
  );
};

export const getProducts = async (): Promise<Product[]> => {
  const { data, error } = await supabase
    .from('products')
    .select('*, product_variants(*), product_images(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  
  // Map for backward compatibility
  return data.map((p: any) => ({
    ...p,
    category: normalizeCategory(p.category),
    image: p.image_url,
    new: p.is_new,
    reviewCount: p.review_count,
    variants: p.product_variants,
    images: normalizeProductImages(p.product_images)
  }));
};

export const getProduct = async (id: string): Promise<Product | null> => {
  const { data, error } = await supabase
    .from('products')
    .select('*, product_variants(*), product_images(*)')
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
    variants: data.product_variants,
    images: normalizeProductImages(data.product_images)
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
  customerId: string | null, 
  shippingAddress: string, 
  paymentMethod: string, 
  shippingMethod: string = 'Standard Delivery',
  cartItems: CartItem[] = []
) => {
  const isUuid = (v: any) =>
    typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

  const buildLineItems = (orderId: string) =>
    cartItems.map((item: any) => {
      const rawId = item.product_id || item.id;
      return {
        order_id: orderId,
        product_id: isUuid(rawId) ? rawId : null,
        quantity: Number(item.quantity || 1),
        price: Number(item.price || 0),
        unit_price: Number(item.price || 0),
        // Snapshot so order detail survives product edits/deletes and
        // works for cart items coming from seed/local products.
        product_name: item.name || item.title || null,
        product_image: item.image || item.image_url || null,
        product_options: item.selectedOptions || {},
      };
    });

  const ensureOrderItems = async (orderId: string) => {
    if (cartItems.length === 0) return;

    const { data: existingItems, error: existingError } = await supabase
      .from('order_items')
      .select('id')
      .eq('order_id', orderId)
      .limit(1);

    if (existingError) throw existingError;
    if (existingItems && existingItems.length > 0) return;

    const rows = buildLineItems(orderId);
    const { error: itemsError } = await supabase.from('order_items').insert(rows);
    if (itemsError) {
      // Fallback: retry without product_id (in case of FK violation).
      console.warn('order_items insert failed, retrying without product_id:', itemsError);
      const fallback = rows.map((r) => ({ ...r, product_id: null }));
      const { error: retryError } = await supabase.from('order_items').insert(fallback);
      if (retryError) throw retryError;
    }
  };

  // Use direct insert so payment status starts as pending until admin confirmation.
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
      customer_id: customerId || null,
      status: 'pending',
      payment_status: 'pending',
      payment_method: paymentMethod,
      shipping_address: shippingAddress,
      shipping_method: shippingMethod,
      shipping_cost: shippingCost,
      total_price: total
    })
    .select()
    .single();

  if (orderError) throw orderError;

  await ensureOrderItems(order.id);

  // Atomically decrement stock for each line item that maps to a real product row.
  for (const item of cartItems as any[]) {
    const pid = item.product_id || item.id;
    const qty = Number(item.quantity || 1);
    if (typeof pid === 'string' && qty > 0) {
      try {
        await supabase.rpc('decrement_product_stock', {
          _product_id: pid,
          _quantity: qty,
        });
      } catch (e) {
        console.warn('decrement_product_stock failed for', pid, e);
      }
    }
  }

  return order;
};

export const getOrders = async (userId?: string): Promise<Order[]> => {
  let query = supabase.from('orders').select('*, order_items(*, products(*, product_variants(*)))').order('created_at', { ascending: false });
  if (userId) query = query.eq('user_id', userId);
  
  const { data, error } = await query;
  if (error) throw error;

  const userIds = Array.from(new Set((data || []).map((o: any) => o.user_id).filter(Boolean)));
  let profileMap = new Map<string, any>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id,name,email,phone')
      .in('id', userIds);
    profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
  }

  return data.map((o: any) => ({
    ...o,
    userId: o.user_id,
    userName: profileMap.get(o.user_id)?.name || (profileMap.get(o.user_id)?.email ? String(profileMap.get(o.user_id).email).split('@')[0] : 'Unknown'),
    userEmail: profileMap.get(o.user_id)?.email || 'N/A',
    userPhone: profileMap.get(o.user_id)?.phone || '',
    paymentMethod: o.payment_method,
    items: (o.order_items || []).map((i: any) => ({
      ...i,
      name: i.products?.name || i.product_name || 'Item',
      image: i.products?.image_url || i.product_image || null,
      selectedOptions: i.product_options || (i.product_variants ? { variant: i.product_variants.sku } : {}),
      quantity: Number(i.quantity || 1),
      price: Number(i.price ?? i.unit_price ?? 0),
    })),
    total: Number(o.total_price),
    date: o.created_at
  }));
};

// Admin-focused order feed sourced from order_items
export const getAdminOrdersFromItems = async (): Promise<Order[]> => {
  const { data, error } = await supabase
    .from('order_items')
    .select('*, orders(*), products(*, product_variants(*))');

  if (error) throw error;
  if (!data) return [];

  const grouped = new Map<string, any>();
  const userIds = new Set<string>();

  for (const row of data as any[]) {
    const ord = row.orders;
    if (!ord?.id) continue;
    if (ord.user_id) userIds.add(ord.user_id);

    if (!grouped.has(ord.id)) {
      grouped.set(ord.id, {
        ...ord,
        userId: ord.user_id,
        userName: 'Unknown',
        userEmail: 'N/A',
        userPhone: '',
        paymentMethod: ord.payment_method,
        items: [],
        total: Number(ord.total_price || 0),
        date: ord.created_at
      });
    }

    grouped.get(ord.id).items.push({
      ...row,
      name: row.products?.name,
      image: row.products?.image_url,
      selectedOptions: row.product_variants ? { variant: row.product_variants.sku } : {}
    });
  }

  if (userIds.size > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id,name,email,phone')
      .in('id', Array.from(userIds));

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
    for (const order of grouped.values()) {
      const profile = profileMap.get(order.userId);
      if (profile) {
        order.userName = profile.name || (profile.email ? String(profile.email).split('@')[0] : 'Unknown');
        order.userEmail = profile.email || 'N/A';
        order.userPhone = profile.phone || '';
      }
    }
  }

  return Array.from(grouped.values()).sort((a, b) => {
    const aTime = new Date(a.date || 0).getTime();
    const bTime = new Date(b.date || 0).getTime();
    return bTime - aTime;
  });
};

export const getUserOrdersFromItems = async (userId: string): Promise<Order[]> => {
  const { data: ordersData, error: ordersError } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (ordersError) throw ordersError;
  if (!ordersData || ordersData.length === 0) return [];

  const orderMap = new Map<string, any>();
  for (const ord of ordersData as any[]) {
    orderMap.set(ord.id, {
      ...ord,
      userId: ord.user_id,
      userName: 'Unknown',
      userEmail: 'N/A',
      userPhone: '',
      paymentMethod: ord.payment_method,
      items: [],
      total: Number(ord.total_price || 0),
      date: ord.created_at
    });
  }

  const orderIds = Array.from(orderMap.keys());
  const { data, error } = await supabase
    .from('order_items')
    .select('*, products(*, product_variants(*))')
    .in('order_id', orderIds);

  if (error) throw error;

  for (const row of (data || []) as any[]) {
    const target = orderMap.get(row.order_id);
    if (!target) continue;
    target.items.push({
      ...row,
      name: row.products?.name,
      image: row.products?.image_url,
      selectedOptions: row.product_variants ? { variant: row.product_variants.sku } : {}
    });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id,name,email,phone')
    .eq('id', userId)
    .maybeSingle();

  for (const order of orderMap.values()) {
    order.userName = profile?.name || (profile?.email ? String(profile.email).split('@')[0] : 'Unknown');
    order.userEmail = profile?.email || 'N/A';
    order.userPhone = profile?.phone || '';
  }

  return Array.from(orderMap.values()).sort((a, b) => {
    const aTime = new Date(a.date || 0).getTime();
    const bTime = new Date(b.date || 0).getTime();
    return bTime - aTime;
  });
};

export const getOrder = async (id: string): Promise<Order | null> => {
  const { data, error } = await supabase.from('orders').select('*, order_items(*, products(*))').eq('id', id).single();
  if (error) throw error;
  if (!data) return null;

  let profile: any = null;
  if (data.user_id) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id,name,email,phone')
      .eq('id', data.user_id)
      .maybeSingle();
    profile = profileData;
  }
  
  return {
    ...data,
    userId: data.user_id,
    userName: profile?.name || (profile?.email ? String(profile.email).split('@')[0] : 'Unknown'),
    userEmail: profile?.email || 'N/A',
    userPhone: profile?.phone || '',
    paymentMethod: data.payment_method,
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
  const normalized = String(status || '').toLowerCase();
  const payload: Record<string, any> = { status: normalized };
  if (normalized === 'delivered') {
    payload.payment_status = 'paid';
  }

  const { error } = await supabase
    .from('orders')
    .update(payload)
    .eq('id', id);
  if (error) throw error;
  return { id, ...payload };
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

const REPAIR_STATUS_TO_DB: Record<string, string> = {
  Pending: 'pending',
  Received: 'pending',
  Diagnosing: 'diagnosing',
  'Estimate Sent': 'estimate_sent',
  'In Repair': 'in_repair',
  Ready: 'ready',
  Completed: 'completed',
  Rejected: 'rejected',
};

const REPAIR_STATUS_FROM_DB: Record<string, string> = {
  pending: 'Pending',
  diagnosing: 'Diagnosing',
  estimate_sent: 'Estimate Sent',
  in_repair: 'In Repair',
  ready: 'Ready',
  completed: 'Completed',
  rejected: 'Rejected',
};

const normalizeRepairPayload = (repair: Partial<RepairRequest>) => {
  const normalized: Record<string, any> = { ...repair };

  // Backward compatibility mappings
  if ((normalized as any).device && (!normalized.device_brand || !normalized.device_model)) {
    const parts = String((normalized as any).device).trim().split(' ');
    normalized.device_brand = normalized.device_brand || parts[0] || null;
    normalized.device_model = normalized.device_model || parts.slice(1).join(' ') || null;
  }
  if ((normalized as any).issue && !normalized.issue_description) {
    normalized.issue_description = (normalized as any).issue;
  }
  if ((normalized as any).adminNote !== undefined && normalized.admin_note === undefined) {
    normalized.admin_note = (normalized as any).adminNote;
  }
  if (normalized.status) {
    normalized.status = REPAIR_STATUS_TO_DB[String(normalized.status)] || String(normalized.status).toLowerCase();
  }
  if (typeof normalized.estimated_cost === 'string') {
    const parsed = Number(String(normalized.estimated_cost).replace(/[^0-9.]/g, ''));
    normalized.estimated_cost = Number.isFinite(parsed) ? parsed : null;
  }

  delete normalized.device;
  delete normalized.issue;
  delete (normalized as any).adminNote;
  return normalized;
};

export const createRepairRequest = async (repair: Partial<RepairRequest>) => {
  const payload = normalizeRepairPayload({ ...repair, status: repair.status || 'pending' });
  const { data, error } = await supabase
    .from('repair_requests')
    .insert(payload)
    .select()
    .single();
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
    status: REPAIR_STATUS_FROM_DB[r.status] || r.status,
    device: `${r.device_brand || ''} ${r.device_model || ''}`,
    issue: r.issue_description || r.issue_type || '',
    date: r.created_at,
    imageUrl: r.image_urls?.[0] || '',
    estimatedCost: r.estimated_cost,
    aiDiagnosis: r.ai_diagnosis,
    adminNote: r.admin_note,
    fulfillmentMethod: r.fulfillment_method
  }));
};

export const updateRepairRequest = async (id: string, updates: Partial<RepairRequest>) => {
  const payload = normalizeRepairPayload(updates);
  const { data, error } = await supabase
    .from('repair_requests')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// ==========================================
// TRADE-IN REQUESTS
// ==========================================

const TRADE_STATUS_TO_DB: Record<string, string> = {
  Pending: 'submitted',
  Inspecting: 'inspecting',
  'Offer Made': 'offer_made',
  'Awaiting User': 'awaiting_user',
  Accepted: 'accepted',
  Completed: 'completed',
  Rejected: 'rejected',
};

const TRADE_STATUS_FROM_DB: Record<string, string> = {
  submitted: 'Pending',
  inspecting: 'Inspecting',
  offer_made: 'Offer Made',
  awaiting_user: 'Awaiting User',
  accepted: 'Accepted',
  completed: 'Completed',
  rejected: 'Rejected',
};

const normalizeTradeUpdatePayload = (updates: Partial<TradeInRequest>) => {
  const normalized: Record<string, any> = { ...updates };

  // Map legacy keys to actual DB columns
  if ((normalized as any).admin_note !== undefined && normalized.admin_notes === undefined) {
    normalized.admin_notes = (normalized as any).admin_note;
  }

  if (normalized.status) {
    normalized.status = TRADE_STATUS_TO_DB[String(normalized.status)] || String(normalized.status).toLowerCase();
  }

  delete (normalized as any).admin_note;
  return normalized;
};

export const createTradeRequest = async (trade: Partial<TradeInRequest>) => {
  const payload = normalizeTradeUpdatePayload({
    ...trade,
    status: trade.status || 'submitted',
    estimated_value: trade.estimated_value || 0
  });

  const { data, error } = await supabase
    .from('trade_in_requests')
    .insert(payload)
    .select()
    .single();
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
    status: TRADE_STATUS_FROM_DB[t.status] || t.status,
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
  const payload = normalizeTradeUpdatePayload(updates);
  const { data, error } = await supabase
    .from('trade_in_requests')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
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
  address: string,
  userId?: string
) => {
  // For authenticated checkout, RLS expects customer id to match auth user id.
  if (userId) {
    const { data: existingById } = await supabase
      .from('customers')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (existingById) return existingById;

    const { data, error } = await supabase
      .from('customers')
      .insert({ id: userId, name, email, phone, address })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // Guest/legacy fallback
  const { data: existing } = await supabase
    .from('customers')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existing) return existing;

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

export const updateProfilePhone = async (userId: string, phone: string) => {
  const { error } = await supabase
    .from('profiles')
    .update({ phone })
    .eq('id', userId);
  if (error) throw error;
};
