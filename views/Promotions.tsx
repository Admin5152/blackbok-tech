import React, { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Tag, ArrowRight, Bell, AlertCircle, ShoppingBag, Sparkles, Flame } from 'lucide-react';
import { useAppContext } from '../App';
import { ProductCard } from '../components/ProductCard';
import { PageBackButton } from '../components/PageBackButton';
import { ProductGridSkeleton } from '../components/Skeleton';
import { PAGE_SIZES, usePagination } from '../lib/pagination';
import { Pagination } from '../components/Pagination';
import { isDealOfTheDayProduct } from '../lib/dealOfTheDay';

export const Promotions: React.FC = () => {
    const { products, theme, onAddToCart, wishlist, toggleWishlist, compareIds, toggleCompare, onQuickView } = useAppContext();
    const isLight = theme === 'light';

    const dealCount = useMemo(
      () => products.filter((p) => isDealOfTheDayProduct(p)).length,
      [products],
    );

    const discountedProducts = useMemo(() => {
      const list = products.filter((p) => (p.discount && p.discount > 0) || isDealOfTheDayProduct(p));
      return [...list].sort((a, b) => {
        const da = isDealOfTheDayProduct(a) ? 1 : 0;
        const db = isDealOfTheDayProduct(b) ? 1 : 0;
        if (db !== da) return db - da;
        return Number(b.discount ?? 0) - Number(a.discount ?? 0);
      });
    }, [products]);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const catalogHydrating = products.length === 0;
    const {
      page,
      setPage,
      pageCount,
      pageItems,
      total,
    } = usePagination(discountedProducts, PAGE_SIZES.catalog, discountedProducts.length);

    return (
        <div className={`min-h-screen pt-32 pb-20 px-4 md:px-8 transition-colors duration-500 ${isLight ? 'bg-[#FAFAFA]' : 'bg-gradient-to-b from-[#050508] via-[#0a0a12] to-[#050508]'}`}>
            <div className="max-w-7xl mx-auto space-y-16">

                <PageBackButton isLight={isLight} fallbackTo="/store" />

                {/* Hero Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-[var(--bb-border)]/20 pb-12">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-[#CDA032]/20 flex items-center justify-center text-[#CDA032]">
                                <Tag size={24} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Seasonal Offers</span>
                        </div>
                        <h1 className={`text-5xl md:text-8xl font-black italic tracking-tighter uppercase ${isLight ? 'text-black' : 'text-white'}`}>
                            Shop <span className="text-[#CDA032]">Promotions</span>.
                        </h1>
                        {dealCount > 0 && (
                          <Link
                            to="/store"
                            search={{ browse: 'deals' } as any}
                            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-orange-500 hover:underline"
                          >
                            <Flame size={14} />
                            {dealCount} Deal of the Day{dealCount === 1 ? '' : 's'} — view in shop
                            <ArrowRight size={14} />
                          </Link>
                        )}
                    </div>

                    <div className={`p-8 rounded-[2.5rem] border backdrop-blur-3xl overflow-hidden relative ${isLight ? 'bg-white border-black/5 shadow-xl' : 'bg-white/5 border-white/5 shadow-2xl'}`}>
                        {isSubscribed ? (
                            <div className="flex items-center gap-4 text-[#CDA032] animate-in zoom-in duration-500">
                                <Sparkles size={24} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Protocol Active: You will be notified.</span>
                            </div>
                        ) : (
                            <div className="flex flex-col sm:flex-row items-center gap-6">
                                <div className="space-y-1 text-center sm:text-left">
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Stay Calibrated</p>
                                    <p className={`text-xs font-bold ${isLight ? 'text-black' : 'text-white'}`}>Get alerts for future drops.</p>
                                </div>
                                <button
                                    onClick={() => setIsSubscribed(true)}
                                    className="px-8 py-3 bg-[#CDA032] text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all shadow-lg shadow-[#CDA032]/20 flex items-center gap-3"
                                >
                                    Notify Me <Bell size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {catalogHydrating ? (
                    <ProductGridSkeleton isLight={isLight} count={8} />
                ) : discountedProducts.length > 0 ? (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                            {pageItems.map((p) => (
                                <ProductCard
                                    key={p.id}
                                    product={p}
                                    onAddToCart={onAddToCart}
                                    isWishlisted={wishlist.includes(p.id)}
                                    onToggleWishlist={toggleWishlist}
                                    isCompared={compareIds.includes(p.id)}
                                    onToggleCompare={toggleCompare}
                                    onQuickView={onQuickView}
                                />
                            ))}
                        </div>
                        <Pagination
                          page={page}
                          pageCount={pageCount}
                          onPageChange={setPage}
                          total={total}
                          pageSize={PAGE_SIZES.catalog}
                          isLight={isLight}
                        />
                    </div>
                ) : (
                    <div className="py-32 flex flex-col items-center justify-center text-center space-y-8">
                        <div className="relative">
                            <div className="absolute inset-0 bg-[#CDA032]/10 blur-[80px] rounded-full scale-150"></div>
                            <AlertCircle size={80} className="relative text-white/5 mx-auto" strokeWidth={1} />
                        </div>
                        <div className="space-y-4">
                            <h2 className="text-3xl font-black italic uppercase tracking-tighter opacity-20">No Active Promotions</h2>
                        </div>
                        <button
                            onClick={() => window.history.back()}
                            className="inline-flex items-center gap-3 px-10 py-4 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-white hover:bg-[#CDA032] hover:text-black transition-all group"
                        >
                            <ArrowRight size={14} className="rotate-180 group-hover:-translate-x-2 transition-transform" />
                            Return to Store
                        </button>
                    </div>
                )}

                {/* Footer Insight */}
                <div className={`p-12 rounded-[3.5rem] border flex flex-col md:flex-row items-center justify-between gap-12 transition-all ${isLight ? 'bg-black text-white' : 'bg-[#CDA032] text-black shadow-2xl shadow-[#CDA032]/20'}`}>
                    <div className="space-y-4 max-w-xl text-center md:text-left">
                        <h4 className="text-3xl font-black italic tracking-tighter uppercase leading-tight">Elite Performance <br /> Integrated Value.</h4>
                        <p className={`text-[10px] font-black uppercase tracking-widest leading-relaxed opacity-60`}>
                            BlackBox promotions ensure top-tier hardware reached enthusiasts without compromising the integrity of the diagnostic baseline.
                        </p>
                    </div>
                    <button className={`px-12 py-5 rounded-full text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3 transition-all active:scale-95 shadow-2xl ${isLight ? 'bg-white text-black' : 'bg-black text-white hover:scale-105'}`}>
                        View Catalog
                        <ShoppingBag size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};
