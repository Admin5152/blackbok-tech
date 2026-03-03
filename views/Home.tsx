import React, { useState, useEffect } from 'react';
import { 
  ChevronRight, ArrowRight, Smartphone, Laptop as LaptopIcon, Gamepad2, Package, Settings, 
  Users, Award, TrendingUp, Star, Quote, ArrowLeftRight, Wrench, Mail, Phone, MapPin
} from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Product, Category } from '../types';
import { ProductCard } from '../components/ProductCard';
import { getImagesForTheme, getPositionClasses, getBlurClasses } from '../data/heroImages';

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
}

export const Home: React.FC<HomeProps> = ({ 
  products, setSelectedCategory, onQuickView, wishlist, toggleWishlist, onAddToCart, compareIds, onToggleCompare, user, theme
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
      img: "https://images.unsplash.com/photo-1722710682948-22b556b528ce", 
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
      img: "https://images.unsplash.com/photo-1606813907291-d86ebb9474ad", 
      icon: Gamepad2,
      products: products.filter(p => p.category === 'Gaming').slice(0, 3)
    },
    { 
      name: "Accessories" as Category, 
      desc: "Premium accessories and tech essentials", 
      img: "https://images.unsplash.com/photo-1556656793-062ff987b50d", 
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
      <section className="relative h-[100svh] flex items-start justify-center pt-24 sm:pt-28 lg:pt-32 pb-6 px-4 sm:px-6 lg:px-8 overflow-hidden">
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
                  className={`absolute inset-0 w-full h-full object-cover object-center transition-all duration-2000 ease-in-out ${
                    index === currentImageIndex 
                      ? 'opacity-100 scale-100' 
                      : 'opacity-0 scale-105'
                  }`}
                  style={{ 
                    filter: `${
                      theme === 'light' && img.filename === 'BlackBox.jpeg' ? 'invert(1) brightness(1.2)' : ''
                    }`,
                    transform: index === currentImageIndex ? 'scale(1)' : 'scale(1.1)'
                  }}
                  loading="lazy"
                />
              ))}
            </div>
          )}
          
          {/* Dark overlay for text readability */}
          <div className={`absolute inset-0 ${
            theme === 'dark' 
              ? 'bg-gradient-to-r from-black/60 via-transparent to-black/40' 
              : 'bg-gradient-to-r from-black/20 via-transparent to-black/10'
          }`}></div>
        </div>

        <div className="max-w-7xl mx-auto w-full relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Side - Main Content */}
            <div className="space-y-8 animate-in fade-in slide-in-from-left-10 duration-1000 stagger-1">
              <h1 className={`text-5xl md:text-7xl lg:text-[5rem] font-heading font-bold tracking-wider leading-[0.9] ${
          theme === 'dark' ? 'text-off-white' : 'text-gray-900'
        }`}>
                Redefining Your
                <br />
                <span className={`bg-gradient-to-r bg-clip-text text-transparent ${
                  theme === 'dark' 
                    ? 'from-[#D4AF37] to-[#F4E4C1]' 
                    : 'from-[#B38B21] to-[#D4AF37]'
                }`}>
                  Tech Experience
                </span>
              </h1>
              
              <div className="space-y-4 max-w-lg animate-in fade-in slide-in-from-left-8 duration-1000 delay-100 stagger-2">
                <p className={`text-lg font-light leading-relaxed ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Premium tech products, expert repairs, and seamless trade-ins for the modern enthusiast.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4 animate-in fade-in slide-in-from-left-8 duration-1000 delay-200 stagger-3">
                <Link 
                  to="/store" 
                  className={`btn-press inline-flex px-12 py-5 rounded-full text-sm font-heading font-semibold tracking-wider items-center gap-3 transition-all duration-300 hover:scale-105 hover:shadow-[0_20px_60px_rgba(255,255,255,0.3)] active:scale-95 ${
                    theme === 'dark' 
                      ? 'bg-white text-black hover:shadow-[0_20px_60px_rgba(255,255,255,0.3)]' 
                      : 'bg-black text-white hover:shadow-[0_20px_60px_rgba(0,0,0,0.2)]'
                  }`}
                >
                  Browse Products 
                  <ArrowRight className="transition-transform group-hover:translate-x-2" size={18} />
                </Link>
                
                <Link 
                  to="/profile" 
                  className={`btn-press inline-flex px-12 py-5 rounded-full text-sm font-heading font-semibold tracking-wider items-center gap-3 transition-all duration-300 hover:scale-105 active:scale-95 ${
                    theme === 'dark'
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
              Discover our curated selection of premium tech products
            </p>
            <div className="flex justify-center items-center gap-2 mt-4">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-red-500 font-heading font-semibold tracking-wider">LIMITED STOCK</span>
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
      <section className="py-24 px-8 bg-gradient-to-b from-black to-gray-950 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center opacity-5">
          <Settings size={400} className="text-[#D4AF37]" />
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <h2 className="text-4xl md:text-5xl font-heading font-bold text-white tracking-wider">
                Expert Repair Services
              </h2>
              <div className="w-24 h-0.5 bg-[#D4AF37]"></div>
              
              <div className="space-y-6">
                <p className="text-lg text-gray-300 leading-relaxed">
                  KNUST-certified diagnostics with precision circuit mapping.
                </p>
                <p className="text-gray-400">
                  Genuine parts, industry standards, certified technicians.
                </p>
              </div>

              <Link 
                to="/repair"
                className="inline-flex px-12 py-5 bg-[#D4AF37] text-black rounded-full text-sm font-heading font-semibold tracking-wider items-center gap-3 transition-all duration-300 hover:scale-105 hover:shadow-[0_20px_60px_rgba(212,175,55,0.4)] active:scale-95"
              >
                Schedule Repair
                <Wrench size={18} />
              </Link>
            </div>

            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1517336714467-d13a2323485d" 
                className="rounded-2xl w-full object-cover aspect-video"
                alt="Repair Service"
              />
            </div>
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section className="py-24 px-8 bg-black">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <h2 className="text-4xl md:text-5xl font-heading font-bold text-white tracking-wider">
                We Are BlackBox
              </h2>
              <div className="w-24 h-0.5 bg-[#D4AF37]"></div>
              
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-2xl font-heading font-semibold text-[#D4AF37]">Our Mission</h3>
                  <p className="text-gray-300 leading-relaxed">
                    We care about you and your devices, treating each with precision and respect.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-2xl font-heading font-semibold text-[#D4AF37]">Our Vision</h3>
                  <p className="text-gray-300 leading-relaxed">
                    Your reliable home for innovation, keeping you ahead with the latest tech improvements.
                  </p>
                </div>

                <p className="text-xl text-off-white font-heading font-medium">
                  BlackBox - Your Tech Partner
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link 
                  to="/profile"
                  className="inline-flex px-8 py-3 border-2 border-[#D4AF37] text-[#D4AF37] rounded-full text-sm font-heading font-semibold tracking-wider items-center gap-2 transition-all duration-300 hover:bg-[#D4AF37] hover:text-black"
                >
                  <Mail size={16} />
                  Get in Touch
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-[#D4AF37]/10 to-transparent rounded-2xl flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="w-24 h-24 bg-[#D4AF37] rounded-full flex items-center justify-center mx-auto">
                    <Package size={48} className="text-black" />
                  </div>
                  <h3 className="text-2xl font-heading font-bold text-white">BlackBox</h3>
                  <p className="text-gray-400">Premium Tech Repository</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Us Section */}
      <section className="py-24 px-8 bg-gradient-to-b from-gray-950 to-black">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-heading font-bold text-white tracking-wider mb-4">
              Trusted by Thousands
            </h2>
            <div className="w-32 h-0.5 bg-[#D4AF37] mx-auto mb-6"></div>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-8">
              Join our community of satisfied customers who trust BlackBox for their tech needs
            </p>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="text-center space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 stagger-1">
              <div className="text-4xl md:text-5xl font-heading font-bold text-[#D4AF37]">
                10,000+
              </div>
              <p className="text-gray-400 font-heading tracking-wide">Satisfied Customers Since 2019</p>
              <div className="flex justify-center gap-1 mt-2">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={12} className="text-[#D4AF37] fill-current" />
                ))}
              </div>
            </div>
            <div className="text-center space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100 stagger-2">
              <div className="text-4xl md:text-5xl font-heading font-bold text-[#D4AF37]">
                5+
              </div>
              <p className="text-gray-400 font-heading tracking-wide">Years of Excellence</p>
              <p className="text-sm text-gray-500">KNUST Certified</p>
            </div>
            <div className="text-center space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200 stagger-3">
              <div className="text-4xl md:text-5xl font-heading font-bold text-[#D4AF37]">
                98%
              </div>
              <p className="text-gray-400 font-heading tracking-wide">Customer Recommendation Rate</p>
              <p className="text-sm text-gray-500">Industry Leading</p>
            </div>
          </div>

          {/* Customer Reviews Carousel */}
          <div className="carousel-container relative md:overflow-hidden overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory">
            <div className="home-reviews-track flex space-x-6 md:transition-transform md:duration-700 md:ease-out" style={{ transform: `translateX(-${currentReviewIndex * 336}px)` }}>
              {[...customerReviews, ...customerReviews].map((review, index) => (
                <div 
                  key={index}
                  className="flex-shrink-0 w-80 review-card rounded-2xl p-6 snap-start"
                >
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(review.rating)].map((_, i) => (
                      <Star key={i} size={18} className="text-[#D4AF37] fill-current" />
                    ))}
                  </div>
                  <Quote className="text-[#D4AF37]/20 mb-4" size={28} />
                  <p className="text-gray-300 mb-4 leading-relaxed text-lg">
                    "{review.text}"
                  </p>
                  <p className="text-off-white font-modern font-semibold text-lg">
                    {review.name}
                  </p>
                </div>
              ))}
            </div>
            
            {/* Manual Navigation Controls */}
            <button 
              className="carousel-btn prev hidden md:flex"
              onClick={() => setCurrentReviewIndex((prev) => (prev === 0 ? customerReviews.length - 1 : prev - 1))}
              aria-label="Previous review"
            >
              <ChevronRight size={24} className="text-black rotate-180" />
            </button>
            
            <button 
              className="carousel-btn next hidden md:flex"
              onClick={() => setCurrentReviewIndex((prev) => (prev === customerReviews.length - 1 ? 0 : prev + 1))}
              aria-label="Next review"
            >
              <ChevronRight size={24} className="text-black" />
            </button>
          </div>
          
          {/* Carousel Dots */}
          <div className="carousel-dots">
            {customerReviews.map((_, index) => (
              <button
                key={index}
                className={`carousel-dot ${index === currentReviewIndex ? 'active' : ''}`}
                onClick={() => setCurrentReviewIndex(index)}
                aria-label={`Go to review ${index + 1}`}
              />
            ))}
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
