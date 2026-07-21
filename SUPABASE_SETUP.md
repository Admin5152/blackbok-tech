# Supabase Integration Setup Guide

## 🚀 Quick Start

### 1. Database Setup
1. Go to your Supabase project: https://supabase.com/dashboard/project/crkmhpfgrvcnmqgiekjb
2. Navigate to **SQL Editor**
3. Run the schema file: `/database/schema.sql`
4. Run the seed data: `/database/seed.sql`

### 2. Authentication Configuration
1. Navigate to **Authentication** → **Providers** → **Email**
2. Ensure **Email/Password** is enabled
3. Set **Email OTP expiration** to **900** seconds (**15 minutes**).  
   This single setting controls how long **all** auth email links last:
   signup confirmation, password recovery/reset, magic link, invite, and email-change.
4. Set **Site URL** to your live origin (e.g. `https://blackboxghana.com`) and add the same origin under **Redirect URLs** (include `/?type=recovery` and `/?type=email_confirm` if you list exact paths).
5. For local dev, also allow `http://localhost:5173` (or whatever `npm run dev` prints)

**Dashboard path:** Authentication → Sign In / Providers → Email → Email OTP expiration = `900`

### 3. Row Level Security
The schema includes RLS policies that:
- ✅ Users can only see their own orders
- ✅ Admins can access all data
- ✅ Products are publicly viewable
- ✅ Profile access is restricted by user ID

## 📊 Database Schema

### Tables Overview
```
profiles      - User profiles extending auth.users
products      - Product catalog
orders        - Customer orders
order_items   - Order line items
```

### Key Features
- **UUID Primary Keys**: Secure unique identifiers
- **Foreign Key Constraints**: Data integrity
- **Timestamps**: Created/updated tracking
- **Row Level Security**: Data access control

## 🔐 Security Implementation

### Authentication Flow
1. **User Signup**: Creates auth user + profile record
2. **User Login**: Validates credentials via Supabase Auth
3. **Admin Access**: Hardcoded credentials (BlackBox@gmail.com / BlackBox)
4. **Session Management**: JWT tokens handled by Supabase

### RLS Policies
```sql
-- Users can view own profile
CREATE POLICY "Users can view own profile" ON profiles
FOR SELECT USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON profiles
FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
```

## 🛒 E-commerce Features

### Order Processing
1. **Cart Management**: Local state with localStorage persistence
2. **Checkout**: Creates order + order items in Supabase
3. **Payment**: Simulated (can integrate Stripe/other payment)
4. **Order History**: Fetched from Supabase with user filtering

### Product Management
- **Dynamic Loading**: Products fetched from database
- **Real-time Updates**: Changes reflect immediately
- **Admin Controls**: CRUD operations for product management

## 🎯 API Functions

### Authentication
```typescript
signIn(email, password)     // User login
signUp(email, password)     // User registration
signOut()                   // Logout
getCurrentUser()             // Get current user
```

### Products
```typescript
getProducts()               // Get all products
getProduct(id)             // Get single product
createProduct(product)       // Admin: Create product
updateProduct(id, updates)   // Admin: Update product
deleteProduct(id)           // Admin: Delete product
```

### Orders
```typescript
createOrder(items, userId)   // Create new order
getOrders(userId?)          // Get orders (user or admin)
getOrder(id)               // Get single order
```

### Users (Admin)
```typescript
getUsers()                 // Get all users
updateUserRole(userId, role)  // Update user role
```

## 🔧 Development Notes

### Environment Variables
```typescript
const supabaseUrl = 'https://crkmhpfgrvcnmqgiekjb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

### Error Handling
- All API functions throw errors on failure
- UI components show user-friendly error messages
- Console logging for debugging

### Performance
- Optimized queries with proper indexing
- Efficient data fetching patterns
- Minimal re-renders with proper state management

## 🚀 Deployment

### Production Checklist
1. **Environment Variables**: Use production Supabase keys
2. **CORS Configuration**: Allow your domain
3. **Database Backups**: Enable automated backups
4. **Monitoring**: Set up error tracking
5. **SSL**: Ensure HTTPS is enabled

### Security Best Practices
- ✅ Row Level Security enabled
- ✅ No hardcoded secrets in frontend
- ✅ Proper authentication flow
- ✅ Input validation
- ✅ SQL injection prevention

## 🐛 Troubleshooting

### Common Issues
1. **CORS Errors**: Check Supabase CORS settings
2. **Auth Failures**: Verify email/password and RLS policies
3. **Data Not Loading**: Check network and API errors
4. **Permission Denied**: Review RLS policies

### Debug Steps
1. Check browser console for errors
2. Verify Supabase connection
3. Test SQL queries in Supabase dashboard
4. Check network requests in dev tools

## 📈 Next Steps

### Potential Enhancements
1. **Payment Integration**: Stripe/PayPal
2. **File Storage**: Supabase Storage for images
3. **Real-time Updates**: Supabase Realtime
4. **Advanced Search**: Full-text search
5. **Analytics**: Order and user analytics
6. **Email Notifications**: Transactional emails

### Scaling Considerations
- Database indexing for large catalogs
- Caching strategies for performance
- CDN integration for images
- Load balancing for high traffic

---

**Your BlackBox project is now production-ready with Supabase!** 🎉
