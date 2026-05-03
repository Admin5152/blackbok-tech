import { supabase } from './supabase';
import { Product, User, Order, CartItem } from '../types';

// Authentication
export const signUp = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;
  return data;
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const handleSignOut = async (setUser: (user: null) => void, navigateTo: (view: string) => void) => {
  try {
    await signOut();
    setUser(null);
    navigateTo('home');
  } catch (error: any) {
    console.error('Sign out error:', error);
    // Still clear local session even if Supabase signOut fails
    setUser(null);
    navigateTo('home');
  }
};

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const createUserProfile = async (userId: string, name: string, email: string, role: 'user' | 'admin' = 'user') => {
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      name,
      email,
      role
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle(); // Use maybeSingle() instead of single() to handle no results

  if (error) throw error;
  return data; // Will return null if no profile exists
};

// Products
export const getProducts = async (): Promise<Product[]> => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data.map(product => ({
    id: product.id,
    name: product.name,
    description: product.description || '',
    price: Number(product.price),
    image: product.image_url || '',
    category: product.category || 'Other',
    stock: 100, // Default stock - TODO: add stock field to database
    rating: Number(product.rating),
    reviewCount: product.review_count || 0,
    discount: product.discount,
    new: product.new || false,
    specs: [] // TODO: Add specs support if needed
  }));
};

export const getProduct = async (id: string): Promise<Product | null> => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    description: data.description || '',
    price: Number(data.price),
    image: data.image_url || '',
    category: data.category || 'Other',
    stock: 100, // Default stock - TODO: add stock field to database
    rating: Number(data.rating),
    reviewCount: data.review_count || 0,
    discount: data.discount,
    new: data.new || false,
    specs: [] // TODO: Add specs support if needed
  };
};

export const createProduct = async (product: Omit<Product, 'id'>) => {
  const { data, error } = await supabase
    .from('products')
    .insert({
      name: product.name,
      description: product.description,
      price: product.price,
      image_url: product.image,
      category: product.category,
      rating: product.rating,
      review_count: product.reviewCount,
      discount: product.discount,
      new: product.new
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
      image_url: updates.image,
      category: updates.category,
      rating: updates.rating,
      review_count: updates.reviewCount,
      discount: updates.discount,
      new: updates.new
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteProduct = async (id: string) => {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// Customer handling
export const getOrCreateCustomer = async (name: string, email: string, phone: string, address: string) => {
  // Check if customer exists
  const { data: existingCustomer, error: checkError } = await supabase
    .from('customers')
    .select('*')
    .eq('email', email)
    .single();

  if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = not found
    throw checkError;
  }

  // If customer exists, return it
  if (existingCustomer) {
    return existingCustomer;
  }

  // Create new customer
  const { data: newCustomer, error: createError } = await supabase
    .from('customers')
    .insert({
      name,
      email,
      phone,
      address
    })
    .select()
    .single();

  if (createError) throw createError;
  return newCustomer;
};

// Orders
export const placeOrder = async (userId: string, customerId: string, shippingAddress: string, paymentMethod: string, cartItems: CartItem[]) => {
  const { data, error } = await supabase.rpc('place_order', {
    user_id: userId,
    customer_id: customerId,
    shipping_address: shippingAddress,
    payment_method: paymentMethod,
    cart_items: cartItems.map(item => ({
      product_id: item.id,
      quantity: item.quantity,
      selected_options: item.selectedOptions || {}
    }))
  });

  if (error) throw error;
  return data;
};

export const createOrder = async (items: CartItem[], userId: string) => {
  const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Create order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      user_id: userId,
      total_price: totalPrice
    })
    .select()
    .single();

  if (orderError) throw orderError;

  // Create order items
  const orderItems = items.map(item => ({
    order_id: order.id,
    product_id: item.id,
    quantity: item.quantity,
    price: item.price
  }));

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems);

  if (itemsError) throw itemsError;

  return order;
};

export const clearCartItems = async (userId: string) => {
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('user_id', userId);

  if (error) throw error;
};

export const getOrders = async (userId?: string): Promise<Order[]> => {
  let query = supabase
    .from('orders')
    .select(`
      *,
      customers (
        id,
        name,
        email,
        phone,
        address
      ),
      order_items (
        *,
        products (
          *,
          product_variants (*)
        )
      )
    `)
    .order('created_at', { ascending: false });

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return data.map(order => ({
    id: order.id,
    userId: order.user_id,
    userName: order.customers?.name || 'Unknown',
    userEmail: order.customers?.email || 'N/A',
    userPhone: order.customers?.phone || 'N/A',
    items: order.order_items.map((item: any) => ({
      id: item.product_id,
      name: item.products?.name || '',
      price: Number(item.price),
      quantity: item.quantity,
      selectedOptions: item.selected_options || {},
      stock: item.products?.stock || 0,
      description: item.products?.description || ''
    })),
    total: Number(order.total_price),
    date: order.created_at,
    status: order.status.charAt(0).toUpperCase() + order.status.slice(1),
    paymentMethod: order.payment_method || 'Not provided',
    shipping_address: order.shipping_address || 'Not provided',
    tracking_number: order.tracking_number,
    payment_status: order.payment_status || 'pending',
    shipping_method: order.shipping_method || 'standard',
    shipping_cost: order.shipping_cost || 0,
    display_id: order.display_id || `ORD-${order.id}`
  }));
};

export const updateOrderStatus = async (id: string, status: Order['status']) => {
  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getOrder = async (id: string): Promise<Order | null> => {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      profiles (
        email,
        name
      ),
      order_items (
        id,
        product_id,
        quantity,
        price,
        products (
          id,
          name,
          image_url
        )
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    userName: data.profiles?.name || data.profiles?.email?.split('@')[0] || 'Unknown User',
    userEmail: data.profiles?.email || 'N/A',
    items: data.order_items.map((item: any) => ({
      id: item.product_id,
      name: item.products?.name || '',
      price: Number(item.price),
      quantity: item.quantity,
      image: item.products?.image_url || '',
      category: 'Other' as any,
      stock: 100,
      description: ''
    })),
    total: Number(data.total_price),
    date: data.created_at,
    status: data.status,
    paymentMethod: 'Not provided',
    shipping_address: 'Not provided'
  };
};

// Users (Admin functions)
export const getUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data.map(profile => ({
    id: profile.id,
    email: profile.email || '',
    name: profile.name || (profile.email ? profile.email.split('@')[0] : 'Unknown User'),
    role: profile.role as 'user' | 'admin'
  }));
};

export const updateUserRole = async (userId: string, role: 'user' | 'admin' | 'sales' | 'repair') => {
  const { data, error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// ── Trade-In Requests ────────────────────────────────────────────

export const createTradeRequest = async (trade: {
  user_id: string;
  user_name: string;
  user_email: string;
  device: string;
  target_device?: string;
  user_description?: string;
  preferred_date?: string;
  preferred_time?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  fulfillment_method?: 'Headquarters' | 'Pickup';
}) => {
  const { data, error } = await supabase
    .from('trade_requests')
    .insert({ ...trade, status: 'Pending', estimated_value: 0 })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const getTradeRequests = async (userId?: string) => {
  let query = supabase
    .from('trade_requests')
    .select('*')
    .order('created_at', { ascending: false });
  if (userId) query = query.eq('user_id', userId);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((t: any) => ({
    id: t.id,
    userId: t.user_id,
    userName: t.user_name || '',
    userEmail: t.user_email || '',
    device: t.device || '',
    condition: t.condition || '',
    status: t.status || 'Pending',
    date: t.created_at,
    estimatedValue: Number(t.estimated_value) || 0,
    finalValue: t.final_value ? Number(t.final_value) : undefined,
    adminNote: t.admin_note || '',
    targetDevice: t.target_device || '',
    userDescription: t.user_description || '',
    preferredDate: t.preferred_date || '',
    preferredTime: t.preferred_time || '',
    contactName: t.contact_name || '',
    contactEmail: t.contact_email || '',
    contactPhone: t.contact_phone || '',
    fulfillmentMethod: t.fulfillment_method || 'Headquarters',
  }));
};

export const updateTradeRequest = async (
  id: string,
  updates: {
    status?: string;
    condition?: string;
    estimated_value?: number;
    final_value?: number;
    admin_note?: string;
  }
) => {
  const { data, error } = await supabase
    .from('trade_requests')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// ── Repair Requests ──────────────────────────────────────────────

export const createRepairRequest = async (repair: {
  user_id: string;
  user_name: string;
  device: string;
  issue: string;
  image_url?: string;
  ai_diagnosis?: string;
  fulfillment_method?: 'Headquarters' | 'Pickup';
}) => {
  const { data, error } = await supabase
    .from('repair_requests')
    .insert({ ...repair, status: 'Received' })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const getRepairRequests = async (userId?: string) => {
  let query = supabase
    .from('repair_requests')
    .select('*')
    .order('created_at', { ascending: false });
  if (userId) query = query.eq('user_id', userId);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    userName: r.user_name || '',
    device: r.device || '',
    issue: r.issue || '',
    status: r.status || 'Received',
    date: r.created_at,
    imageUrl: r.image_url || '',
    estimatedCost: r.estimated_cost || '',
    aiDiagnosis: r.ai_diagnosis || '',
    adminNote: r.admin_note || '',
    fulfillmentMethod: r.fulfillment_method || 'Headquarters',
  }));
};

export const updateRepairRequest = async (
  id: string,
  updates: {
    status?: string;
    estimated_cost?: string;
    admin_note?: string;
  }
) => {
  const { data, error } = await supabase
    .from('repair_requests')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

