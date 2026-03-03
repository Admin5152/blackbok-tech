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

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) throw error;
  return data;
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

// Orders
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

export const getOrders = async (userId?: string): Promise<Order[]> => {
  let query = supabase
    .from('orders')
    .select(`
      *,
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
    .order('created_at', { ascending: false });
  
  if (userId) {
    query = query.eq('user_id', userId);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  
  return data.map(order => ({
    id: order.id,
    userId: order.user_id,
    userName: '', // TODO: Join with profiles table
    items: order.order_items.map((item: any) => ({
      id: item.product_id,
      name: item.products?.name || '',
      price: Number(item.price),
      quantity: item.quantity,
      image: item.products?.image_url || '',
      category: 'Other' as any,
      stock: 100,
      description: ''
    })),
    total: Number(order.total_price),
    date: order.created_at,
    status: order.status,
    paymentMethod: 'Credit Card' // TODO: Add payment method to orders table
  }));
};

export const getOrder = async (id: string): Promise<Order | null> => {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
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
    userName: '', // TODO: Join with profiles table
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
    paymentMethod: 'Credit Card' // TODO: Add payment method to orders table
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
    email: profile.email,
    name: profile.email.split('@')[0], // Use email prefix as name
    role: profile.role as 'user' | 'admin'
  }));
};

export const updateUserRole = async (userId: string, role: 'user' | 'admin') => {
  const { data, error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};
