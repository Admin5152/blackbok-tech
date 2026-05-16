import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Product, ProductImage } from '../types';
import { X, Plus, Minus, Heart, Share2, Star, Check, Truck, Shield, RefreshCw, ArrowLeft, Copy, Facebook, Twitter, ChevronRight } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { ProductImageGallery } from '../components/product/ProductImageGallery';
import { ProductAvailabilityBadge } from '../components/ProductAvailabilityBadge';
import {
  getProductOptionGroups,
  defaultSelectedOptionsForProduct,
  snapSelectionToInStock,
  toOptionString,
  getAvailableStock,
} from '../lib/productOptions';
import { PageBackButton } from '../components/PageBackButton';

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
  const normalizedVariants = useMemo(() => getProductOptionGroups(product), [product]);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const availableStock = useMemo(
    () => getAvailableStock(product, selectedOptions),
    [product, selectedOptions],
  );
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
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
    setSelectedOptions(defaultSelectedOptionsForProduct(product));
    setQuantity(1);
  }, [normalizedVariants, product.id, product]);

  useEffect(() => {
    setQuantity((q) => Math.min(q, Math.max(1, availableStock || 1)));
  }, [availableStock]);

  const scrollTo = (ref: React.RefObject<HTMLElement | null>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleOptionChange = (variantName: string, option: string) => {
    setSelectedOptions((prev) =>
      snapSelectionToInStock(product, normalizedVariants, { ...prev, [variantName]: option }),
    );
  };

  const handleAddToCart = () => {
    if (availableStock <= 0) {
      window.alert('This configuration is out of stock.');
      return;
    }
    const resolved = snapSelectionToInStock(product, normalizedVariants, selectedOptions);
    addToCart(product, resolved, quantity);
  };

  const incrementQuantity = () => setQuantity((prev) => Math.min(prev + 1, Math.max(1, availableStock)));
  const decrementQuantity = () => setQuantity(prev => Math.max(1, prev - 1));

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Inline WhatsApp glyph — lucide-react ships generic message icons
  // (MessageCircle / MessageSquare) so we render the official mark
  // here as an SVG to match brand expectations (PDP-09).
  const WhatsAppIcon = ({ size = 24 }: { size?: number }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M20.52 3.48A11.86 11.86 0 0 0 12.04 0C5.5 0 .2 5.3.2 11.84a11.8 11.8 0 0 0 1.59 5.92L0 24l6.4-1.68a11.84 11.84 0 0 0 5.64 1.44h.01c6.54 0 11.84-5.3 11.84-11.84a11.8 11.8 0 0 0-3.37-8.44Zm-8.48 18.2h-.01a9.84 9.84 0 0 1-5.01-1.37l-.36-.21-3.79.99 1.01-3.69-.23-.38a9.83 9.83 0 0 1-1.5-5.18c0-5.43 4.42-9.84 9.86-9.84 2.63 0 5.1 1.03 6.96 2.88a9.78 9.78 0 0 1 2.88 6.96c0 5.43-4.42 9.84-9.86 9.84Zm5.4-7.36c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.66.15-.2.3-.76.96-.93 1.16-.17.2-.34.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.34.45-.51.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.66-1.6-.91-2.19-.24-.57-.48-.5-.66-.51-.17-.01-.37-.01-.57-.01-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.06 2.87 1.21 3.07.15.2 2.09 3.2 5.07 4.49.71.31 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.09 1.75-.71 2-1.4.25-.69.25-1.28.17-1.4-.08-.13-.27-.2-.57-.35Z" />
    </svg>
  );

  const shareLinks = [
    { name: 'WhatsApp', icon: <WhatsAppIcon size={24} />, color: 'bg-[#25D366]', url: `https://wa.me/?text=Check this out on BlackBox: ${product.name} - ${shareUrl}` },
    { name: 'Facebook', icon: <Facebook size={24} />, color: 'bg-[#1877F2]', url: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}` },
    { name: 'Twitter', icon: <Twitter size={24} />, color: 'bg-[#1DA1F2]', url: `https://twitter.com/intent/tweet?text=Check this out on BlackBox: ${product.name}&url=${shareUrl}` },
  ];

  return (
    <div className={`min-h-screen ${isLight ? 'bg-[#F5F5F7] text-[#1d1d1f]' : 'bg-[#060605] text-white'} pb-24`}>
      <div className="container mx-auto px-4 lg:px-8 py-10">

        {/* Breadcrumb */}
        <nav className="mb-8">
          <ol
            className={`flex items-center space-x-2 text-sm ${
              isLight ? 'text-black/50' : 'text-white/60'
            }`}
          >
            <li>
              <PageBackButton isLight={isLight} fallbackTo="/store" label="Back" />
            </li>
            <li className="hidden sm:inline">/</li>
            <li>
              <button
                type="button"
                onClick={() => navigateTo('store')}
                className={isLight ? 'hover:text-black transition-colors' : 'hover:text-white transition-colors'}
              >
                Store
              </button>
            </li>
            <li>/</li>
            <li className={isLight ? 'text-black font-medium truncate max-w-[min(28rem,55vw)]' : 'text-white truncate max-w-[min(28rem,55vw)]'}>
              {product.name}
            </li>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">

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

          {/* Info Section — tight vertical rhythm; options in one card */}
          <div className="space-y-5">

            <div className="space-y-1.5">
              <p className={`text-[10px] font-black uppercase tracking-[0.35em] ${isLight ? 'text-black/45' : 'text-white/45'}`}>
                {product.category}
              </p>
              <h1 className={`text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.1] ${isLight ? 'text-black' : 'text-white'}`}>
                {product.name}
              </h1>
            </div>

            {/* Price + rating */}
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-2xl sm:text-3xl font-bold text-[#B38B21]">
                ${product.discount
                  ? (product.price * (1 - product.discount / 100)).toFixed(2)
                  : product.price}
              </span>

              {product.discount && (
                <span className={`text-base line-through ${isLight ? 'text-black/35' : 'text-white/40'}`}>
                  ${product.price}
                </span>
              )}

              {product.rating && (
                <div className="flex items-center gap-1.5 text-yellow-400">
                  <Star className="w-5 h-5 fill-yellow-400 shrink-0" />
                  <span className={isLight ? 'text-black' : 'text-white'}>{product.rating}</span>
                  <button
                    onClick={() => scrollTo(reviewsRef)}
                    className={`text-sm transition-colors ${isLight ? 'text-black/40 hover:text-black/70' : 'text-white/40 hover:text-white/70'}`}
                    aria-label="Jump to reviews"
                    type="button"
                  >
                    ({product.reviewCount})
                  </button>
                </div>
              )}
            </div>

            {normalizedVariants.length > 0 && (
              <div
                className={`rounded-2xl border p-4 sm:p-5 space-y-3.5 ${
                  isLight ? 'border-black/10 bg-white shadow-sm' : 'border-white/10 bg-white/[0.03]'
                }`}
              >
                {normalizedVariants.map((variant) => {
                  const isColorGroup = variant.name.trim().toLowerCase() === 'color';
                  const sel = (selectedOptions[variant.name] || '').trim();
                  return (
                    <div key={variant.name} className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] shrink-0 ${isLight ? 'text-black/45' : 'text-white/45'}`}>
                          {variant.name}
                        </span>
                        {sel ? (
                          <span
                            className="text-xs font-bold text-[#B38B21] truncate text-right max-w-[58%]"
                            title={sel}
                          >
                            {sel}
                          </span>
                        ) : null}
                      </div>
                      <div className={`flex flex-wrap ${isColorGroup ? 'gap-2.5' : 'gap-2'}`}>
                        {variant.options.map((option, optIdx) => {
                          const opt = toOptionString(option);
                          const ol = opt.toLowerCase();
                          const isSelected = selectedOptions[variant.name] === opt;
                          const trialOpts = snapSelectionToInStock(product, normalizedVariants, {
                            ...selectedOptions,
                            [variant.name]: opt,
                          });
                          const optDisabled = getAvailableStock(product, trialOpts) <= 0;
                          if (isColorGroup) {
                            return (
                              <button
                                key={`${variant.name}-${optIdx}-${opt}`}
                                type="button"
                                disabled={optDisabled}
                                title={optDisabled ? `${opt} (out of stock)` : opt}
                                aria-label={`${variant.name}: ${opt}${isSelected ? ', selected' : ''}${optDisabled ? ', out of stock' : ''}`}
                                aria-pressed={isSelected}
                                onClick={() => !optDisabled && handleOptionChange(variant.name, opt)}
                                className={`relative shrink-0 w-10 h-10 rounded-full border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B38B21] ${
                                  isLight ? 'focus-visible:ring-offset-2 focus-visible:ring-offset-white' : 'focus-visible:ring-offset-2 focus-visible:ring-offset-[#060605]'
                                } ${ol === 'white' ? (isLight ? 'ring-1 ring-black/25' : 'ring-1 ring-white/30') : ''} ${
                                  optDisabled
                                    ? 'opacity-35 cursor-not-allowed'
                                    : isSelected
                                      ? 'border-[#B38B21] ring-2 ring-[#B38B21]/35 scale-[1.03]'
                                      : isLight
                                        ? 'border-black/20 hover:border-black/40'
                                        : 'border-white/30 hover:border-white/55'
                                }`}
                                style={{
                                  backgroundColor:
                                    ol === 'black'
                                      ? '#000'
                                      : ol === 'white'
                                        ? '#fff'
                                        : ol === 'red'
                                          ? '#ef4444'
                                          : ol === 'blue'
                                            ? '#3b82f6'
                                            : ol === 'green'
                                              ? '#10b981'
                                              : ol === 'yellow'
                                                ? '#eab308'
                                                : ol === 'purple'
                                                  ? '#a855f7'
                                                  : ol === 'pink'
                                                    ? '#ec4899'
                                                    : ol === 'gray' || ol === 'grey'
                                                      ? '#6b7280'
                                                      : ol === 'silver'
                                                        ? '#9ca3af'
                                                        : ol === 'gold' || ol === 'golden'
                                                          ? '#f59e0b'
                                                          : '#6b7280',
                                }}
                              />
                            );
                          }
                          return (
                            <button
                              key={`${variant.name}-${optIdx}-${opt}`}
                              type="button"
                              disabled={optDisabled}
                              onClick={() => !optDisabled && handleOptionChange(variant.name, opt)}
                              className={`shrink-0 min-w-[2.5rem] px-3.5 py-2 rounded-xl text-xs font-bold tracking-wide transition-all border ${
                                optDisabled
                                  ? 'opacity-35 cursor-not-allowed border-black/10'
                                  : isSelected
                                    ? 'border-[#B38B21] bg-[#B38B21]/15 text-[#B38B21]'
                                    : isLight
                                      ? 'border-black/15 bg-zinc-100 text-black/90 hover:border-black/30 hover:bg-zinc-200'
                                      : 'border-white/12 bg-white/[0.04] text-white/80 hover:border-white/28'
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Overview — after buy box so options + CTA stay above the fold */}
            <div ref={overviewRef as any} className="pt-1">
              <h2 className="text-sm font-black uppercase tracking-[0.35em] text-[#B38B21] mb-3">Overview</h2>
              {product.description ? (
                <p className={`leading-relaxed max-w-xl text-base sm:text-lg font-medium ${isLight ? 'text-black/80' : 'text-white/80'}`}>
                  {product.description}
                </p>
              ) : (
                <p className={`italic max-w-xl text-sm ${isLight ? 'text-black/40' : 'text-white/40'}`}>
                  No description has been added for this product yet.
                </p>
              )}
            </div>

            {/* Quantity */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:flex-wrap">
              <div
                className={`flex items-center rounded-full overflow-hidden border ${
                  isLight ? 'border-black/15 bg-white' : 'border-white/20'
                }`}
              >
                <button
                  type="button"
                  onClick={decrementQuantity}
                  className={`px-4 py-2 transition ${
                    isLight ? 'hover:bg-black/[0.06] text-black' : 'hover:bg-white/10 text-white'
                  }`}
                >
                  <Minus size={16} />
                </button>
                <span className={`px-6 tabular-nums ${isLight ? 'text-black font-semibold' : 'text-white'}`}>{quantity}</span>
                <button
                  type="button"
                  onClick={incrementQuantity}
                  disabled={quantity >= availableStock}
                  className={`px-4 py-2 transition ${
                    isLight ? 'hover:bg-black/[0.06] text-black' : 'hover:bg-white/10 text-white'
                  } disabled:opacity-30 disabled:pointer-events-none`}
                >
                  <Plus size={16} />
                </button>
              </div>
              <ProductAvailabilityBadge available={availableStock} isLight={isLight} />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 sm:gap-4 flex-wrap">
              <button
                onClick={handleAddToCart}
                disabled={availableStock <= 0}
                className="w-full sm:flex-1 sm:min-w-[200px] bg-[#B38B21] text-black font-bold py-4 rounded-full hover:opacity-90 transition shadow-lg disabled:opacity-40 disabled:pointer-events-none"
              >
                {availableStock <= 0 ? 'Out of stock' : 'Add to Cart'}
              </button>

              <button
                type="button"
                onClick={() => onToggleWishlist(product.id)}
                className={`p-4 rounded-full border transition ${isWishlisted
                  ? 'border-[#B38B21] text-[#B38B21] bg-[#B38B21]/10'
                  : isLight
                    ? 'border-black/15 text-black hover:border-black/30'
                    : 'border-white/20 hover:border-white/40 text-white'
                  }`}
              >
                <Heart size={20} className={isWishlisted ? 'fill-current' : ''} />
              </button>

              <button
                type="button"
                onClick={() => setIsShareModalOpen(true)}
                className={`p-4 rounded-full border transition group ${
                  isLight
                    ? 'border-black/15 text-black hover:border-black/30'
                    : 'border-white/20 hover:border-white/40 text-white'
                }`}
              >
                <Share2 size={20} className="group-hover:scale-110 transition-transform" />
              </button>
            </div>

            {/* Features */}
            <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-5 border-t text-center ${isLight ? 'border-black/10' : 'border-white/10'}`}>
              <div>
                <Truck className="mx-auto mb-2 text-[#B38B21]" />
                <p className={`text-xs ${isLight ? 'text-black/50' : 'text-white/60'}`}>Free Shipping</p>
              </div>
              <div>
                <Shield className="mx-auto mb-2 text-[#B38B21]" />
                <p className={`text-xs ${isLight ? 'text-black/50' : 'text-white/60'}`}>1 Year Warranty</p>
              </div>
              <div>
                <RefreshCw className="mx-auto mb-2 text-[#B38B21]" />
                <p className={`text-xs ${isLight ? 'text-black/50' : 'text-white/60'}`}>30 Day Returns</p>
              </div>
            </div>

            {/* Specs (anchor for navigation) */}
            <div ref={specsRef as any} className={`pt-8 border-t ${isLight ? 'border-black/10' : 'border-white/10'}`}>
              <h2 className="text-sm font-black uppercase tracking-[0.35em] text-[#B38B21] mb-6">Specifications</h2>
              {product.specs && product.specs.length > 0 ? (
                <ul className="space-y-4">
                  {product.specs.map((s, i) => (
                    <li
                      key={i}
                      className={`flex items-start gap-4 p-4 rounded-2xl border ${
                        isLight ? 'bg-white border-black/10' : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <span className="mt-1 w-2 h-2 rounded-full bg-[#B38B21] shadow-[0_0_8px_rgba(179,139,33,0.5)] shrink-0" />
                      <span
                        className={`text-sm leading-relaxed font-bold tracking-wide ${
                          isLight ? 'text-black/85' : 'text-white/90'
                        }`}
                      >
                        {s}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={`italic text-sm ${isLight ? 'text-black/45' : 'text-white/40'}`}>
                  No specifications have been added for this product yet.
                </p>
              )}
            </div>

          </div>
        </div>

        {/* Reviews */}
        <div ref={reviewsRef as any} className={`mt-16 border-t pt-12 ${isLight ? 'border-black/10' : 'border-white/10'}`}>
          <div className="flex items-end justify-between gap-6 flex-wrap">
            <div>
              <h2 className={`text-2xl sm:text-3xl font-bold ${isLight ? 'text-black' : 'text-white'}`}>Reviews</h2>
            </div>
            {/* Review submission UI intentionally hidden until feature scope is approved */}
          </div>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div
              className={`lg:col-span-1 rounded-2xl border p-6 ${
                isLight ? 'border-black/10 bg-white' : 'border-white/10 bg-black/30'
              }`}
            >
              <p className={`text-[10px] font-black uppercase tracking-[0.35em] ${isLight ? 'text-black/45' : 'text-white/40'}`}>
                Overall rating
              </p>
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
                          : isLight
                            ? 'text-black/15'
                            : 'text-white/20'
                          }`}
                      />
                    ))}
                  </div>
                  <p className={`text-sm mt-1 ${isLight ? 'text-black/50' : 'text-white/50'}`}>
                    {totalReviews} reviews
                  </p>
                </div>
              </div>
            </div>

            <div
              className={`lg:col-span-2 rounded-2xl border p-6 ${
                isLight ? 'border-black/10 bg-white' : 'border-white/10 bg-black/30'
              }`}
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className={`text-[10px] font-black uppercase tracking-[0.35em] ${isLight ? 'text-black/45' : 'text-white/40'}`}>
                  Review feed
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={`px-3 py-2 rounded-full border text-[9px] font-black uppercase tracking-widest ${
                      isLight ? 'bg-black/[0.06] border-black/10 text-black' : 'bg-white/10 border-white/10 text-white'
                    }`}
                  >
                    Top
                  </button>
                  <button
                    type="button"
                    className={`px-3 py-2 rounded-full border text-[9px] font-black uppercase tracking-widest transition ${
                      isLight
                        ? 'bg-black/[0.03] border-black/10 text-black/60 hover:text-black'
                        : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                    }`}
                  >
                    Recent
                  </button>
                </div>
              </div>
              <div className="mt-6">
                <div className="space-y-4">
                  {mockReviews.map((review) => (
                    <div
                      key={review.id}
                      className={`rounded-2xl border p-4 sm:p-5 ${
                        isLight ? 'border-black/10 bg-zinc-50' : 'border-white/10 bg-black/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <p className={`text-sm font-semibold ${isLight ? 'text-black' : 'text-white'}`}>
                            {review.name}
                          </p>
                          <p className={`text-[11px] ${isLight ? 'text-black/45' : 'text-white/40'}`}>
                            {review.date}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${i < review.rating
                                ? 'fill-yellow-400 text-yellow-400'
                                : isLight
                                  ? 'text-black/12'
                                  : 'text-white/15'
                                }`}
                            />
                          ))}
                          <span className={`text-xs ml-1 ${isLight ? 'text-black/55' : 'text-white/60'}`}>
                            {review.rating}.0
                          </span>
                        </div>
                      </div>
                      <h3 className={`mt-3 text-sm font-semibold ${isLight ? 'text-black' : 'text-white'}`}>
                        {review.title}
                      </h3>
                      <p className={`mt-2 text-sm leading-relaxed ${isLight ? 'text-black/75' : 'text-white/70'}`}>
                        {review.body}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Related items — belt-and-suspenders filter: even though
            the parent route already excludes the current product, the
            brief moment between local-cached and remote-fetched
            `product` (different IDs in some edge cases) was letting
            the current item leak into this list (PDP-16). */}
        {(() => {
          const visibleRelated = relatedProducts.filter(p => p.id !== product.id).slice(0, 4);
          if (visibleRelated.length === 0) return null;
          return (
          <div className={`mt-20 border-t pt-16 ${isLight ? 'border-black/10' : 'border-white/10'}`}>
            <div className="flex items-end justify-between mb-10 px-2">
              <div>
                <h2 className={`text-3xl md:text-4xl font-black italic tracking-tighter uppercase ${isLight ? 'text-black' : 'text-white'}`}>
                  Shop picks you <span className="text-[#B38B21]">may like</span>
                </h2>
              </div>
              <button
                onClick={() => navigateTo('store')}
                className={`hidden md:flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors ${
                  isLight ? 'text-black/45 hover:text-[#B38B21]' : 'text-white/40 hover:text-[#B38B21]'
                }`}
                type="button"
              >
                View Collection <ChevronRight size={14} />
              </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8 pb-10">
              {visibleRelated.map((item) => (
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
                className={`px-8 py-3 rounded-full border text-[9px] font-black uppercase tracking-widest ${
                  isLight ? 'border-black/15 text-black/70' : 'border-white/10 text-white/60'
                }`}
                type="button"
              >
                Explore Full Catalog
              </button>
            </div>
          </div>
          );
        })()}
      </div>

      {/* Share modal — explicit colors so light/dark page theme never leaves text on same tone as panel */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setIsShareModalOpen(false)}
          />
          <div
            className={`relative w-full max-w-md rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden border ${
              isLight
                ? 'bg-white border-black/10 text-[#1d1d1f]'
                : 'bg-[#141414] border-white/15 text-white'
            }`}
            role="dialog"
            aria-labelledby="share-modal-title"
          >
            <div
              className={`flex items-center justify-between p-4 border-b ${
                isLight ? 'border-black/10' : 'border-white/10'
              }`}
            >
              <h3 id="share-modal-title" className="text-lg font-bold tracking-tight">
                Share
              </h3>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className={`p-2 rounded-full transition-colors ${
                  isLight
                    ? 'text-black/70 hover:bg-black/5 hover:text-black'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

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
                    <div
                      className={`w-14 h-14 ${link.color} rounded-full flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}
                    >
                      {link.icon}
                    </div>
                    <span
                      className={`text-[10px] font-black uppercase tracking-widest transition-colors ${
                        isLight
                          ? 'text-black/55 group-hover:text-black'
                          : 'text-white/85 group-hover:text-white'
                      }`}
                    >
                      {link.name}
                    </span>
                  </a>
                ))}
              </div>

              <div className="mt-6">
                <p
                  className={`text-[10px] font-black uppercase tracking-widest mb-3 ml-1 ${
                    isLight ? 'text-black/45' : 'text-white/70'
                  }`}
                >
                  Copy link
                </p>
                <div
                  className={`flex items-center gap-2 p-1.5 rounded-xl border ${
                    isLight ? 'bg-[#f5f5f7] border-black/10' : 'bg-black/60 border-white/15'
                  }`}
                >
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className={`flex-1 min-w-0 bg-transparent border-none text-[12px] font-medium px-3 py-1.5 focus:outline-none truncate ${
                      isLight ? 'text-black placeholder:text-black/40' : 'text-white placeholder:text-white/40'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className={`shrink-0 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                      isCopied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#CDA032] text-black hover:bg-[#B38B21]'
                    }`}
                  >
                    {isCopied ? (
                      <span className="flex items-center gap-2">
                        <Check size={12} /> Copied
                      </span>
                    ) : (
                      'Copy'
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div
              className={`p-4 text-center border-t ${
                isLight ? 'bg-black/[0.03] border-black/8' : 'bg-black/40 border-white/10'
              }`}
            >
              <p
                className={`text-[9px] font-bold uppercase tracking-[0.2em] ${
                  isLight ? 'text-black/50' : 'text-white/60'
                }`}
              >
                Share this product from BlackBox
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};