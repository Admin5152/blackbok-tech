
import { Product } from './types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'BB-101',
    name: 'iPhone 14 Midnight Black Unlocked',
    category: 'iPhone',
    price: 7999,
    discount: 16,
    rating: 4.2,
    reviewCount: 678,
    description: 'Advanced dual-camera system. A15 Bionic chip. Ceramic Shield.',
    image: 'https://images.unsplash.com/photo-1663499482523-1c0c1bae4ce1?auto=format&fit=crop&q=80&w=800',
    stock: 15,
    specs: ['Super Retina XDR Display', 'A15 Bionic', 'Ceramic Shield'],
    variants: [
      { name: 'Color', options: ['Black', 'White', 'Red', 'Blue', 'Purple', 'Green'] },
      { name: 'Storage', options: ['128GB', '256GB', '512GB'] }
    ],
  },
  {
    id: 'BB-102',
    name: 'Apple Pencil (2nd Generation)',
    category: 'Accessories',
    price: 1299,
    rating: 4.5,
    reviewCount: 678,
    description: 'Precision performance for iPad Pro, iPad Air, and iPad mini.',
    image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&q=80&w=800',
    stock: 50,
    variants: [
      { name: 'Color', options: ['White', 'Black'] }
    ],
  },
  {
    id: 'BB-103',
    name: 'AirPods Pro (2nd Generation)',
    category: 'Accessories',
    price: 2499,
    discount: 11,
    rating: 4.3,
    reviewCount: 589,
    description: 'Active Noise Cancellation and Adaptive Transparency.',
    image: 'https://images.unsplash.com/photo-1603351154351-5e2d0600bb77?auto=format&fit=crop&q=80&w=800',
    stock: 30,
    variants: [
      { name: 'Color', options: ['White', 'Black'] }
    ],
  },
  {
    id: 'BB-104',
    name: 'PlayStation 5 Console',
    category: 'Gaming',
    price: 5499,
    new: true,
    rating: 4.8,
    reviewCount: 512,
    description: 'Experience lightning-fast loading and deeper immersion.',
    image: 'https://images.unsplash.com/photo-1606813907291-d86ebb9474ad?auto=format&fit=crop&q=80&w=800',
    stock: 12,
    variants: [
      { name: 'Color', options: ['White', 'Black', 'Red'] }
    ],
  },
  {
    id: 'BB-105',
    name: 'MacBook Air 15" M2 Chip',
    category: 'Laptop',
    price: 12999,
    rating: 4.7,
    reviewCount: 421,
    description: 'The worlds best 15-inch laptop.',
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=1200',
    stock: 8,
    variants: [
      { name: 'Color', options: ['Space Gray', 'Silver', 'Midnight'] },
      { name: 'RAM', options: ['8GB', '16GB', '24GB'] },
      { name: 'Storage', options: ['256GB', '512GB', '1TB', '2TB'] }
    ],
  },
  {
    id: 'BB-107',
    name: 'MacBook Pro 14" M3 Chip',
    category: 'Laptop',
    price: 18499,
    new: true,
    rating: 4.8,
    reviewCount: 312,
    description: 'The most advanced chips ever built for a personal computer.',
    image: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&q=80&w=1200',
    stock: 5,
    variants: [
      { name: 'Color', options: ['Space Black', 'Silver'] },
      { name: 'RAM', options: ['8GB', '16GB', '24GB'] },
      { name: 'Storage', options: ['512GB', '1TB', '2TB'] }
    ],
  },
  {
    id: 'BB-108',
    name: 'MacBook Pro 16" M3 Max',
    category: 'Laptop',
    price: 34999,
    new: true,
    rating: 4.9,
    reviewCount: 156,
    description: 'Extreme performance for pro workflows.',
    image: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&q=80&w=1200',
    stock: 3,
    variants: [
      { name: 'Color', options: ['Space Black', 'Silver'] },
      { name: 'RAM', options: ['36GB', '64GB', '96GB', '128GB'] },
      { name: 'Storage', options: ['1TB', '2TB', '4TB', '8TB'] }
    ],
  },
  {
    id: 'BB-106',
    name: 'Nintendo Switch OLED',
    category: 'Gaming',
    price: 4500,
    new: true,
    discount: 11,
    rating: 4.9,
    reviewCount: 942,
    description: 'Vivid colors and crisp contrast on a larger OLED screen.',
    image: 'https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?auto=format&fit=crop&q=80&w=1200',
    stock: 15,
    variants: [
      { name: 'Color', options: ['White', 'Red', 'Black'] }
    ],
  },
  {
    id: 'BB-109',
    name: 'AirPods Max - Space Gray',
    category: 'Audio',
    price: 4999,
    rating: 4.7,
    reviewCount: 234,
    description: 'The ultimate listening experience. High-fidelity audio with Active Noise Cancellation.',
    image: 'https://images.unsplash.com/photo-1613040809024-b4ef7ba99bc3?auto=format&fit=crop&q=80&w=800',
    stock: 12,
    variants: [
      { name: 'Color', options: ['Space Gray', 'Silver', 'Sky Blue', 'Green', 'Pink'] }
    ],
  },
  {
    id: 'BB-110',
    name: 'Sony WH-1000XM5 Wireless Headphones',
    category: 'Audio',
    price: 3499,
    rating: 4.8,
    reviewCount: 456,
    description: 'Industry-leading noise cancellation. Exceptional sound quality.',
    image: 'https://images.unsplash.com/photo-1618366712277-722626e13e0e?auto=format&fit=crop&q=80&w=800',
    stock: 20,
    variants: [
      { name: 'Color', options: ['Black', 'Silver', 'Blue'] }
    ],
  },
  {
    id: 'BB-111',
    name: 'iPad Pro 12.9" M2 Chip',
    category: 'Tablet',
    price: 15999,
    new: true,
    rating: 4.8,
    reviewCount: 289,
    description: 'Astonishing performance. Incredibly advanced displays.',
    image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&q=80&w=1200',
    stock: 10,
    variants: [
      { name: 'Color', options: ['Space Gray', 'Silver'] },
      { name: 'Storage', options: ['128GB', '256GB', '512GB', '1TB', '2TB'] }
    ],
  },
  {
    id: 'BB-112',
    name: 'Dell XPS 15 Laptop',
    category: 'Laptop',
    price: 21999,
    rating: 4.6,
    reviewCount: 167,
    description: 'Stunning 4K OLED display and powerful performance.',
    image: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&q=80&w=1200',
    stock: 6,
    variants: [
      { name: 'Processor', options: ['i7', 'i9'] },
      { name: 'RAM', options: ['16GB', '32GB', '64GB'] }
    ],
  },
  {
    id: 'BB-113',
    name: 'Logitech MX Master 3S',
    category: 'Accessories',
    price: 999,
    rating: 4.9,
    reviewCount: 850,
    description: 'Ultrafast scrolling, ergonomic design, and silent clicks.',
    image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&q=80&w=800',
    stock: 45,
    variants: [
      { name: 'Color', options: ['Graphite', 'Pale Grey'] }
    ],
  },
  {
    id: 'BB-114',
    name: 'Keychron K2 Mechanical Keyboard',
    category: 'Accessories',
    price: 899,
    rating: 4.7,
    reviewCount: 420,
    description: 'Compact 75% layout with RGB backlighting and wireless connectivity.',
    image: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?auto=format&fit=crop&q=80&w=800',
    stock: 25,
    variants: [
      { name: 'Switch', options: ['Blue', 'Red', 'Brown'] }
    ],
  },
  {
    id: 'BB-115',
    name: 'Samsung Galaxy Buds2 Pro',
    category: 'Audio',
    price: 1899,
    rating: 4.6,
    reviewCount: 310,
    description: 'Ultimate 24-bit Hi-Fi sound and Intelligent ANC.',
    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&q=80&w=800',
    stock: 18,
    variants: [
      { name: 'Color', options: ['Bora Purple', 'Graphite', 'White'] }
    ],
  },
  {
    id: 'BB-116',
    name: 'Razer Blade 16 Gaming Laptop',
    category: 'Laptop',
    price: 35999,
    new: true,
    rating: 4.8,
    reviewCount: 95,
    description: 'Incredible performance with RTX 4090 and Mini-LED display.',
    image: 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&q=80&w=1200',
    stock: 4,
    variants: [
      { name: 'Display', options: ['QHD+', 'UHD+'] },
      { name: 'Storage', options: ['1TB', '2TB'] }
    ],
  }
];
