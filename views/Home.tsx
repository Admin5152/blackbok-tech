import React, { useState, useEffect } from 'react';
import {
  ChevronRight, ChevronLeft, ArrowRight, Smartphone, Laptop as LaptopIcon, Gamepad2, Package, Settings,
  Users, Award, TrendingUp, Star, Quote, ArrowLeftRight, Wrench, Mail, Phone, MapPin, Search
} from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Product, Category } from '../types';
import { ProductCard } from '../components/ProductCard';
import { getImagesForTheme, getPositionClasses, getBlurClasses } from '../data/heroImages';
import { formatCurrency } from '../lib/utils';
import { ShoppingCart } from 'lucide-react';

interface HomeProps {
  products: Product[];
  setSelectedCategory: (cat: Category | 'All') => void;
  onQuickView: (product: Product) => void;
  wishlist: string[];
  toggleWishlist: (productId: string) => void;
  onAddToCart: (p: Product) => void;
  compareIds: string[];
  onToggleCompare: (productId: string) => void;
  user: any;
  theme: 'light' | 'dark';
  navigateTo?: (v: string, id?: string) => void;
}

export const Home: React.FC<HomeProps> = ({
  products, setSelectedCategory, onQuickView, wishlist, toggleWishlist, onAddToCart, compareIds, onToggleCompare, user, theme, navigateTo
}) => {
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Get images for current theme
  const themeImages = getImagesForTheme(theme);

  // Auto-rotate images every 4 seconds
  useEffect(() => {
    if (themeImages.length === 0) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % themeImages.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [themeImages]);

  if (!products || products.length === 0) return null;

  const categories = [
    {
      name: "iPhone" as Category,
      desc: "Latest iPhone models and premium hardware",
      img: "/iPhone.jpeg",
      icon: Smartphone,
      products: products.filter(p => p.category === 'iPhone').slice(0, 3)
    },
    {
      name: "Laptop" as Category,
      desc: "Elite MacBooks and pro performance machines",
      img: "https://images.unsplash.com/photo-1671777560821-707c83d0305f",
      icon: LaptopIcon,
      products: products.filter(p => p.category === 'Laptop').slice(0, 3)
    },
    {
      name: "Gaming" as Category,
      desc: "Next-gen consoles and immersive controllers",
      img: "/ps5.jpeg",
      icon: Gamepad2,
      products: products.filter(p => p.category === 'Gaming').slice(0, 3)
    },
    {
      name: "Accessories" as Category,
      desc: "Premium accessories and tech essentials",
      img: "/cases.jpeg",
      icon: Package,
      products: products.filter(p => p.category === 'Accessories').slice(0, 3)
    }
  ];

  const customerReviews = [
    { name: "Kwame Asante", text: "Excellent service and quality products. BlackBox is my go-to for all tech needs.", rating: 5 },
    { name: "Ama Mensah", text: "Professional repair service and fair trade-in values. Highly recommended!", rating: 5 },
    { name: "Kojo Osei", text: "Great customer service and authentic products. The best tech store in Kumasi.", rating: 5 },
    { name: "Yaa Boakye", text: "Fast repairs and reasonable prices. I'm very satisfied with their service.", rating: 5 },
    { name: "Kwame Boateng", text: "Amazing experience! Got exactly what I needed at a great price.", rating: 5 }
  ];

  return (
    <div className="view-transition bg-black overflow-hidden no-print">
      {/* Main Content */}
      {/* Hero Section */}
      <section className="relative min-h-[100svh] flex items-center justify-center pt-24 sm:pt-32 pb-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background with tech accessories */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-black subtle-texture"></div>

          {/* Single Background Image with Slideshow */}
          {themeImages.length > 0 && (
            <div className="absolute inset-0 overflow-hidden">
              {themeImages.map((img, index) => (
                <img
                  key={img.filename}
                  src={`/${img.filename}`}
                  alt={img.description}
                  className={`absolute inset-0 w-full h-full object-cover object-center transition-all duration-2000 ease-in-out ${index === currentImageIndex
                    ? 'opacity-100 scale-100'
                    : 'opacity-0 scale-105'
                    }`}
                  style={{
                    filter: `${theme === 'light' && img.filename === 'BlackBox.jpeg' ? 'invert(1) brightness(1.2)' : ''
                      }`,
                    transform: index === currentImageIndex ? 'scale(1)' : 'scale(1.1)'
                  }}
                  loading="lazy"
                />
              ))}
            </div>
          )}

          {/* Dark overlay for text readability */}
          <div className={`absolute inset-0 ${theme === 'dark'
            ? 'bg-gradient-to-r from-black/60 via-transparent to-black/40'
            : 'bg-gradient-to-r from-black/20 via-transparent to-black/10'
            }`}></div>
        </div>

        <div className="max-w-7xl mx-auto w-full relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Side - Main Content */}
            <div className="space-y-8">
              <h1 className={`text-5xl md:text-6xl lg:text-[5rem] font-heading font-bold tracking-wider leading-[1.1] lg:leading-[0.9] ${theme === 'dark' ? 'text-off-white' : 'text-gray-900'
                }`}>
                Redefining Your
                <br />
                <span className={`bg-gradient-to-r bg-clip-text text-transparent ${theme === 'dark'
                  ? 'from-[#D4AF37] to-[#F4E4C1]'
                  : 'from-[#B38B21] to-[#D4AF37]'
                  }`}>
                  Tech Experience
                </span>
              </h1>

              <div className="space-y-4 max-w-lg">
                <p className={`text-lg font-light leading-relaxed ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                  Premium tech products, expert repairs, and seamless trade-ins for the modern enthusiast.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link
                  to="/store"
                  className={`btn-press inline-flex justify-center px-10 py-5 rounded-full text-sm font-heading font-semibold tracking-wider items-center gap-3 transition-all duration-300 hover:scale-105 hover:shadow-[0_20px_60px_rgba(255,255,255,0.3)] active:scale-95 ${theme === 'dark'
                    ? 'bg-white text-black hover:shadow-[0_20px_60px_rgba(255,255,255,0.3)]'
                    : 'bg-black text-white hover:shadow-[0_20px_60px_rgba(0,0,0,0.2)]'
                    }`}
                >
                  Browse Products
                  <ArrowRight className="transition-transform group-hover:translate-x-2" size={18} />
                </Link>

                <Link
                  to="/about"
                  className={`btn-press inline-flex justify-center px-10 py-5 rounded-full text-sm font-heading font-semibold tracking-wider items-center gap-3 transition-all duration-300 hover:scale-105 active:scale-95 ${theme === 'dark'
                    ? 'bg-black text-off-white border-2 border-white/20 hover:bg-white hover:text-black'
                    : 'bg-white text-black border-2 border-black/20 hover:bg-black hover:text-white'
                    }`}
                >
                  About Us
                  <ArrowRight className="transition-transform group-hover:translate-x-2" size={18} />
                </Link>
              </div>
            </div>

            {/* Right Side - Empty space for visual balance */}
            <div className="relative animate-in fade-in slide-in-from-right-10 duration-1000 delay-200">
              <div className="w-full h-96 flex items-center justify-center">
                {/* Subtle glow effect */}
                <div className="w-64 h-64 bg-[#D4AF37]/10 rounded-full blur-[100px] animate-pulse-slow"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Retail Section */}
      <section className="py-24 px-8 bg-gradient-to-b from-black to-gray-950 section-connector">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-heading font-bold text-white tracking-wider mb-4">
              Featured Products
            </h2>
            <div className="w-32 h-0.5 bg-[#D4AF37] mx-auto mb-6"></div>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Discover our curated selection of premium tech products hmdrgdbfcdhexewetrhyt
            </p>
            <div className="flex justify-center items-center gap-2 mt-4">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-red-500 font-heading font-semibold tracking-wider"></span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {categories.map((category, index) => (
              <Link
                key={category.name}
                to="/store"
                onClick={() => setSelectedCategory(category.name)}
                className="group relative rounded-2xl overflow-hidden border border-gray-800 hover:border-[#D4AF37]/50 transition-all duration-300 hover:transform hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/50"
                style={{ animationDelay: `${index * 100}ms` }}
                aria-label={`Explore ${category.name}`}
              >
                {/* Full-bleed image */}
                <div className="relative h-[320px] sm:h-[360px] lg:h-[420px]">
                  <img
                    src={category.img}
                    alt={category.name}
                    className="absolute inset-0 w-full h-full object-cover object-center"
                    loading="lazy"
                  />

                  {/* Overlays for readability */}
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-300" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                  {/* Icon */}
                  <div className="absolute top-4 right-4 w-11 h-11 bg-[#D4AF37]/20 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:bg-[#D4AF37] transition-colors">
                    <category.icon size={18} className="bb-force-white group-hover:text-black" />
                  </div>

                  {/* Text overlay */}
                  <div className="absolute inset-x-0 bottom-0 p-6">
                    <h3 className="text-3xl font-heading font-bold bb-force-white tracking-wide">
                      {category.name}
                    </h3>
                    <p className="mt-2 bb-force-white-70 text-sm leading-relaxed max-w-[26ch]">
                      {category.desc}
                    </p>
                    <div className="mt-6 inline-flex items-center gap-2 text-[#D4AF37] group-hover:text-[#F4E4C1] transition-colors text-sm font-heading font-semibold">
                      Explore {category.name}
                      <ChevronRight size={16} className="translate-x-0 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              to="/store"
              className="relative inline-flex px-10 py-4 border-2 border-[#D4AF37] text-[#D4AF37] rounded-full text-sm font-heading font-semibold tracking-wider items-center gap-3 transition-all duration-300 hover:bg-[#D4AF37] hover:text-black hover:scale-105 group"
            >
              <ArrowRight className="absolute -left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D4AF37] group-hover:text-black transition-colors" size={16} />
              Explore More
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Access / Accessories Slider */}
      <section className={`py-12 md:py-24 overflow-hidden ${theme === 'dark' ? 'bg-black' : 'bg-[#f5f5f7]'}`}>
        <div className="max-w-screen-2xl mx-auto">

          <div className="flex items-center justify-end mb-6 px-4 md:px-8 gap-3">
            <button
              onClick={() => document.getElementById('home-slider')?.scrollBy({ left: -400, behavior: 'smooth' })}
              className={`w-12 h-12 rounded-full border flex items-center justify-center transition-colors ${theme === 'dark' ? 'border-white/20 text-white hover:bg-white hover:text-black' : 'border-black/20 text-black hover:bg-black hover:text-white'}`}
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={() => document.getElementById('home-slider')?.scrollBy({ left: 400, behavior: 'smooth' })}
              className={`w-12 h-12 rounded-full border flex items-center justify-center transition-colors ${theme === 'dark' ? 'border-white/20 text-white hover:bg-white hover:text-black' : 'border-black/20 text-black hover:bg-black hover:text-white'}`}
            >
              <ChevronRight size={24} />
            </button>
          </div>

          <div id="home-slider" className="flex items-center gap-4 md:gap-6 overflow-x-auto no-scrollbar snap-x snap-mandatory px-4 md:px-8 pb-8" style={{ scrollPaddingLeft: 'max(1rem, env(safe-area-inset-left))' }}>
            {/* Promo Card */}
            <div className={`w-[300px] md:w-[400px] min-h-[400px] md:min-h-[500px] ${theme === 'dark' ? 'bg-[#111]' : 'bg-white'} ${theme === 'dark' ? 'text-white' : 'text-black'} p-8 md:p-12 rounded-[2rem] flex flex-col justify-between snap-start flex-shrink-0 shadow-sm border border-black/5 dark:border-white/5`}>
              <div>
                <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">Here and wow.</h2>
                <p className={`text-lg md:text-xl ${theme === 'dark' ? 'text-white/70' : 'text-black/70'}`}>The accessories you love.<br />In a fresh mix of colors.</p>
              </div>
              <div className="flex justify-center mt-8">
                <img src="/cases.jpeg" alt="Accessories" className="h-40 md:h-56 object-cover rounded-2xl drop-shadow-xl" />
              </div>
            </div>

            {/* Product Cards */}
            {products.filter(p => p.category === 'Accessories' || p.category === 'iPhone').slice(0, 8).map(p => (
              <div
                key={p.id}
                onClick={() => onQuickView(p)}
                className={`w-[260px] md:w-[300px] h-[360px] md:h-[420px] rounded-[2rem] snap-start flex-shrink-0 flex flex-col group cursor-pointer overflow-hidden relative shadow-lg ${theme === 'dark' ? 'bg-[#111]' : 'bg-[#f7f7f7]'}`}
              >
                {/* Corner frame borders (matching ProductCard) */}
                <div className="pointer-events-none absolute inset-0 z-10">
                  <div className={`absolute bottom-2 left-2 w-12 h-12 border-b-2 border-l-2 rounded-bl-[1.5rem] transition-colors ${theme === 'dark' ? 'border-white/20' : 'border-[#B38B21]/40'}`} />
                  <div className={`absolute bottom-2 right-2 w-12 h-12 border-b-2 border-r-2 rounded-br-[1.5rem] transition-colors ${theme === 'dark' ? 'border-white/20' : 'border-[#B38B21]/40'}`} />
                </div>

                {/* Full-bleed Product Image */}
                <div className="absolute inset-0 pt-4 pb-20 px-8 transform group-hover:scale-105 transition-transform duration-700 flex items-center justify-center">
                  <img src={p.image} alt={p.name} className="w-full h-full object-contain filter drop-shadow-2xl" />
                </div>

                {/* Gradient Overlay for Text Visibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80" />

                {/* Quick View Overlay Top Right (Alibaba style) */}
                <div className="absolute top-4 right-4 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-md z-20 rounded-full px-4 py-2 hover:bg-white/20">
                  <span className="text-white text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                    <Search size={12} /> View
                  </span>
                </div>

                {/* Content Overlay Bottom */}
                <div className="absolute inset-x-0 bottom-0 p-6 flex flex-col z-20">
                  <div className="flex items-center gap-2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-2 group-hover:translate-y-0">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={8} className={`${i < Math.floor(p.rating || 4) ? 'text-[#B38B21] fill-current' : 'text-white/20'}`} />
                    ))}
                    <span className="text-[9px] text-white/50 font-bold ml-1">({p.reviewCount || 678})</span>
                  </div>

                  <h3 className="font-black uppercase italic tracking-wider text-sm leading-tight mb-1 line-clamp-2 text-white drop-shadow-md">
                    {p.name}
                  </h3>

                  <div className="flex items-end justify-between mt-2">
                    <div>
                      <span className="text-[9px] text-white/60 mb-0.5 block uppercase tracking-widest italic">{p.category}</span>
                      <p className="font-black text-xl tracking-tighter text-[#B38B21] drop-shadow-md">
                        {formatCurrency(p.price)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); if (navigateTo) navigateTo('product', p.id); }}
                        className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-[#B38B21] transition-all flex items-center justify-center border border-white/20 hover:border-transparent hover:scale-110 active:scale-95 group/nav"
                      >
                        <ArrowRight size={16} className="group-hover/nav:-rotate-45 transition-transform" />
                      </button>

                      {/* Add to Cart Button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); onAddToCart(p); }}
                        className="w-10 h-10 rounded-full bg-white/10 hover:bg-[#B38B21] backdrop-blur-md text-white hover:text-black transition-all flex items-center justify-center group/btn border border-white/20 hover:border-transparent hover:scale-110 active:scale-95"
                      >
                        <ShoppingCart size={16} className="group-hover/btn:-translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trade-In Section */}
      <section className="py-24 px-8 bg-black relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="absolute left-8 text-[#D4AF37]/10">
            <ArrowLeftRight size={200} className="transform -rotate-45" />
          </div>
          <div className="absolute right-8 text-[#D4AF37]/10">
            <ArrowLeftRight size={200} className="transform rotate-45" />
          </div>
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-8">
          <h2 className="text-4xl md:text-5xl font-heading font-bold text-white tracking-wider">
            Trade-In & Upgrade
          </h2>
          <div className="w-32 h-0.5 bg-[#D4AF37] mx-auto"></div>

          <div className="space-y-6 max-w-2xl mx-auto">
            <p className="text-2xl md:text-3xl text-[#D4AF37] font-heading font-semibold">
              Get up to GHC500 toward your next upgrade
            </p>
            <p className="text-lg text-gray-300">
              Your old tech has value. Trade in eligible devices and save instantly.
            </p>
          </div>

          <div className="pt-8">
            <Link
              to="/trades"
              className="relative inline-flex px-12 py-5 bg-[#D4AF37] text-black rounded-full text-sm font-heading font-semibold tracking-wider items-center gap-3 transition-all duration-300 hover:scale-105 hover:shadow-[0_20px_60px_rgba(212,175,55,0.4)] active:scale-95 group"
            >
              Let's Trade
              <ArrowRight className="transition-transform group-hover:translate-x-2" size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Repair Section */}
      <section className={`relative flex flex-col lg:flex-row min-h-[600px] w-full overflow-hidden border-t ${theme === 'dark' ? 'bg-[#0a0a0a] border-white/5' : 'bg-[#F4F4F4] border-black/5'}`}>
        {/* Left Content */}
        <div className="w-full lg:w-1/2 p-12 lg:px-24 lg:py-32 flex flex-col justify-center relative">
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
            <Settings size={500} className={`${theme === 'dark' ? 'text-white' : 'text-black'}`} />
          </div>

          <div className="relative z-10 space-y-10 max-w-xl mx-auto lg:mx-0">
            <div className="space-y-6">
              <h2 className={`text-5xl md:text-7xl font-heading font-black tracking-wide leading-[1.1] ${theme === 'dark' ? 'text-white' : 'text-[#1a1a1a]'}`}>
                Expert Repair<br />Services
              </h2>
              <div className="w-20 h-0.5 bg-[#D4AF37]"></div>
            </div>

            <div className="space-y-6">
              <p className={`text-lg font-medium leading-relaxed ${theme === 'dark' ? 'text-gray-300' : 'text-gray-400'}`}>
                KNUST-certified diagnostics with precision circuit mapping.
              </p>
              <p className={`text-base font-medium leading-relaxed ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`}>
                Genuine parts, industry standards, certified technicians.
              </p>
            </div>

            <div>
              <Link
                to="/repair"
                className="inline-flex px-10 py-4 bg-[#D4AF37] text-black rounded-full text-sm font-heading font-bold tracking-widest items-center gap-3 transition-transform hover:scale-105 active:scale-95 shadow-lg"
              >
                Schedule Repair
                <Wrench size={16} />
              </Link>
            </div>
          </div>
        </div>

        {/* Right Image */}
        <div className="w-full lg:w-1/2 min-h-[400px] lg:min-h-full relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10 z-10 pointer-events-none"></div>
          <img
            src="https://images.unsplash.com/photo-1588508065123-287b28e013da?auto=format&fit=crop&q=80&w=2000"
            alt="Device Repair & Diagnostics"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
        </div>
      </section>

      {/* About Us Banner */}
      <section className={`py-20 px-8 ${theme === 'dark' ? 'bg-[#111]' : 'bg-white'} border-t border-b ${theme === 'dark' ? 'border-white/5' : 'border-black/5'} overflow-hidden`}>
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className={`text-4xl md:text-5xl font-bold ${theme === 'dark' ? 'text-white' : 'text-black'} tracking-tight`}>
            Premium Tech Repository
          </h2>
          <p className={`text-xl ${theme === 'dark' ? 'text-white/60' : 'text-black/60'} max-w-2xl mx-auto`}>
            Discover who we are, our mission for precision, and why thousands trust BlackBox for their digital excellence.
          </p>
          <div className="pt-4">
            <Link
              to="/about"
              className="inline-flex px-10 py-4 bg-transparent border-2 border-[#D4AF37] text-[#D4AF37] rounded-full text-sm font-bold tracking-widest items-center gap-3 transition-all duration-300 hover:bg-[#D4AF37] hover:text-black hover:scale-105"
            >
              Learn More About BlackBox
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Custom Styles */}
      <style jsx>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        
        .animate-scroll {
          animation: scroll 30s linear infinite;
        }
        
        .animate-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
};
