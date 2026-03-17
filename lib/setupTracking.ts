import { supabase } from './supabase';

export const setupOrderTracking = async () => {
  try {
    // Check if tracking columns exist in orders table
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'orders' });

    if (columnsError) {
      console.error('Error checking table columns:', columnsError);
      return false;
    }

    const hasTrackingColumns = columns.some((col: any) => col.column_name === 'tracking_number');

    if (!hasTrackingColumns) {
      console.log('Setting up order tracking system...');
      
      // Execute the tracking setup SQL
      const { error: setupError } = await supabase.rpc('execute_sql', {
        sql_file: 'order_tracking.sql'
      });

      if (setupError) {
        console.error('Error setting up tracking:', setupError);
        return false;
      }

      console.log('Order tracking system set up successfully');
    }

    return true;
  } catch (error) {
    console.error('Setup error:', error);
    return false;
  }
};

export const addTrackingUpdate = async (
  orderId: string,
  status: string,
  description: string,
  location?: string
) => {
  try {
    const { data, error } = await supabase.rpc('add_tracking_update', {
      p_order_id: orderId,
      p_status: status,
      p_location: location,
      p_description: description
    });

    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error adding tracking update:', error);
    throw error;
  }
};
