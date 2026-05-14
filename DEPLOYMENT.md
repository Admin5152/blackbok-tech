# 🚀 BlackBox Deployment Checklist

## Pre-Deployment Checklist

### ✅ Environment Setup
- [ ] Create `.env.production` file with all required variables
- [ ] Set `VITE_SUPABASE_URL` to production Supabase URL
- [ ] Set `VITE_SUPABASE_ANON_KEY` to production Supabase anon key
- [ ] Set `VITE_APP_URL` to `https://blackboxghana.com` (no trailing slash)

### ✅ Database Setup
- [ ] Run schema.sql in production Supabase
- [ ] Run seed.sql with production data
- [ ] Set up storage buckets for images
- [ ] Configure RLS policies
- [ ] Test authentication flow

### ✅ Build Process
- [ ] Run `npm run build` successfully
- [ ] Verify bundle sizes are acceptable
- [ ] Test service worker registration
- [ ] Check all assets are generated

### ✅ Hosting Configuration
- [ ] Configure static file serving
- [ ] Set up SPA routing (redirect all to index.html)
- [ ] Enable HTTPS
- [ ] Configure caching headers
- [ ] Set up custom domain (if needed)

## Deployment Platforms

### 🌐 Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Environment Variables in Vercel Dashboard:
# VITE_SUPABASE_URL
# VITE_SUPABASE_ANON_KEY
# VITE_APP_URL=https://blackboxghana.com
```

### 🌐 Netlify
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist

# Environment Variables in Netlify Dashboard:
# VITE_SUPABASE_URL
# VITE_SUPABASE_ANON_KEY
# VITE_APP_URL=https://blackboxghana.com
```

### 🌐 GitHub Pages
```bash
# If the site is served from https://<user>.github.io/<repo>/, set vite.config.ts `base` to `/<repo>/` and rebuild.
# Deploy using GitHub Actions
```

### 🌐 Custom Server
```bash
# Build and copy files
npm run build
cp -r dist/* /var/www/html/
```

## Post-Deployment Testing

### ✅ Functionality Tests
- [ ] Test user registration/login
- [ ] Test admin login (BlackBox@gmail.com / BlackBox)
- [ ] Test product browsing
- [ ] Test cart functionality
- [ ] Test checkout flow
- [ ] Test mobile back button
- [ ] Test PWA features

### ✅ Performance Tests
- [ ] Check page load speed (< 3 seconds)
- [ ] Test on mobile devices
- [ ] Test on slow networks
- [ ] Verify bundle splitting works
- [ ] Check service worker registration

### ✅ Security Tests
- [ ] Verify environment variables are not exposed
- [ ] Test RLS policies in Supabase
- [ ] Check HTTPS enforcement
- [ ] Verify CORS settings

## Troubleshooting

### 🐛 Common Issues

**Authentication fails**
- Check Supabase URL and keys
- Verify redirect URLs in Supabase settings
- Check RLS policies

**Build errors**
- Verify all dependencies are installed
- Check TypeScript configuration
- Ensure environment variables are set

**Service Worker issues**
- Check file path in registration
- Verify HTTPS is enabled
- Check browser console for errors

**Performance issues**
- Implement lazy loading
- Optimize images
- Enable compression

## Monitoring

### 📊 Analytics Setup
- [ ] Set up Google Analytics
- [ ] Configure error tracking
- [ ] Set up performance monitoring

### 🔍 Health Checks
- [ ] Monitor database connections
- [ ] Check API response times
- [ ] Monitor error rates
- [ ] Set up uptime monitoring

---

## 🚀 Quick Deploy Command

```bash
# Full deployment pipeline
npm run build
npm run test  # if tests exist
# Upload dist/ folder to your hosting platform
```

Remember: Always test in staging before production deployment!
