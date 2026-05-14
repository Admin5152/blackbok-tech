import React, { useState, useMemo, useEffect } from 'react';
import {
  ChevronRight, ChevronLeft, ArrowRight, Settings,
  Users, Award, TrendingUp, Star, Quote, ArrowLeftRight, Wrench, Mail, Phone, MapPin, Heart, Eye
} from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Product, Category } from '../types';
import { HERO_COLLAGE_FILENAMES, getImagesForTheme } from '../data/heroImages';
import { formatCurrency } from '../lib/utils';
import { ShoppingCart } from 'lucide-react';

/** Editorial overlap positions (sizes bumped so flyers fill the hero). Rotation = CSS animation per tile. */
const HERO_COLLAGE_FRAMES = [
  'left-[-8%] top-[2%] z-[2] w-[min(58vw,19rem)] sm:left-[-2%] sm:w-[min(50vw,24rem)] lg:w-[min(38vw,28rem)] xl:w-[min(34vw,32rem)]',
  'left-[6%] top-[0%] z-[4] w-[min(60vw,19rem)] sm:left-[12%] sm:w-[min(52vw,26rem)] lg:w-[min(40vw,30rem)] xl:w-[min(36vw,34rem)]',
  'right-[-10%] top-[-4%] z-[3] w-[min(62vw,19rem)] sm:right-[-6%] sm:w-[min(54vw,28rem)] lg:w-[min(42vw,32rem)] xl:w-[min(38vw,36rem)]',
  'left-[-6%] bottom-[-2%] z-[5] w-[min(54vw,17rem)] sm:left-[-1%] sm:w-[min(48vw,22rem)] lg:w-[min(36vw,26rem)] xl:w-[min(32vw,30rem)]',
  'left-[18%] bottom-[-4%] z-[6] w-[min(58vw,18rem)] sm:left-[22%] sm:w-[min(52vw,26rem)] lg:w-[min(40vw,30rem)] xl:w-[min(36vw,34rem)]',
  'right-[-8%] bottom-[-2%] z-[7] w-[min(60vw,18rem)] sm:right-[-4%] sm:w-[min(52vw,28rem)] lg:w-[min(42vw,32rem)] xl:w-[min(38vw,36rem)]',
] as const;

const HERO_COLLAGE_ANIM_CLASSES = [
  'bb-hero-collage-anim-0',
  'bb-hero-collage-anim-1',
  'bb-hero-collage-anim-2',
  'bb-hero-collage-anim-3',
  'bb-hero-collage-anim-4',
  'bb-hero-collage-anim-5',
] as const;

interface HomeProps {
  products: Product[];
  setSelectedCategory?: (cat: Category | 'All') => void;
  onQuickView: (product: Product) => void;
  wishlist: string[];
  toggleWishlist: (productId: string) => void;
  onAddToCart: (p: Product, options?: Record<string, string>, qty?: number) => void;
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
  const [exploreFilter, setExploreFilter] = useState<'All Gear' | 'Pro Series' | 'Essentials'>('All Gear');

  const [currentHighlightsIndex, setCurrentHighlightsIndex] = useState(0);
  const [heroSlide, setHeroSlide] = useState(0);

  const heroImageFilenames = useMemo(() => {
    const list = getImagesForTheme(theme).map((img) => img.filename);
    return list.length > 0 ? list : [...HERO_COLLAGE_FILENAMES];
  }, [theme]);

  const heroSlideCount = heroImageFilenames.length;

  useEffect(() => {
    setHeroSlide(0);
  }, [heroSlideCount, theme]);

  useEffect(() => {
    if (heroSlideCount <= 1) return;
    const id = window.setInterval(() => {
      setHeroSlide((s) => (s + 1) % heroSlideCount);
    }, 6800);
    return () => window.clearInterval(id);
  }, [heroSlideCount, heroSlide]);

  const goHeroPrev = () => {
    if (heroSlideCount <= 1) return;
    setHeroSlide((s) => (s - 1 + heroSlideCount) % heroSlideCount);
  };

  const goHeroNext = () => {
    if (heroSlideCount <= 1) return;
    setHeroSlide((s) => (s + 1) % heroSlideCount);
  };

  // Defensive category matcher — covers DB rows that didn't get
  // normalized (e.g. "Mobile Phones", "Laptops & Notebooks"). Order
  // matters: more specific matches first.
  const matchesCategory = (productCategory: string | undefined, target: Category): boolean => {
    if (!productCategory) return false;
    const value = String(productCategory).trim().toLowerCase();
    switch (target) {
      case 'iPhone':
        return value === 'iphone' || value.includes('iphone') || value.includes('phone') || value.includes('mobile') || value.includes('smartphone');
      case 'Laptop':
        return value === 'laptop' || value.includes('laptop') || value.includes('notebook') || value.includes('macbook') || value.includes('computer');
      case 'Accessories':
        return value === 'accessories' || value.includes('accessor') || value.includes('case') || value.includes('wearable') || value.includes('charger') || value.includes('cable');
      case 'Gaming':
        return value === 'gaming' || value.includes('gam') || value.includes('console');
      case 'Audio':
        return value === 'audio' || value.includes('audio') || value.includes('headphone') || value.includes('earbud') || value.includes('speaker');
      default:
        return productCategory === target;
    }
  };

  // Featured Arrivals: explicit boolean coercion so `null`/`undefined`/`'false'`
  // (Postgres returns booleans as JS booleans normally, but be safe) don't
  // accidentally read as truthy.
  const featuredProducts = useMemo(
    () => products.filter(p => Boolean((p as any).featured)),
    [products]
  );

  const featuredSliderProducts = useMemo(() => {
    if (featuredProducts.length > 0) return featuredProducts.slice(0, 12);
    return products.slice(0, 12);
  }, [products, featuredProducts]);

  const highlights = useMemo(() => {
    const combined = [...featuredProducts, ...products.filter(p => !featuredProducts.find(f => f.id === p.id))];
    return combined
      .filter(p => matchesCategory(p.category, 'Accessories') || matchesCategory(p.category, 'Gaming') || matchesCategory(p.category, 'Audio') || matchesCategory(p.category, 'iPhone'))
      .slice(0, 10);
  }, [products, featuredProducts]);

  const nextHighlight = () => setCurrentHighlightsIndex((prev) => (prev + 1) % highlights.length);
  const prevHighlight = () => setCurrentHighlightsIndex((prev) => (prev - 1 + highlights.length) % highlights.length);

  if (!products || products.length === 0) return null;

  const customerReviews = [
    { name: "Kwame Asante", text: "Excellent service and quality products. BlackBox is my go-to for all tech needs.", rating: 5 },
    { name: "Ama Mensah", text: "Professional repair service and fair trade-in values. Highly recommended!", rating: 5 },
    { name: "Kojo Osei", text: "Great customer service and authentic products. The best tech store in Kumasi.", rating: 5 },
    { name: "Yaa Boakye", text: "Fast repairs and reasonable prices. I'm very satisfied with their service.", rating: 5 },
    { name: "Kwame Boateng", text: "Amazing experience! Got exactly what I needed at a great price.", rating: 5 }
  ];

  return (
    <div className="view-transition w-full min-w-0 overflow-hidden bg-black no-print">
      {/* Main Content */}
      {/* Hero — collage + headline; box CTAs; slider */}
      <section className="relative min-h-hero-viewport w-full min-w-0 overflow-hidden bg-[#030303]">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_40%,#12121a_0%,#030303_55%,#000000_100%)]" aria-hidden />

        <div className="absolute inset-0 z-[1] overflow-hidden min-h-[100%]">
          {HERO_COLLAGE_FRAMES.map((_, i) => {
            const filename = heroImageFilenames[(heroSlide + i) % heroSlideCount];
            return (
              <div key={i} className={`pointer-events-none absolute ${HERO_COLLAGE_FRAMES[i]}`}>
                <div className={`bb-hero-collage-motion w-full ${HERO_COLLAGE_ANIM_CLASSES[i]}`}>
                  <div className="aspect-[3/4] w-full overflow-hidden rounded-md border border-white/[0.08] bg-[#0a0a0a] shadow-[0_28px_70px_rgba(0,0,0,0.92)] ring-1 ring-inset ring-white/[0.05] sm:rounded-lg">
                    <img
                      key={`${heroSlide}-tile-${i}`}
                      src={`/${filename}`}
                      alt=""
                      aria-hidden
                      className="bb-hero-tile-reveal h-full w-full min-h-full min-w-full object-cover object-center"
                      style={{
                        animationDelay: `${i * 36}ms`,
                        filter: theme === 'light' && filename === 'BlackBox.jpeg' ? 'invert(1) brightness(1.2)' : undefined
                      }}
                      loading={i < 2 ? 'eager' : 'lazy'}
                      decoding="async"
                      sizes="(max-width: 640px) 55vw, 38vw"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div
          className="pointer-events-none absolute inset-0 z-[8] bg-gradient-to-b from-black/85 via-black/45 to-black/90 sm:from-black/75 sm:via-black/35 sm:to-black/85"
          aria-hidden
        />

        {heroSlideCount > 1 && (
          <>
            <button
              type="button"
              onClick={goHeroPrev}
              className="absolute left-2 top-1/2 z-[22] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg border border-white/25 bg-black/45 text-white shadow-lg backdrop-blur-md transition-colors duration-200 hover:border-white/40 hover:bg-black/65 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 sm:left-4 sm:h-12 sm:w-12 md:left-6 lg:h-14 lg:w-14"
              aria-label="Previous hero images"
            >
              <ChevronLeft className="h-6 w-6 lg:h-7 lg:w-7" strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={goHeroNext}
              className="absolute right-2 top-1/2 z-[22] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg border border-white/25 bg-black/45 text-white shadow-lg backdrop-blur-md transition-colors duration-200 hover:border-white/40 hover:bg-black/65 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 sm:right-4 sm:h-12 sm:w-12 md:right-6 lg:h-14 lg:w-14"
              aria-label="Next hero images"
            >
              <ChevronRight className="h-6 w-6 lg:h-7 lg:w-7" strokeWidth={2} />
            </button>
          </>
        )}

        <div className="relative z-20 flex min-h-hero-viewport w-full flex-col justify-end px-4 pb-12 pt-24 sm:px-6 sm:pb-10 sm:pt-28 md:pb-12">
          <div className="mx-auto flex w-full max-w-lg flex-col gap-5 sm:max-w-xl sm:gap-6">
            <div className="mx-auto w-full max-w-[min(100%,20rem)] text-center max-sm:-translate-y-2 sm:max-w-2xl sm:translate-y-0 md:max-w-3xl">
              <h1 className="font-heading text-balance text-3xl font-bold leading-[1.12] tracking-tight text-off-white drop-shadow-[0_2px_20px_rgba(0,0,0,0.85)] sm:text-4xl sm:leading-tight md:text-5xl">
                <span className="block sm:inline">Redefining Your</span>{' '}
                <span className="block sm:inline">
                  <span className="bg-gradient-to-r bg-clip-text text-transparent from-[#D4AF37] to-[#F4E4C1]">
                    Tech Experience
                  </span>
                </span>
              </h1>
              <p className="mx-auto mt-3 max-w-[min(100%,22rem)] text-pretty text-sm font-light leading-relaxed text-gray-200/95 drop-shadow-[0_1px_12px_rgba(0,0,0,0.75)] sm:mt-4 sm:max-w-lg sm:text-base md:text-lg">
                Premium tech products, expert repairs, and seamless trade-ins for the modern enthusiast.
              </p>
            </div>

            {/* Shop + About — box buttons */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <Link
                to="/store"
                className={`btn-press inline-flex min-h-[3.25rem] flex-1 items-center justify-center gap-3 rounded-lg border-2 border-transparent px-8 py-4 text-center text-sm font-heading font-semibold tracking-wider transition-all duration-300 hover:scale-[1.01] hover:shadow-lg active:scale-[0.99] sm:px-10 sm:py-5 ${theme === 'dark'
                  ? 'bg-white text-black hover:border-black/10 hover:shadow-white/20'
                  : 'bg-white text-black hover:border-black/10 hover:shadow-black/10'
                  }`}
              >
                Browse Products
                <ArrowRight className="shrink-0 transition-transform group-hover:translate-x-1" size={18} />
              </Link>

              <Link
                to="/about"
                className="btn-press inline-flex min-h-[3.25rem] flex-1 items-center justify-center gap-3 rounded-lg border-2 border-white/90 bg-black/55 px-8 py-4 text-center text-sm font-heading font-semibold tracking-wider text-off-white shadow-lg backdrop-blur-md transition-all duration-300 hover:scale-[1.01] hover:border-white hover:bg-black/70 active:scale-[0.99] sm:px-10 sm:py-5"
              >
                About Us
                <ArrowRight className="shrink-0 transition-transform group-hover:translate-x-1" size={18} />
              </Link>
            </div>

            {/* Dot indicators — no panel; blends into hero */}
            {heroSlideCount > 1 && (
              <div className="flex justify-center pt-1">
                <div
                  className="no-scrollbar flex max-w-full flex-wrap items-center justify-center gap-2 overflow-x-auto py-2 sm:gap-2.5"
                  role="tablist"
                  aria-label="Hero image slides"
                >
                  {heroImageFilenames.map((_, d) => (
                    <button
                      key={d}
                      type="button"
                      role="tab"
                      aria-selected={heroSlide === d}
                      aria-label={`Go to slide ${d + 1} of ${heroSlideCount}`}
                      onClick={() => setHeroSlide(d)}
                      className={`h-2 shrink-0 rounded-full transition-all duration-500 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${heroSlide === d ? 'w-8 bg-white/95' : 'w-2 bg-white/30 hover:bg-white/50'
                        }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Featured Products — horizontal scroll + quick view (same pattern as accessories / laptop) */}
      <section className={`section-connector py-6 md:py-10 overflow-hidden ${theme === 'dark' ? 'bg-gradient-to-b from-black to-gray-950' : 'bg-white'}`}>
        <div className="max-w-screen-2xl mx-auto">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6 px-4 md:px-8">
            <div className="min-w-0">
              <h2 className={`text-3xl md:text-4xl font-heading font-bold tracking-wider ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                Featured Products
              </h2>
              <p className={`text-sm md:text-base mt-1 max-w-xl ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Curated picks — scroll, tap a card or the eye icon for a quick look.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => document.getElementById('featured-products-slider')?.scrollBy({ left: -400, behavior: 'smooth' })}
                className={`w-12 h-12 rounded-full border flex items-center justify-center transition-colors ${theme === 'dark' ? 'border-white/20 text-white hover:bg-white hover:text-black' : 'border-black/20 text-black hover:bg-black hover:text-white'}`}
                aria-label="Scroll featured products left"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                type="button"
                onClick={() => document.getElementById('featured-products-slider')?.scrollBy({ left: 400, behavior: 'smooth' })}
                className={`w-12 h-12 rounded-full border flex items-center justify-center transition-colors ${theme === 'dark' ? 'border-white/20 text-white hover:bg-white hover:text-black' : 'border-black/20 text-black hover:bg-black hover:text-white'}`}
                aria-label="Scroll featured products right"
              >
                <ChevronRight size={24} />
              </button>
            </div>
          </div>

          <div
            id="featured-products-slider"
            className="flex items-center gap-4 md:gap-6 overflow-x-auto no-scrollbar snap-x snap-mandatory px-4 md:px-8 pb-8"
            style={{ scrollPaddingLeft: 'max(1rem, env(safe-area-inset-left))' }}
          >
            <div className={`w-[300px] md:w-[400px] min-h-[400px] md:min-h-[500px] ${theme === 'dark' ? 'bg-[#111]' : 'bg-[#f5f5f7]'} ${theme === 'dark' ? 'text-white' : 'text-black'} p-8 md:p-12 rounded-[2rem] flex flex-col justify-between snap-start flex-shrink-0 shadow-sm border border-black/5 dark:border-white/5`}>
              <div>
                <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">Featured picks</h2>
                <p className={`text-lg md:text-xl ${theme === 'dark' ? 'text-white/70' : 'text-black/70'}`}>
                  Staff favorites and new arrivals.<br />Same quick-view flow as the rows below.
                </p>
              </div>
              <div className="flex justify-center mt-8">
                <img src="/iPhone.jpeg" alt="" className="h-40 md:h-56 w-40 md:w-56 object-cover rounded-2xl drop-shadow-xl" />
              </div>
            </div>

            {featuredSliderProducts.map((p) => (
              <div
                key={p.id}
                role="button"
                tabIndex={0}
                onClick={() => onQuickView(p)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onQuickView(p);
                  }
                }}
                className={`w-[260px] md:w-[300px] h-[360px] md:h-[420px] rounded-[2rem] snap-start flex-shrink-0 flex flex-col group cursor-pointer overflow-hidden relative shadow-lg ${theme === 'dark' ? 'bg-[#111]' : 'bg-[#ffffff]'}`}
              >
                <div className="pointer-events-none absolute inset-0 z-10">
                  <div className={`absolute bottom-2 left-2 w-12 h-12 border-b-2 border-l-2 rounded-bl-[1.5rem] transition-colors ${theme === 'dark' ? 'border-white/20' : 'border-[#B38B21]/40'}`} />
                  <div className={`absolute bottom-2 right-2 w-12 h-12 border-b-2 border-r-2 rounded-br-[1.5rem] transition-colors ${theme === 'dark' ? 'border-white/20' : 'border-[#B38B21]/40'}`} />
                </div>

                <div className="absolute top-0 inset-x-0 h-[60%] pt-8 px-8 transform group-hover:scale-105 transition-transform duration-700 flex items-center justify-center">
                  <img src={p.image} alt={p.name} className="w-full h-full object-contain filter drop-shadow-lg" />
                </div>

                <button
                  type="button"
                  aria-label={`Quick view ${p.name}`}
                  title="Quick view"
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuickView(p);
                  }}
                  className={`absolute top-4 right-4 z-30 flex h-11 w-11 items-center justify-center rounded-full border shadow-lg backdrop-blur-md transition-all hover:scale-105 active:scale-95 ${theme === 'dark'
                    ? 'border-white/25 bg-black/55 text-white hover:bg-[#CDA032] hover:text-black hover:border-transparent'
                    : 'border-black/12 bg-white/90 text-black hover:bg-[#CDA032] hover:border-transparent'
                    }`}
                >
                  <Eye size={18} strokeWidth={2.25} />
                </button>

                <div className="absolute inset-x-0 bottom-0 p-6 flex flex-col z-20 bg-gradient-to-t from-black/5 to-transparent dark:from-black/80 dark:to-transparent">
                  <div className="flex items-center gap-2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-2 group-hover:translate-y-0">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={8} className={`${i < Math.floor(p.rating || 4) ? 'text-[#CDA032] fill-current' : theme === 'dark' ? 'text-white/20' : 'text-black/20'}`} />
                    ))}
                    <span className={`text-[9px] font-bold ml-1 ${theme === 'dark' ? 'text-white/50' : 'text-black/50'}`}>({p.reviewCount || 678})</span>
                  </div>

                  <h3 className={`font-black uppercase italic tracking-wider text-sm leading-tight mb-1 line-clamp-2 drop-shadow-sm ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                    {p.name}
                  </h3>

                  <div className="flex items-end justify-between mt-2">
                    <div>
                      <span className={`text-[9px] mb-0.5 block uppercase tracking-widest italic ${theme === 'dark' ? 'text-white/60' : 'text-black/60'}`}>{p.category}</span>
                      <p className="font-black text-xl tracking-tighter text-[#CDA032] drop-shadow-sm">
                        {formatCurrency(p.price)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (navigateTo) navigateTo('product', p.id);
                        }}
                        className={`w-10 h-10 rounded-full backdrop-blur-md transition-all flex items-center justify-center border hover:border-transparent hover:scale-110 active:scale-95 group/nav ${theme === 'dark' ? 'bg-black/40 text-white hover:bg-[#CDA032] border-white/20' : 'bg-white/40 text-black hover:bg-[#CDA032] border-black/10 shadow-sm'}`}
                        aria-label={`View ${p.name}`}
                      >
                        <ArrowRight size={16} className="group-hover/nav:-rotate-45 transition-transform" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToCart(p);
                        }}
                        className={`w-10 h-10 rounded-full backdrop-blur-md transition-all flex items-center justify-center group/btn border hover:border-transparent hover:scale-110 active:scale-95 ${theme === 'dark' ? 'bg-white/10 text-white hover:bg-[#CDA032] hover:text-black border-white/20' : 'bg-black/5 text-black hover:bg-[#CDA032] border-black/10 shadow-sm'}`}
                        aria-label={`Add ${p.name} to cart`}
                      >
                        <ShoppingCart size={16} className="group-hover/btn:-translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center mt-6 px-4">
            <Link
              to="/store"
              className="group relative inline-flex items-center gap-4 px-10 py-4 border-2 border-[#D4AF37] text-[#D4AF37] rounded-full text-sm font-heading font-semibold tracking-wider transition-all duration-300 hover:bg-[#D4AF37] hover:text-black hover:scale-105"
            >
              <ArrowRight className="absolute -left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D4AF37] group-hover:text-black transition-colors" size={16} />
              Explore full store
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Access / Accessories Slider */}
      <section className={`py-6 md:py-10 overflow-hidden ${theme === 'dark' ? 'bg-black' : 'bg-[#f5f5f7]'}`}>
        <div className="max-w-screen-2xl mx-auto">

          <div className="flex items-center justify-end mb-6 px-4 md:px-8 gap-3">
            <button
              onClick={() => document.getElementById('accessories-slider')?.scrollBy({ left: -400, behavior: 'smooth' })}
              className={`w-12 h-12 rounded-full border flex items-center justify-center transition-colors ${theme === 'dark' ? 'border-white/20 text-white hover:bg-white hover:text-black' : 'border-black/20 text-black hover:bg-black hover:text-white'}`}
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={() => document.getElementById('accessories-slider')?.scrollBy({ left: 400, behavior: 'smooth' })}
              className={`w-12 h-12 rounded-full border flex items-center justify-center transition-colors ${theme === 'dark' ? 'border-white/20 text-white hover:bg-white hover:text-black' : 'border-black/20 text-black hover:bg-black hover:text-white'}`}
            >
              <ChevronRight size={24} />
            </button>
          </div>

          <div id="accessories-slider" className="flex items-center gap-4 md:gap-6 overflow-x-auto no-scrollbar snap-x snap-mandatory px-4 md:px-8 pb-8" style={{ scrollPaddingLeft: 'max(1rem, env(safe-area-inset-left))' }}>
            {/* Promo Card */}
            <div className={`w-[300px] md:w-[400px] min-h-[400px] md:min-h-[500px] ${theme === 'dark' ? 'bg-[#111]' : 'bg-white'} ${theme === 'dark' ? 'text-white' : 'text-black'} p-8 md:p-12 rounded-[2rem] flex flex-col justify-between snap-start flex-shrink-0 shadow-sm border border-black/5 dark:border-white/5`}>
              <div>
                <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">Take a peek</h2>
                <p className={`text-lg md:text-xl ${theme === 'dark' ? 'text-white/70' : 'text-black/70'}`}>The accessories you love.<br />In a fresh mix of colors.</p>
              </div>
              <div className="flex justify-center mt-8">
                <img src="/cases.jpeg" alt="Accessories" className="h-40 md:h-56 w-40 md:w-56 object-cover rounded-2xl drop-shadow-xl" />
              </div>
            </div>

            {/* Product Cards */}
            {products.filter(p => matchesCategory(p.category, 'Accessories') || matchesCategory(p.category, 'iPhone')).slice(0, 8).map(p => (
              <div
                key={p.id}
                onClick={() => onQuickView(p)}
                className={`w-[260px] md:w-[300px] h-[360px] md:h-[420px] rounded-[2rem] snap-start flex-shrink-0 flex flex-col group cursor-pointer overflow-hidden relative shadow-lg ${theme === 'dark' ? 'bg-[#111]' : 'bg-[#ffffff]'}`}
              >
                <div className="pointer-events-none absolute inset-0 z-10">
                  <div className={`absolute bottom-2 left-2 w-12 h-12 border-b-2 border-l-2 rounded-bl-[1.5rem] transition-colors ${theme === 'dark' ? 'border-white/20' : 'border-[#B38B21]/40'}`} />
                  <div className={`absolute bottom-2 right-2 w-12 h-12 border-b-2 border-r-2 rounded-br-[1.5rem] transition-colors ${theme === 'dark' ? 'border-white/20' : 'border-[#B38B21]/40'}`} />
                </div>

                <div className="absolute top-0 inset-x-0 h-[60%] pt-8 px-8 transform group-hover:scale-105 transition-transform duration-700 flex items-center justify-center">
                  <img src={p.image} alt={p.name} className="w-full h-full object-contain filter drop-shadow-lg" />
                </div>

                <button
                  type="button"
                  aria-label={`Quick view ${p.name}`}
                  title="Quick view"
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuickView(p);
                  }}
                  className={`absolute top-4 right-4 z-30 flex h-11 w-11 items-center justify-center rounded-full border shadow-lg backdrop-blur-md transition-all hover:scale-105 active:scale-95 ${theme === 'dark'
                    ? 'border-white/25 bg-black/55 text-white hover:bg-[#CDA032] hover:text-black hover:border-transparent'
                    : 'border-black/12 bg-white/90 text-black hover:bg-[#CDA032] hover:border-transparent'
                    }`}
                >
                  <Eye size={18} strokeWidth={2.25} />
                </button>

                <div className="absolute inset-x-0 bottom-0 p-6 flex flex-col z-20 bg-gradient-to-t from-black/5 to-transparent dark:from-black/80 dark:to-transparent">
                  <div className="flex items-center gap-2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-2 group-hover:translate-y-0">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={8} className={`${i < Math.floor(p.rating || 4) ? 'text-[#CDA032] fill-current' : theme === 'dark' ? 'text-white/20' : 'text-black/20'}`} />
                    ))}
                    <span className={`text-[9px] font-bold ml-1 ${theme === 'dark' ? 'text-white/50' : 'text-black/50'}`}>({p.reviewCount || 678})</span>
                  </div>

                  <h3 className={`font-black uppercase italic tracking-wider text-sm leading-tight mb-1 line-clamp-2 drop-shadow-sm ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                    {p.name}
                  </h3>

                  <div className="flex items-end justify-between mt-2">
                    <div>
                      <span className={`text-[9px] mb-0.5 block uppercase tracking-widest italic ${theme === 'dark' ? 'text-white/60' : 'text-black/60'}`}>{p.category}</span>
                      <p className="font-black text-xl tracking-tighter text-[#CDA032] drop-shadow-sm">
                        {formatCurrency(p.price)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); if (navigateTo) navigateTo('product', p.id); }}
                        className={`w-10 h-10 rounded-full backdrop-blur-md transition-all flex items-center justify-center border hover:border-transparent hover:scale-110 active:scale-95 group/nav ${theme === 'dark' ? 'bg-black/40 text-white hover:bg-[#CDA032] border-white/20' : 'bg-white/40 text-black hover:bg-[#CDA032] border-black/10 shadow-sm'}`}
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

          <div className="flex justify-center mt-6 px-4">
            <Link
              to="/store"
              search={{ category: 'Accessories' } as any}
              className="group inline-flex items-center gap-4 px-10 py-5 bg-black dark:bg-white text-white dark:text-black rounded-full font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:scale-105 transition-all w-full md:w-auto justify-center"
            >
              View All Accessories
              <div className="w-8 h-8 rounded-full bg-white/20 dark:bg-black/10 flex items-center justify-center group-hover:translate-x-2 transition-transform">
                <ArrowRight size={16} />
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Access / Laptop Slider */}
      <section className={`py-6 md:py-10 overflow-hidden ${theme === 'dark' ? 'bg-black' : 'bg-white'}`}>
        <div className="max-w-screen-2xl mx-auto">

          <div className="flex items-center justify-end mb-6 px-4 md:px-8 gap-3">
            <button
              onClick={() => document.getElementById('laptop-slider')?.scrollBy({ left: -400, behavior: 'smooth' })}
              className={`w-12 h-12 rounded-full border flex items-center justify-center transition-colors ${theme === 'dark' ? 'border-white/20 text-white hover:bg-white hover:text-black' : 'border-black/20 text-black hover:bg-black hover:text-white'}`}
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={() => document.getElementById('laptop-slider')?.scrollBy({ left: 400, behavior: 'smooth' })}
              className={`w-12 h-12 rounded-full border flex items-center justify-center transition-colors ${theme === 'dark' ? 'border-white/20 text-white hover:bg-white hover:text-black' : 'border-black/20 text-black hover:bg-black hover:text-white'}`}
            >
              <ChevronRight size={24} />
            </button>
          </div>

          <div id="laptop-slider" className="flex items-center gap-4 md:gap-6 overflow-x-auto no-scrollbar snap-x snap-mandatory px-4 md:px-8 pb-8" style={{ scrollPaddingLeft: 'max(1rem, env(safe-area-inset-left))' }}>
            {/* Promo Card */}
            <div className={`w-[300px] md:w-[400px] min-h-[400px] md:min-h-[500px] ${theme === 'dark' ? 'bg-[#0A0A0A]' : 'bg-[#F2F4F7]'} ${theme === 'dark' ? 'text-white' : 'text-black'} p-8 md:p-12 rounded-[2rem] flex flex-col justify-between snap-start flex-shrink-0 shadow-sm border border-black/5 dark:border-white/5 relative overflow-hidden group`}>
              <div className="relative z-10">
                <h2 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase leading-tight mb-4">Laptops.</h2>
                <p className={`text-lg md:text-xl font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-white/40' : 'text-black/40'}`}>Elite MacBooks and<br />Performance machines.</p>
              </div>
              <div className="flex justify-center mt-8 relative z-10 transform group-hover:scale-110 transition-transform duration-700">
                <img
                  src="/laptop.jpeg"
                  alt="Laptops"
                  className="h-40 md:h-56 max-w-full object-contain drop-shadow-2xl"
                />
              </div>
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[#CDA032]/20 rounded-full blur-[60px] group-hover:scale-150 transition-transform duration-1000"></div>
            </div>

            {/* Product Cards */}
            {products.filter(p => matchesCategory(p.category, 'Laptop')).map(p => (
              <div
                key={p.id}
                onClick={() => onQuickView(p)}
                className={`w-[260px] md:w-[300px] h-[360px] md:h-[420px] rounded-[2rem] snap-start flex-shrink-0 flex flex-col group cursor-pointer overflow-hidden relative shadow-lg ${theme === 'dark' ? 'bg-[#111]' : 'bg-[#ffffff]'}`}
              >
                <div className="pointer-events-none absolute inset-0 z-10">
                  <div className={`absolute bottom-2 left-2 w-12 h-12 border-b-2 border-l-2 rounded-bl-[1.5rem] transition-colors ${theme === 'dark' ? 'border-white/20' : 'border-[#CDA032]/40'}`} />
                  <div className={`absolute bottom-2 right-2 w-12 h-12 border-b-2 border-r-2 rounded-br-[1.5rem] transition-colors ${theme === 'dark' ? 'border-white/20' : 'border-[#CDA032]/40'}`} />
                </div>

                <div className="absolute top-0 inset-x-0 h-[60%] pt-8 px-8 transform group-hover:scale-105 transition-transform duration-700 flex items-center justify-center">
                  <img src={p.image} alt={p.name} className="w-full h-full object-contain filter drop-shadow-lg" />
                </div>

                <button
                  type="button"
                  aria-label={`Quick view ${p.name}`}
                  title="Quick view"
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuickView(p);
                  }}
                  className={`absolute top-4 right-4 z-30 flex h-11 w-11 items-center justify-center rounded-full border shadow-lg backdrop-blur-md transition-all hover:scale-105 active:scale-95 ${theme === 'dark'
                    ? 'border-white/25 bg-black/55 text-white hover:bg-[#CDA032] hover:text-black hover:border-transparent'
                    : 'border-black/12 bg-white/90 text-black hover:bg-[#CDA032] hover:border-transparent'
                    }`}
                >
                  <Eye size={18} strokeWidth={2.25} />
                </button>

                <div className="absolute inset-x-0 bottom-0 p-6 flex flex-col z-20 bg-gradient-to-t from-black/5 to-transparent dark:from-black/80 dark:to-transparent">
                  <div className="flex items-center gap-2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-2 group-hover:translate-y-0">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={8} className={`${i < Math.floor(p.rating || 4) ? 'text-[#CDA032] fill-current' : theme === 'dark' ? 'text-white/20' : 'text-black/20'}`} />
                    ))}
                    <span className={`text-[9px] font-bold ml-1 ${theme === 'dark' ? 'text-white/50' : 'text-black/50'}`}>({p.reviewCount || 678})</span>
                  </div>

                  <h3 className={`font-black uppercase italic tracking-wider text-sm leading-tight mb-1 line-clamp-2 drop-shadow-sm ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                    {p.name}
                  </h3>

                  <div className="flex items-end justify-between mt-2">
                    <div>
                      <span className={`text-[9px] mb-0.5 block uppercase tracking-widest italic ${theme === 'dark' ? 'text-white/60' : 'text-black/60'}`}>{p.category}</span>
                      <p className="font-black text-xl tracking-tighter text-[#CDA032] drop-shadow-sm">
                        {formatCurrency(p.price)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); if (navigateTo) navigateTo('product', p.id); }}
                        className={`w-10 h-10 rounded-full backdrop-blur-md transition-all flex items-center justify-center border hover:border-transparent hover:scale-110 active:scale-95 group/nav ${theme === 'dark' ? 'bg-black/40 text-white hover:bg-[#CDA032] border-white/20' : 'bg-white/40 text-black hover:bg-[#CDA032] border-black/10 shadow-sm'}`}
                      >
                        <ArrowRight size={16} className="group-hover/nav:-rotate-45 transition-transform" />
                      </button>

                      <button
                        onClick={(e) => { e.stopPropagation(); onAddToCart(p); }}
                        className={`w-10 h-10 rounded-full backdrop-blur-md transition-all flex items-center justify-center group/btn border hover:border-transparent hover:scale-110 active:scale-95 ${theme === 'dark' ? 'bg-white/10 text-white hover:bg-[#CDA032] hover:text-black border-white/20' : 'bg-black/5 text-black hover:bg-[#CDA032] border-black/10 shadow-sm'}`}
                      >
                        <ShoppingCart size={16} className="group-hover/btn:-translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center mt-12 px-4">
            <Link
              to="/store"
              search={{ category: 'Laptop' } as any}
              className="group inline-flex items-center gap-4 px-10 py-5 bg-black dark:bg-white text-white dark:text-black rounded-full font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:scale-105 transition-all w-full md:w-auto justify-center"
            >
              View All Laptops
              <div className="w-8 h-8 rounded-full bg-white/20 dark:bg-black/10 flex items-center justify-center group-hover:translate-x-2 transition-transform">
                <ArrowRight size={16} />
              </div>
            </Link>
          </div>
        </div>
      </section>


      {/* Trade-In Section */}
      <section className="py-12 md:py-16 px-8 relative overflow-hidden bg-black text-white">
        {/* Decorative Background Icons */}
        <div className="absolute left-[-5%] top-1/2 -translate-y-1/2 opacity-10 -rotate-12 pointer-events-none">
          <ArrowLeftRight size={300} className="text-[#CDA032]" />
        </div>
        <div className="absolute right-[-5%] top-1/2 -translate-y-1/2 opacity-10 rotate-12 pointer-events-none">
          <ArrowLeftRight size={300} className="text-[#CDA032]" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10 flex flex-col items-center">
          <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-4">
            Trade-In & Upgrade
          </h2>
          <div className="w-24 h-1 bg-[#CDA032] mb-12"></div>

          <div className="space-y-6 max-w-3xl mx-auto">
            <p className="text-2xl md:text-4xl text-[#CDA032] font-black tracking-tight leading-tight">
              Get up to GHC500 toward your next upgrade
            </p>
            <p className="text-lg md:text-xl text-white/60 font-medium">
              Your old tech has value. Trade in eligible devices and save instantly.
            </p>
          </div>

          <div className="mt-12">
            <Link
              to="/trades"
              className="inline-flex px-10 py-4 bg-[#CDA032] text-black rounded-full text-sm font-black items-center gap-3 transition-all hover:scale-105 hover:bg-[#B38B21] shadow-lg active:scale-95"
            >
              Let's Trade
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Repair Section */}
      <section className={`relative flex flex-col lg:flex-row min-h-[600px] w-full overflow-hidden border-t ${theme === 'dark' ? 'bg-[#0a0a0a] border-white/5' : 'bg-[#F4F4F4] border-black/5'}`}>
        {/* Left Content */}
        <div className="w-full lg:w-1/2 p-8 md:p-12 lg:px-24 lg:py-20 flex flex-col justify-center relative">
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
          <div className="absolute inset-0 flex items-center justify-center">
            <img
              src="/blackfix.png"
              alt="Device Repair & Diagnostics"
              className="h-full w-full object-cover object-center rounded-[2rem] md:rounded-[3rem] md:rounded-b-none"
            />
          </div>
        </div>
      </section>

      {/* Explore Grid Section (Bento-Box Layout) */}
      <section className={`py-12 md:py-16 px-8 overflow-hidden transition-colors duration-500 ${theme === 'light' ? 'bg-[#F2F4F7]' : 'bg-[#0A0A0A]'
        }`}>
        <div className="max-w-[1440px] mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div>
              <h2 className={`text-4xl md:text-5xl font-black italic tracking-tighter uppercase mb-2 ${theme === 'light' ? 'text-black' : 'text-white'
                }`}>
                Explore Collection
              </h2>
              <div className="w-20 h-1 bg-[#D4AF37]"></div>
            </div>
            {/* Filters / Navigation */}
            <div className={`flex flex-wrap items-center gap-2 md:gap-4 p-2 rounded-full border ${theme === 'light' ? 'bg-white border-black/10' : 'bg-[#111] border-white/10'
              }`}>
              {['All Gear', 'Pro Series', 'Essentials'].map((filter) => {
                const isActive = exploreFilter === filter;
                return (
                  <button
                    key={filter}
                    onClick={() => setExploreFilter(filter as any)}
                    className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${isActive
                      ? (theme === 'light' ? 'bg-black text-white shadow-lg' : 'bg-[#D4AF37] text-black shadow-[0_0_20px_rgba(212,175,55,0.3)]')
                      : (theme === 'light' ? 'text-gray-500 hover:text-black hover:bg-black/5' : 'text-white/40 hover:text-white hover:bg-white/5')
                      }`}
                  >
                    {filter}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bento Grid layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 grid-rows-[auto] gap-4 md:gap-6 auto-rows-[240px] md:auto-rows-[280px]">

            {(exploreFilter === 'All Gear' || exploreFilter === 'Pro Series') && (
              <Link to="/store" search={{ category: 'Audio' } as any} className={`col-span-1 md:col-span-2 row-span-1 md:row-span-1 rounded-[2rem] p-8 md:p-10 flex flex-col justify-center relative overflow-hidden group transition-transform duration-500 hover:-translate-y-1 hover:shadow-2xl ${theme === 'light' ? 'bg-[#E1F2EB] text-[#0A261D]' : 'bg-gradient-to-br from-[#1A362D] to-[#0A1A14] text-[#86EFAC] border border-[#22C55E]/20'}`}>
                <div className="relative z-10 w-full md:w-2/3">
                  <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] mb-4 backdrop-blur-md ${theme === 'light' ? 'bg-white/50 text-[#0A261D]' : 'bg-black/30 text-[#86EFAC]'}`}>Limited Time Offer</span>
                  <h3 className={`text-3xl md:text-5xl font-black italic tracking-tighter uppercase leading-[1.1] mb-2 ${theme === 'light' ? 'text-[#0A261D]' : 'text-white'}`}>
                    Get Up To<br />
                    <span className={theme === 'light' ? 'text-[#22C55E]' : 'text-[#4ADE80]'}>20% Off Audio</span>
                  </h3>
                  <span className={`inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mt-4 group-hover:translate-x-2 transition-transform ${theme === 'light' ? 'text-[#0A261D]' : 'text-[#86EFAC]'}`}>
                    Shop Promotion <ArrowRight size={14} />
                  </span>
                </div>
                <div className="absolute top-0 -right-10 md:right-0 bottom-0 w-2/3 md:w-1/2">
                  <img
                    src="/cases.jpeg"
                    alt="Audio Promo"
                    className={`w-full h-full object-cover rounded-l-full scale-125 group-hover:scale-110 transition-all duration-700 ${
                      theme === 'light' ? 'opacity-95' : 'opacity-70 blur-[2px] group-hover:blur-none'
                    }`}
                    style={theme === 'light' ? undefined : { mixBlendMode: 'screen' }}
                  />
                </div>
              </Link>
            )}

            {(exploreFilter === 'All Gear' || exploreFilter === 'Essentials') && (
              <Link to="/store" search={{ category: 'Accessories' } as any} className={`col-span-1 md:col-span-1 row-span-1 md:row-span-2 rounded-[2rem] p-6 flex flex-col justify-between relative overflow-hidden group transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl ${theme === 'light' ? 'bg-white' : 'bg-[#111] border border-white/5'}`}>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60 z-10 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                <div className="flex justify-between items-start z-20">
                  <div className="flex gap-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#CDA032]"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-black/20"></div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center cursor-pointer transition-colors backdrop-blur-md">
                    <Heart size={14} className={theme === 'light' ? 'text-black/40' : 'text-white/40'} />
                  </div>
                </div>

                <div className="absolute inset-0 pt-16 pb-24 px-4 flex items-center justify-center -z-0">
                  <img src="/iPhone.jpeg" alt="iPhone Case" className="w-[80%] h-[80%] object-contain drop-shadow-2xl group-hover:scale-110 transition-transform duration-700" />
                </div>

                <div className="z-20 transform translate-y-2 group-hover:translate-y-0 transition-transform mt-auto">
                  <span className={`text-[9px] font-black uppercase tracking-widest mb-1 block ${theme === 'light' ? 'text-black/40' : 'text-white/40'}`}>Our Picks</span>
                  <h3 className={`text-lg font-black uppercase italic tracking-tight leading-tight mb-4 ${theme === 'light' ? 'text-black' : 'text-white'}`}>
                    Silicone Case<br />For iPhone 15 Pro
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className={`px-4 py-2 rounded-xl text-xs font-black bg-[#CDA032] text-black shadow-lg`}>
                      GHC 350
                    </span>
                  </div>
                </div>
              </Link>
            )}

            {(exploreFilter === 'All Gear' || exploreFilter === 'Pro Series') && (
              <Link to="/store" search={{ category: 'Gaming' } as any} className={`col-span-1 md:col-span-1 row-span-1 rounded-[2rem] p-6 flex flex-col justify-center relative overflow-hidden group transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl ${theme === 'light' ? 'bg-[#F2F4F7] border border-black/5' : 'bg-[#1A1A1A] border border-white/5'}`}>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60 z-10 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                <div className="flex justify-between items-start z-20">
                  <div className="flex gap-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center cursor-pointer transition-colors backdrop-blur-md">
                    <Heart size={14} className={theme === 'light' ? 'text-black/40' : 'text-white/40'} />
                  </div>
                </div>

                <div className="absolute inset-0 pt-16 pb-24 px-4 flex items-center justify-center -z-0">
                  <img src="/ps5.jpeg" alt="Gaming Console" className="w-[90%] h-[90%] object-contain drop-shadow-2xl group-hover:scale-110 transition-transform duration-700" />
                </div>

                <div className="z-20 transform translate-y-2 group-hover:translate-y-0 transition-transform mt-auto">
                  <span className={`text-[9px] font-black uppercase tracking-widest mb-1 block ${theme === 'light' ? 'text-black/40' : 'text-white/40'}`}>Your Choice</span>
                  <h3 className={`text-lg font-black uppercase italic tracking-tight leading-tight mb-4 ${theme === 'light' ? 'text-black' : 'text-white'}`}>
                    PS5 DualSense<br />Wireless Controller
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className={`px-4 py-2 rounded-xl text-xs font-black bg-[#CDA032] text-black shadow-lg`}>
                      GHC 850
                    </span>
                  </div>
                </div>
              </Link>
            )}

            {(exploreFilter === 'All Gear' || exploreFilter === 'Pro Series') && (
              <Link to="/store" search={{ category: 'Laptop' } as any} className={`col-span-1 md:col-span-2 row-span-1 md:row-span-1 rounded-[2rem] p-8 md:p-10 flex flex-col justify-center relative overflow-hidden group transition-transform duration-500 hover:-translate-y-1 hover:shadow-2xl ${theme === 'light' ? 'bg-[#FFF3CD]' : 'bg-gradient-to-br from-[#CDA032]/20 to-[#4A3B12] border border-[#CDA032]/20'}`}>
                <div className="relative z-10 w-full md:w-1/2">
                  <h3 className={`text-2xl md:text-4xl font-black italic tracking-tighter uppercase leading-[1.1] mb-2 ${theme === 'light' ? 'text-black' : 'text-white'}`}>
                    Pro Power.<br />Anywhere.
                  </h3>
                  <p className={`text-xs font-bold uppercase tracking-widest ${theme === 'light' ? 'text-black/60' : 'text-[#CDA032]'}`}>
                    Push boundaries with M-Series
                  </p>
                </div>
                <div className="absolute right-0 bottom-0 top-0 w-1/2 overflow-hidden flex justify-end">
                  <img
                    src="/macbook.jpeg"
                    alt="MacBook Promo"
                    className={`w-full h-full object-cover transform scale-110 origin-right group-hover:scale-[1.15] transition-transform duration-[1.5s] ${
                      theme === 'light' ? 'opacity-95' : 'mix-blend-multiply opacity-90'
                    }`}
                  />
                </div>
                <div className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-black/40 hover:bg-white transition-colors cursor-pointer z-20">
                  <ArrowRight size={16} />
                </div>
              </Link>
            )}

            {(exploreFilter === 'All Gear' || exploreFilter === 'Essentials') && (
              <Link to="/trades" className={`col-span-1 md:col-span-1 row-span-1 rounded-[2rem] p-8 relative overflow-hidden group transition-transform duration-500 hover:-translate-y-1 hover:shadow-xl flex flex-col justify-end ${theme === 'light' ? 'bg-[#F9FAFB] shadow-inner' : 'bg-[#111] shadow-inner border border-white/5'}`}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10 opacity-70"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-[#CDA032]/20 to-transparent z-20 mix-blend-overlay"></div>
                <img src="/iPhone.jpeg" alt="Trade In Promo" className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-[2s] z-0 filter saturate-150" />
                <div className="relative z-30 transform group-hover:-translate-y-1 transition-transform">
                  <div className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 inline-block mb-3">
                    <span className="text-[9px] font-black uppercase tracking-widest text-white">Avid Offers</span>
                  </div>
                  <h3 className="text-xl font-black italic tracking-tighter uppercase text-white shadow-black drop-shadow-lg">
                    Trade-In Bonus
                  </h3>
                </div>
                <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white/40">
                  <Heart size={14} />
                </div>
              </Link>
            )}

            {(exploreFilter === 'All Gear' || exploreFilter === 'Pro Series') && (
              <div className={`col-span-1 md:col-span-1 row-span-1 rounded-[2rem] p-6 flex flex-col relative overflow-hidden transition-all duration-500 hover:shadow-xl ${theme === 'light' ? 'bg-white' : 'bg-[#111] border border-white/5'}`}>
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${theme === 'light' ? 'text-black' : 'text-white'}`}>Highlights</span>
                  <div className="flex gap-1">
                    <button
                      onClick={prevHighlight}
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${theme === 'light' ? 'bg-black/5 hover:bg-black/10' : 'bg-white/5 hover:bg-white/10'} text-[#CDA032]`}
                    >
                      <ChevronLeft size={12} />
                    </button>
                    <button
                      onClick={nextHighlight}
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${theme === 'light' ? 'bg-black/5 hover:bg-black/10' : 'bg-white/5 hover:bg-white/10'} text-[#CDA032]`}
                    >
                      <ChevronRight size={12} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 flex gap-3 pb-2 overflow-hidden relative">
                  <div
                    className="flex gap-3 transition-transform duration-500 ease-out h-full w-full"
                    style={{ transform: `translateX(-${currentHighlightsIndex * 50}%)` }}
                  >
                    {highlights.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => onQuickView(p)}
                        className={`min-w-[45%] rounded-2xl overflow-hidden relative group/mini cursor-pointer ${theme === 'light' ? 'bg-gray-100' : 'bg-[#050505]'} border border-white/5`}
                      >
                        <img src={p.image} alt={p.name} className="w-full h-full object-contain p-2 group-hover/mini:scale-110 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/mini:opacity-100 transition-opacity flex items-center justify-center">
                          <Eye size={12} className="text-white" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => navigateTo?.('store')}
                  className={`w-full py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-colors ${theme === 'light' ? 'bg-gray-100 text-black hover:bg-[#CDA032]' : 'bg-white/5 text-white hover:bg-white/10'}`}
                >
                  See All
                </button>
              </div>
            )}

            {(exploreFilter === 'All Gear' || exploreFilter === 'Essentials') && (
              <Link to="/store" search={{ category: 'Accessories' } as any} className={`col-span-1 md:col-span-2 row-span-1 rounded-[2rem] p-8 md:p-10 flex items-center relative overflow-hidden group transition-transform duration-500 hover:-translate-y-1 hover:shadow-2xl ${theme === 'light' ? 'bg-[#F8F9FA]' : 'bg-gradient-to-r from-[#111] to-[#0A0A0A] border border-white/5'}`}>
                <div className="relative z-10 w-2/3 md:w-1/2">
                  <h3 className={`text-2xl md:text-4xl font-black italic tracking-tighter uppercase leading-[1] mb-2 ${theme === 'light' ? 'text-black' : 'text-white'}`}>
                    Bring Bold<br />Fashion
                  </h3>
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${theme === 'light' ? 'text-black/40' : 'text-white/40'}`}>
                    Layers on Layers
                  </p>
                </div>
                <div className="absolute right-0 bottom-0 top-0 w-1/2 md:w-1/2 flex justify-end">
                  <div className={`w-full h-full flex items-center justify-center transform translate-y-4 group-hover:translate-y-0 transition-transform duration-700`}>
                    <img
                      src="/macbook.jpeg"
                      alt="Accessory Layer"
                      className={`w-full object-cover h-[120%] ${
                        theme === 'light' ? 'opacity-95' : 'opacity-90 mix-blend-luminosity'
                      }`}
                    />
                  </div>
                </div>
                <div className={`absolute top-6 right-6 w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer z-20 ${theme === 'light' ? 'bg-white text-black hover:bg-black hover:text-white shadow-md' : 'bg-white/10 text-white hover:bg-[#CDA032] hover:text-black'}`}>
                  <ArrowRight size={14} className="-rotate-45" />
                </div>
              </Link>
            )}

          </div>
        </div>
      </section>

      {/* Catalog Marquee Section (Duplicate products effect) */}
      <section className={`py-12 border-y ${theme === 'light' ? 'bg-white border-black/5' : 'bg-black/50 border-white/5'}`}>
        <div className="flex flex-col gap-8">
          <div className="text-center px-8">
            <h3 className={`text-[10px] font-black uppercase tracking-[0.5em] italic ${theme === 'light' ? 'text-black/30' : 'text-white/20'}`}>
              Continuous Laptop Inventory // Portable Excellence
            </h3>
          </div>
          <div className="relative flex overflow-hidden">
            <div className="flex py-4 animate-scroll whitespace-nowrap">
              {products.filter(p => matchesCategory(p.category, 'Laptop')).map((p, i) => (
                <div key={`${p.id}-${i}`} className="inline-flex items-center gap-4 px-8 group cursor-default">
                  <span className={`text-4xl md:text-6xl font-black italic tracking-tighter uppercase transition-colors duration-500 hover:text-[#D4AF37] ${theme === 'light' ? 'text-black/5' : 'text-white/5'
                    }`}>
                    {p.name}
                  </span>
                  <div className={`w-2 h-2 rounded-full ${theme === 'light' ? 'bg-black/10' : 'bg-white/10'}`}></div>
                </div>
              ))}
              {/* Duplicate for seamless scroll */}
              {products.filter(p => matchesCategory(p.category, 'Laptop')).map((p, i) => (
                <div key={`${p.id}-dup-${i}`} className="inline-flex items-center gap-4 px-8 group cursor-default">
                  <span className={`text-4xl md:text-6xl font-black italic tracking-tighter uppercase transition-colors duration-500 hover:text-[#D4AF37] ${theme === 'light' ? 'text-black/5' : 'text-white/5'
                    }`}>
                    {p.name}
                  </span>
                  <div className={`w-2 h-2 rounded-full ${theme === 'light' ? 'bg-black/10' : 'bg-white/10'}`}></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* About Us Banner */}
      <section className={`py-20 px-8 ${theme === 'dark' ? 'bg-[#111]' : 'bg-white'} border-t border-b ${theme === 'dark' ? 'border-white/5' : 'border-black/5'} overflow-hidden`}>
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className={`text-4xl md:text-5xl font-bold ${theme === 'dark' ? 'text-white' : 'text-black'} tracking-tight`}>
            WHO WE ARE?
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
      <style>{`
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
