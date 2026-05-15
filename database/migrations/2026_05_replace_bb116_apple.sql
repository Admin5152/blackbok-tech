-- Replace Razer Blade 16 (BB-116) with MacBook Air 13" M3 in live catalog.
UPDATE public.products
SET
  name = 'MacBook Air 13" M3 Chip',
  description = 'Ultra-thin design with M3 power and all-day battery life.',
  price = 24999,
  image_url = 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=1200',
  category = 'Laptop',
  rating = 4.9,
  review_count = 210,
  stock = 6,
  new = TRUE
WHERE id = 'BB-116'
   OR display_id = 'BB-116';
 