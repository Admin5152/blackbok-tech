import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Product, ProductImage } from '../types';
import { X, Plus, Minus, Heart, Share2, Star, Check, Truck, Shield, RefreshCw, ArrowLeft, Copy, Facebook, Twitter, MessageCircle, ChevronRight } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { ProductImageGallery } from '../components/product/ProductImageGallery';

interface ProductDetailProps {
  product: Product;
  relatedProducts: Product[];
  addToCart: (product: Product, options?: Record<string, string>, quantity?: number) => void;
  isWishlisted: boolean;
  onToggleWishlist: (productId: string) => void;
  navigateTo: (view: string, id?: string) => void;
  theme?: 'light' | 'dark';
}

export const ProductDetail: React.FC<ProductDetailProps> = ({
  product,
  relatedProducts,
  addToCart,
  isWishlisted,
  onToggleWishlist,
  navigateTo,
  theme
}) => {
  const isLight = theme === 'light';
  const [quantity, setQuantity] = useState(1);
  const normalizedVariants = useMemo(() => {
    const asAny = product as any;
    const groups: Array<{ name: string; options: string[] }> = [];

    if (Array.isArray(product?.variants) && product.variants.length > 0) {
      const grouped = product.variants
        .filter((v: any) => v?.name && Array.isArray(v?.options))
        .map((v: any) => ({ name: String(v.name), options: v.options.filter(Boolean) }));
      if (grouped.length > 0) return grouped;
    }

    if (Array.isArray(asAny.colors) && asAny.colors.length > 0) {
      groups.push({ name: 'Color', options: asAny.colors.filter(Boolean) });
    }
    if (Array.isArray(asAny.storage) && asAny.storage.length > 0) {
      groups.push({ name: 'Storage', options: asAny.storage.filter(Boolean) });
    }
    if (Array.isArray(asAny.ram) && asAny.ram.length > 0) {
      groups.push({ name: 'RAM', options: asAny.ram.filter(Boolean) });
    }
    return groups;
  }, [product]);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isReviewFormOpen, setIsReviewFormOpen] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    name: '',
    rating: 5,
    title: '',
    body: ''
  });
  const overviewRef = useRef<HTMLDivElement | null>(null);
  const specsRef = useRef<HTMLDivElement | null>(null);
  const reviewsRef = useRef<HTMLDivElement | null>(null);

  const mockReviews = [
    {
      id: 1,
      name: 'Kwame Asante',
      rating: 5,
      title: 'Exactly as described',
      body: 'Fantastic build quality and battery life. Feels brand new even though it is pre-owned. Would definitely buy from BlackBox again.',
      date: '2 days ago',
    },
    {
      id: 2,
      name: 'Ama Mensah',
      rating: 4,
      title: 'Great value for money',
      body: 'The device had a tiny cosmetic scratch but overall performance is smooth. Customer service walked me through setup.',
      date: '1 week ago',
    },
    {
      id: 3,
      name: 'Kojo Osei',
      rating: 5,
      title: 'Perfect for my workflow',
      body: 'Display is crisp, speakers are loud and the battery easily lasts a full day. Trade-in credit also helped a lot.',
      date: '3 weeks ago',
    },
  ];

  const averageRating =
    mockReviews.reduce((sum, r) => sum + r.rating, 0) / mockReviews.length;
  const totalReviews = mockReviews.length;

  useEffect(() => {
    const initial: Record<string, string> = {};
    normalizedVariants.forEach((variant) => {
      if (variant.options.length > 0) {
        initial[variant.name] = variant.options[0];
      }
    });
    setSelectedOptions(initial);
    setQuantity(1);
  }, [normalizedVariants, product.id]);

  const scrollTo = (ref: React.RefObject<HTMLElement | null>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleOptionChange = (variantName: string, option: string) => {
    setSelectedOptions(prev => ({
      ...prev,
      [variantName]: option
    }));
  };

  const handleAddToCart = () => {
    // Validate required variants are selected
    const requiredVariants = normalizedVariants.filter(v => v.name === 'Color' || v.name === 'Storage');
    const missingVariants = requiredVariants.filter(variant => !selectedOptions[variant.name]);
    
    if (missingVariants.length > 0) {
      alert(`Please select ${missingVariants.map(v => v.name.toLowerCase()).join(' and ')} before adding to cart`);
      return;
    }
    
    addToCart(product, selectedOptions, quantity);
  };

  const incrementQuantity = () => setQuantity(prev => Math.min(prev + 1, product.stock));
  const decrementQuantity = () => setQuantity(prev => Math.max(1, prev - 1));

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Review submitted:', reviewForm);
    // Here you would normally send to backend
    alert('Review submitted successfully!');
    setIsReviewFormOpen(false);
    setReviewForm({ name: '', rating: 5, title: '', body: '' });
  };

  const shareLinks = [
    { name: 'WhatsApp', icon: <MessageCircle size={24} />, color: 'bg-[#25D366]', url: `https://wa.me/?text=Check this out on BlackBox: ${product.name} - ${shareUrl}` },
    { name: 'Facebook', icon: <Facebook size={24} />, color: 'bg-[#1877F2]', url: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}` },
    { name: 'Twitter', icon: <Twitter size={24} />, color: 'bg-[#1DA1F2]', url: `https://twitter.com/intent/tweet?text=Check this out on BlackBox: ${product.name}&url=${shareUrl}` },
  ];

  return (
    <div className={`min-h-screen ${isLight ? 'bg-[#F5F5F7] text-[#1d1d1f]' : 'bg-[#060605] text-white'} pb-24`}>
      <div className="container mx-auto px-4 lg:px-8 py-10">

        {/* Breadcrumb */}
        <nav className="mb-8">
          <ol className="flex items-center space-x-2 text-sm text-white/60">
            <li>
              <button
                onClick={() => navigateTo('home')}
                className="flex items-center gap-1 hover:text-white transition-colors"
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
            </li>
            <li>/</li>
            <li><button onClick={() => navigateTo('store')} className="hover:text-white transition-colors">Store</button></li>
            <li>/</li>
            <li className="text-white">{product.name}</li>
          </ol>
        </nav>

        {/* Sticky in-page nav (mobile-first) */}
        <div className="sticky top-20 z-30 -mx-4 lg:mx-0 mb-10">
          <div className={`px-4 lg:px-0 py-2 border-b backdrop-blur-xl ${isLight ? 'border-black/5 bg-[#F5F5F7]/90' : 'border-white/10 bg-[#060605]/85'}`}>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <button
                onClick={() => scrollTo(overviewRef)}
                className={`shrink-0 px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-[0.35em] transition ${isLight ? 'bg-black/5 border-black/10 hover:bg-black/10 text-black' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'}`}
              >
                Overview
              </button>
              <button
                onClick={() => scrollTo(specsRef)}
                className={`shrink-0 px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-[0.35em] transition ${isLight ? 'bg-black/5 border-black/10 hover:bg-black/10 text-black' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'}`}
              >
                Specs
              </button>
              <button
                onClick={() => scrollTo(reviewsRef)}
                className={`shrink-0 px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-[0.35em] transition ${isLight ? 'bg-black/5 border-black/10 hover:bg-black/10 text-black' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'}`}
              >
                Reviews
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14">

          {/* Image Section */}
          <div className="relative">
            <ProductImageGallery
              images={(product.images ?? []) as ProductImage[]}
              fallbackUrl={product.image ?? product.image_url ?? null}
              productName={product.name}
              theme={theme}
            />

            {product.discount && (
              <div className="absolute top-6 left-6 z-10 bg-[#B38B21] text-black px-4 py-1 rounded-full text-sm font-bold shadow-lg pointer-events-none">
                -{product.discount}%
              </div>
            )}
          </div>

          {/* Info Section */}
          <div className="space-y-8">

            <div>
              <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight">
                {product.name}
              </h1>
              <p className="text-white/60 mt-2">{product.category}</p>
            </div>

            {/* Price */}
            <div className="flex items-center gap-5 flex-wrap">
              <span className="text-3xl font-bold text-[#B38B21]">
                ${product.discount
                  ? (product.price * (1 - product.discount / 100)).toFixed(2)
                  : product.price}
              </span>

              {product.discount && (
                <span className="text-lg text-white/40 line-through">
                  ${product.price}
                </span>
              )}

              {product.rating && (
                <div className="flex items-center gap-1 text-yellow-400">
                  <Star className="w-5 h-5 fill-yellow-400" />
                  <span className="text-white">{product.rating}</span>
                  <button
                    onClick={() => scrollTo(reviewsRef)}
                    className="text-white/40 text-sm hover:text-white/70 transition-colors"
                    aria-label="Jump to reviews"
                    type="button"
                  >
                    ({product.reviewCount})
                  </button>
                </div>
              )}
            </div>

            {/* Overview */}
            <div ref={overviewRef as any} className="pt-6">
              <h2 className="text-sm font-black uppercase tracking-[0.35em] text-[#B38B21] mb-4">Overview</h2>
              <p className="text-white/80 leading-relaxed max-w-xl text-lg font-medium">
                {product.description || "Experience premium technology crafted for excellence. This unit features industry-leading performance and stunning design."}
              </p>
            </div>

            {normalizedVariants.length > 0 && (
              <div className="space-y-6">
                {normalizedVariants.map((variant) => (
                  <div key={variant.name}>
                    <h3 className="text-lg font-bold text-white mb-4 uppercase tracking-wider">
                      {variant.name}
                    </h3>
                    <div className="flex flex-wrap gap-4">
                      {variant.options.map((option: string) => (
                        <button
                          key={option}
                          onClick={() => handleOptionChange(variant.name, option)}
                          className={`relative group transition-all duration-300 ${selectedOptions[variant.name] === option
                            ? 'scale-110'
                            : 'hover:scale-105'
                            }`}
                        >
                          {variant.name === 'Color' ? (
                            <div className="flex flex-col items-center gap-3">
                              <div
                                className={`w-12 h-12 rounded-full border-4 shadow-lg transition-all ${selectedOptions[variant.name] === option
                                  ? 'border-white ring-4 ring-[#B38B21]/30'
                                  : 'border-gray-300 hover:border-gray-200'
                                  }`}
                                style={{
                                  backgroundColor: option.toLowerCase() === 'black' ? '#000' :
                                    option.toLowerCase() === 'white' ? '#fff' :
                                      option.toLowerCase() === 'red' ? '#ef4444' :
                                        option.toLowerCase() === 'blue' ? '#3b82f6' :
                                          option.toLowerCase() === 'green' ? '#10b981' :
                                            option.toLowerCase() === 'yellow' ? '#eab308' :
                                              option.toLowerCase() === 'purple' ? '#a855f7' :
                                                option.toLowerCase() === 'pink' ? '#ec4899' :
                                                  option.toLowerCase() === 'gray' || option.toLowerCase() === 'grey' ? '#6b7280' :
                                                    option.toLowerCase() === 'silver' ? '#9ca3af' :
                                                      option.toLowerCase() === 'gold' || option.toLowerCase() === 'golden' ? '#f59e0b' :
                                                        '#6b7280'
                                }}
                              />
                              <span className={`text-sm font-medium transition-colors ${selectedOptions[variant.name] === option
                                ? 'text-[#B38B21]'
                                : 'text-white/60 group-hover:text-white/80'
                                }`}>
                                {option}
                              </span>
                              {selectedOptions[variant.name] === option && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#B38B21] rounded-full flex items-center justify-center">
                                  <div className="w-2 h-2 bg-white rounded-full"></div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className={`px-6 py-3 rounded-full border text-sm font-medium transition-all ${selectedOptions[variant.name] === option
                              ? 'border-[#B38B21] bg-[#B38B21]/20 text-[#B38B21] shadow-lg shadow-[#B38B21]/20'
                              : 'border-white/20 hover:border-white/40 hover:bg-white/5 text-white/80'
                              }`}>
                              {option}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quantity */}
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center border border-white/20 rounded-full overflow-hidden">
                <button
                  onClick={decrementQuantity}
                  className="px-4 py-2 hover:bg-white/10 transition"
                >
                  <Minus size={16} />
                </button>
                <span className="px-6">{quantity}</span>
                <button
                  onClick={incrementQuantity}
                  className="px-4 py-2 hover:bg-white/10 transition"
                >
                  <Plus size={16} />
                </button>
              </div>
              <span className="text-white/50 text-sm">
                {product.stock} available
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 sm:gap-4 flex-wrap">
              <button
                onClick={handleAddToCart}
                className="w-full sm:flex-1 sm:min-w-[200px] bg-[#B38B21] text-black font-bold py-4 rounded-full hover:opacity-90 transition shadow-lg"
              >
                Add to Cart
              </button>

              <button
                onClick={() => onToggleWishlist(product.id)}
                className={`p-4 rounded-full border transition ${isWishlisted
                  ? 'border-[#B38B21] text-[#B38B21] bg-[#B38B21]/10'
                  : 'border-white/20 hover:border-white/40'
                  }`}
              >
                <Heart size={20} className={isWishlisted ? 'fill-current' : ''} />
              </button>

              <button
                onClick={() => setIsShareModalOpen(true)}
                className="p-4 rounded-full border border-white/20 hover:border-white/40 transition group"
              >
                <Share2 size={20} className="group-hover:scale-110 transition-transform" />
              </button>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 pt-8 border-t border-white/10 text-center">
              <div>
                <Truck className="mx-auto mb-2 text-[#B38B21]" />
                <p className="text-xs text-white/60">Free Shipping</p>
              </div>
              <div>
                <Shield className="mx-auto mb-2 text-[#B38B21]" />
                <p className="text-xs text-white/60">1 Year Warranty</p>
              </div>
              <div>
                <RefreshCw className="mx-auto mb-2 text-[#B38B21]" />
                <p className="text-xs text-white/60">30 Day Returns</p>
              </div>
            </div>

            {/* Specs (anchor for navigation) */}
            <div ref={specsRef as any} className="pt-8 border-t border-white/10">
              <h2 className="text-sm font-black uppercase tracking-[0.35em] text-[#B38B21] mb-6">Specifications</h2>
              <ul className="space-y-4">
                {(product.specs && product.specs.length > 0 ? product.specs : [
                  "Premium Grade Materials & Construction",
                  "Optimized Power Management System",
                  "State-of-the-art Processing Capabilities",
                  "Enhanced Connectivity Features",
                  "12-Month Standard Warranty"
                ]).map((s, i) => (
                  <li key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                    <span className="mt-1 w-2 h-2 rounded-full bg-[#B38B21] shadow-[0_0_8px_rgba(179,139,33,0.5)] shrink-0" />
                    <span className="text-sm text-white/90 leading-relaxed font-bold tracking-wide">{s}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>

        {/* Reviews */}
        <div ref={reviewsRef as any} className="mt-16 border-t border-white/10 pt-12">
          <div className="flex items-end justify-between gap-6 flex-wrap">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold">Reviews</h2>
              <p className="text-sm text-white/50 mt-2">See what customers are saying about this product.</p>
            </div>
            {/* Review submission UI intentionally hidden until feature scope is approved */}
          </div>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 rounded-2xl border border-white/10 p-6 bg-black/30">
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-white/40">Overall rating</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="text-4xl font-extrabold text-[#B38B21]">
                  {averageRating.toFixed(1)}
                </div>
                <div>
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${i < Math.round(averageRating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-white/20'
                          }`}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-white/50 mt-1">
                    {totalReviews} reviews
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 rounded-2xl border border-white/10 p-6 bg-black/30">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-white/40">Review feed</p>
                <div className="flex gap-2">
                  <button className="px-3 py-2 rounded-full bg-white/10 border border-white/10 text-[9px] font-black uppercase tracking-widest">Top</button>
                  <button className="px-3 py-2 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-white/60 hover:text-white transition">Recent</button>
                </div>
              </div>
              <div className="mt-6">
                <div className="space-y-4">
                  {mockReviews.map((review) => (
                    <div
                      key={review.id}
                      className="rounded-2xl border border-white/10 bg-black/40 p-4 sm:p-5"
                    >
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {review.name}
                          </p>
                          <p className="text-[11px] text-white/40">
                            {review.date}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${i < review.rating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-white/15'
                                }`}
                            />
                          ))}
                          <span className="text-xs text-white/60 ml-1">
                            {review.rating}.0
                          </span>
                        </div>
                      </div>
                      <h3 className="mt-3 text-sm font-semibold text-white">
                        {review.title}
                      </h3>
                      <p className="mt-2 text-sm text-white/70 leading-relaxed">
                        {review.body}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-20 border-t border-white/10 pt-16">
            <div className="flex items-end justify-between mb-10 px-2">
              <div className="space-y-2">
                <h2 className="text-sm font-black uppercase tracking-[0.4em] text-[#B38B21]">Curated and Premium</h2>
                <h3 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase">Products You <span className="text-[#B38B21]">May Like</span></h3>
              </div>
              <button
                onClick={() => navigateTo('store')}
                className="hidden md:flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-[#B38B21] transition-colors"
                type="button"
              >
                View Collection <ChevronRight size={14} />
              </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8 pb-10">
              {relatedProducts.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  onClick={() => navigateTo('product', item.id)}
                  className={`group cursor-pointer rounded-[2rem] border transition-all duration-500 overflow-hidden ${isLight ? 'bg-white border-black/5 hover:border-black' : 'bg-white/5 border-white/5 hover:border-[#B38B21]/40 hover:bg-white/[0.08] shadow-2xl'}`}
                >
                  <div className="aspect-square overflow-hidden relative">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white">View Details ›</p>
                    </div>
                  </div>
                  <div className="p-6 space-y-2">
                    <p className={`text-[9px] font-black uppercase tracking-widest opacity-40 ${isLight ? 'text-black' : 'text-white'}`}>{item.category}</p>
                    <h3 className="font-bold text-sm tracking-tight truncate">{item.name}</h3>
                    <div className="flex items-center justify-between pt-2">
                      <p className="text-[#B38B21] font-black italic text-lg">{formatCurrency(item.price)}</p>
                      <button className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${isLight ? 'border-black/5 text-black hover:bg-black hover:text-white' : 'border-white/10 text-white/40 hover:border-[#B38B21] hover:text-[#B38B21]'}`}>
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="md:hidden flex justify-center pb-8">
              <button
                onClick={() => navigateTo('store')}
                className="px-8 py-3 rounded-full border border-white/10 text-[9px] font-black uppercase tracking-widest text-white/60"
                type="button"
              >
                Explore Full Catalog
              </button>
            </div>
          </div>
        )}
      </div>

      {/* YouTube Style Share Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setIsShareModalOpen(false)}
          />
          <div className="relative bg-[#1a1a1a] border border-white/10 w-full max-w-md rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <h3 className="text-lg font-bold tracking-tight">Share</h3>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="p-2 hover:bg-white/5 rounded-full transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Social Icons */}
            <div className="p-6">
              <div className="flex items-center justify-between gap-4 overflow-x-auto pb-4 no-scrollbar">
                {shareLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-2 group shrink-0"
                  >
                    <div className={`w-14 h-14 ${link.color} rounded-full flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                      {link.icon}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/60 group-hover:text-white transition-colors">
                      {link.name}
                    </span>
                  </a>
                ))}
              </div>

              {/* URL Copy Row */}
              <div className="mt-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3 ml-1">Copy Link</p>
                <div className="flex items-center gap-2 bg-black/50 border border-white/10 p-1.5 rounded-xl">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="flex-1 bg-transparent border-none text-[11px] font-medium text-white/80 px-3 focus:outline-none truncate"
                  />
                  <button
                    onClick={handleCopyLink}
                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${isCopied ? 'bg-emerald-500 text-white' : 'bg-[#CDA032] text-black hover:bg-[#B38B21]'}`}
                  >
                    {isCopied ? (
                      <span className="flex items-center gap-2"><Check size={12} /> Copied</span>
                    ) : (
                      'Copy'
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer / Hint */}
            <div className="bg-black/20 p-4 text-center">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/30 italic italic">
                Spread the word about blackbox premium
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Review Form Modal */}
      {isReviewFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setIsReviewFormOpen(false)}
          />
          <div className="relative bg-[#1a1a1a] border border-white/10 w-full max-w-lg rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <h3 className="text-lg font-bold tracking-tight">Write a Review</h3>
              <button
                onClick={() => setIsReviewFormOpen(false)}
                className="p-2 hover:bg-white/5 rounded-full transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Review Form */}
            <form onSubmit={handleReviewSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Your Name</label>
                <input
                  type="text"
                  required
                  value={reviewForm.name}
                  onChange={(e) => setReviewForm({...reviewForm, name: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#B38B21] transition-colors"
                  placeholder="Enter your name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewForm({...reviewForm, rating: star})}
                      className="text-2xl transition-colors"
                    >
                      <Star
                        className={`w-8 h-8 ${star <= reviewForm.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-white/20 hover:text-yellow-400/50'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Review Title</label>
                <input
                  type="text"
                  required
                  value={reviewForm.title}
                  onChange={(e) => setReviewForm({...reviewForm, title: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#B38B21] transition-colors"
                  placeholder="Summarize your experience"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Review</label>
                <textarea
                  required
                  value={reviewForm.body}
                  onChange={(e) => setReviewForm({...reviewForm, body: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#B38B21] transition-colors h-32 resize-none"
                  placeholder="Tell us about your experience with this product..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsReviewFormOpen(false)}
                  className="flex-1 px-4 py-3 bg-white/10 border border-white/10 rounded-lg text-white hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-[#B38B21] text-black rounded-lg font-medium hover:bg-[#D4AF37] transition-colors"
                >
                  Submit Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};