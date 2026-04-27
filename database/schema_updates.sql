-- Database schema updates for complete order management
-- Run these commands to add missing columns and tables

-- 1. Add customer details to orders table
ALTER TABLE orders 
ADD COLUMN customer_name TEXT,
ADD COLUMN customer_email TEXT,
ADD COLUMN customer_phone TEXT,
ADD COLUMN delivery_location TEXT,
ADD COLUMN payment_method TEXT,
ADD COLUMN notes TEXT;

-- 2. Create notifications table for customer alerts
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('order_ready', 'order_processed', 'order_delivered')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create order_status_history table for tracking changes
CREATE TABLE IF NOT EXISTS order_status_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_by UUID REFERENCES profiles(id),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Update orders table status options
ALTER TABLE orders 
DROP CONSTRAINT IF EXISTS orders_status_check,
ADD CONSTRAINT orders_status_check CHECK (status IN ('pending', 'processing', 'ready', 'shipped', 'delivered', 'cancelled'));

-- 5. Enable RLS for new tables
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

-- 6. RLS policies for notifications
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage notifications" ON notifications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 7. RLS policies for order status history
CREATE POLICY "Users can view own order history" ON order_status_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = order_status_history.order_id 
            AND orders.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all order history" ON order_status_history
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 8. Function to create notification when order status changes
CREATE OR REPLACE FUNCTION create_order_status_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- Create notification for customer when order becomes 'ready'
    IF NEW.status = 'ready' AND OLD.status != 'ready' THEN
        INSERT INTO notifications (user_id, order_id, type, title, message)
        VALUES (
            NEW.user_id,
            NEW.id,
            'order_ready',
            'Your Order is Ready!',
            'Great news! Your order has been processed and is ready for pickup.'
        );
    END IF;

    -- Record status change in history
    INSERT INTO order_status_history (order_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Trigger to automatically create notifications
CREATE TRIGGER order_status_change_notification
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION create_order_status_notification();
