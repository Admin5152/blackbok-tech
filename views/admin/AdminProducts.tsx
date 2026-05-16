import React, { useState, useEffect } from 'react';
import { Package, Plus, Edit2, Trash2, AlertTriangle, Box, Star } from 'lucide-react';
import { SearchInput, Modal, ModalClose, Td, Th, TableWrapper, PROD_KEY } from './adminUtils';
import {
    getProducts, createProduct, updateProduct, deleteProduct,
    syncProductVariants, clearProductVariants, type SkuVariantInput,
} from '../../lib/api';
import {
    parseSkuVariants,
    skuMatrixEnabledForProduct,
    syncSkuRowsFromChips,
    canUseSkuMatrix,
    totalSkuStock,
} from '../../lib/productSkuMatrix';
import type { SkuMatrixRow } from '../../lib/productSkuMatrix';
import { AdminProductForm, PRODUCT_CATEGORIES, type ProductDraft } from './AdminProductForm';
// Products are sourced exclusively from Supabase.
import type { Product } from '../../types';
import { formatCurrency } from '../../lib/utils';

interface Props { canEdit?: boolean; theme?: 'light' | 'dark'; }

const EMPTY: ProductDraft = {
    name: '', price: 0, category: 'iPhone', description: '', image: '',
    stock: 10, rating: 4.5, discount: undefined, new: false,
    colors: [], storage: [], ram: [], specs: [], featured: false,
};

export const AdminProducts: React.FC<Props> = ({ canEdit = true, theme = 'dark' }) => {
    const isLight = theme === 'light';
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [q, setQ] = useState('');
    const [catFilter, setCatFilter] = useState('All');
    const [showForm, setShowForm] = useState(false);
    const [draft, setDraft] = useState<ProductDraft>(EMPTY);
    const [colorIn, setColorIn] = useState('');
    const [storageIn, setStorageIn] = useState('');
    const [ramIn, setRamIn] = useState('');
    const [specsIn, setSpecsIn] = useState('');
    const [skuMatrixEnabled, setSkuMatrixEnabled] = useState(false);
    const [skuRows, setSkuRows] = useState<SkuMatrixRow[]>([]);
    const [error, setError] = useState('');

    const resetSkuState = (p?: Product | ProductDraft) => {
        const colors = p?.colors || [];
        const storage = p?.storage || [];
        const ram = p?.ram || [];
        const fromDb = parseSkuVariants(p?.variants);
        const rows =
            fromDb.length > 0
                ? fromDb
                : canUseSkuMatrix(colors, storage, ram)
                  ? syncSkuRowsFromChips(colors, storage, ram, [])
                  : [];
        setSkuRows(rows);
        setSkuMatrixEnabled(p ? skuMatrixEnabledForProduct(p as Product) : false);
    };

    const applyDraftChips = (next: ProductDraft) => {
        setDraft(next);
        const colors = next.colors || [];
        const storage = next.storage || [];
        const ram = next.ram || [];
        if (!canUseSkuMatrix(colors, storage, ram)) {
            if (!parseSkuVariants(next.variants).length) {
                setSkuMatrixEnabled(false);
                setSkuRows([]);
            }
            return;
        }
        setSkuMatrixEnabled(true);
        setSkuRows((prev) => syncSkuRowsFromChips(colors, storage, ram, prev));
    };

    const load = async (opts?: { silent?: boolean }) => {
        if (!opts?.silent) setLoading(true);
        try {
            const remote = await getProducts();
            setProducts(remote);
            localStorage.setItem(PROD_KEY, JSON.stringify(remote));
        } catch (e) {
            console.error('Failed to load products from Supabase:', e);
            setProducts([]);
        } finally {
            if (!opts?.silent) setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const openAdd = () => {
        setDraft({ ...EMPTY });
        setColorIn(''); setStorageIn(''); setRamIn(''); setSpecsIn('');
        setSkuRows([]); setSkuMatrixEnabled(false);
        setError(''); setShowForm(true);
    };
    const openEdit = (p: Product) => {
        setDraft({ ...p } as ProductDraft);
        setColorIn(''); setStorageIn(''); setRamIn(''); setSpecsIn('');
        resetSkuState(p);
        setError(''); setShowForm(true);
    };

    const del = async (id: string) => {
        if (!confirm('Delete this product?')) return;
        try {
            await deleteProduct(id);
            await load({ silent: true });
            window.dispatchEvent(new CustomEvent('products:refresh'));
        } catch (e: any) {
            alert('Delete failed: ' + e.message);
        }
    };

    const submitForm = async () => {
        const priceNum = Number(draft.price);
        if (!draft.name?.trim() || !Number.isFinite(priceNum) || priceNum < 0) {
            setError('Name and price are required.');
            return;
        }
        if (skuMatrixEnabled && skuRows.length === 0) {
            setError('Add Color / Storage / RAM chips, enable per-combination stock, and wait for rows to appear (or click Create rows).');
            return;
        }

        setSaving(true); setError('');
        const useMatrix = skuMatrixEnabled && skuRows.length > 0;
        const matrixStock = useMatrix ? totalSkuStock(skuRows) : (draft.stock != null ? Number(draft.stock) : 0);

        try {
            let productId = draft.id;
            const productPayload = {
                name: draft.name,
                description: draft.description || '',
                price: priceNum,
                image: draft.image || '',
                category: draft.category || 'iPhone',
                stock: matrixStock,
                rating: draft.rating != null ? Number(draft.rating) : undefined,
                discount: draft.discount != null ? Number(draft.discount) : undefined,
                new: draft.new ?? false,
                colors: draft.colors,
                storage: draft.storage,
                ram: draft.ram,
                specs: draft.specs,
                featured: Boolean((draft as any).featured),
            };

            if (draft.id) {
                await updateProduct(draft.id, {
                    ...productPayload,
                    reviewCount: (draft as any).reviewCount,
                });
            } else {
                const created = await createProduct({
                    ...productPayload,
                    name: draft.name!,
                    reviewCount: 0,
                    stock: matrixStock || (draft.stock ?? 10),
                    rating: draft.rating ?? 4.5,
                    specs: draft.specs?.length ? draft.specs : [],
                });
                productId = created.id;
            }

            if (productId) {
                if (useMatrix) {
                    const variantPayload: SkuVariantInput[] = skuRows.map((r) => ({
                        id: r.id,
                        color: r.color || null,
                        storage: r.storage || null,
                        ram: r.ram || null,
                        stock: r.stock,
                        price_modifier: r.price_modifier,
                        sku: r.sku || null,
                    }));
                    await syncProductVariants(productId, variantPayload);
                } else {
                    await clearProductVariants(productId);
                }
            }

            setShowForm(false);
            setDraft(EMPTY);
            setSkuRows([]);
            setSkuMatrixEnabled(false);
            await load({ silent: true });
            window.dispatchEvent(new CustomEvent('products:refresh'));
        } catch (e: any) {
            const msg = String(e?.message || e || '');
            if (/product_variants|column|permission|policy/i.test(msg)) {
                setError(
                    'Could not save SKU rows. Run migrations 2026_05_product_variants_sku_columns.sql and 2026_05_product_variants_admin_rls.sql in Supabase, then try again.',
                );
            } else {
                setError('Save failed: ' + (msg || 'Unknown error'));
            }
        } finally {
            setSaving(false);
        }
    };

    /** Toggle featured flag and persist to DB + local cache */
    const toggleFeatured = async (id: string) => {
        const product = products.find(p => p.id === id);
        if (!product) return;
        const nextFeatured = !Boolean((product as any).featured);

        try {
            await updateProduct(id, { featured: nextFeatured });
            await load({ silent: true });
            window.dispatchEvent(new CustomEvent('products:refresh'));
        } catch (e: any) {
            alert('Failed to update featured flag: ' + (e?.message || 'Unknown error'));
        }
    };

    const addChip = (field: 'colors' | 'storage' | 'ram' | 'specs', val: string, clear: () => void) => {
        if (!val.trim()) return;
        const arr = (draft[field] as string[] | undefined) || [];
        if (arr.includes(val.trim())) {
            clear();
            return;
        }
        if (field === 'specs') {
            setDraft({ ...draft, specs: [...(draft.specs || []), val.trim()] });
        } else {
            applyDraftChips({ ...draft, [field]: [...arr, val.trim()] });
        }
        clear();
    };
    const rmChip = (field: 'colors' | 'storage' | 'ram' | 'specs', val: string) => {
        if (field === 'specs') {
            setDraft({ ...draft, specs: ((draft.specs as string[] | undefined) || []).filter((x) => x !== val) });
            return;
        }
        applyDraftChips({
            ...draft,
            [field]: ((draft[field] as string[] | undefined) || []).filter((x) => x !== val),
        });
    };

    const cats = ['All', ...PRODUCT_CATEGORIES];
    const filtered = products.filter(p => {
        const mQ = String(p.name ?? '').toLowerCase().includes(q.toLowerCase());
        const mC = catFilter === 'All' || p.category === catFilter;
        return mQ && mC;
    });

    const catMap: Record<string, number> = {};
    products.forEach(p => { const c = p.category ?? ''; catMap[c] = (catMap[c] || 0) + 1; });
    const lowStock = products.filter(p => (p.stock ?? 0) < 5);
    const featured = products.filter(p => Boolean(p.featured));

    return (
        <div className="space-y-5">
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: 'Total', val: products.length, col: '#B38B21' },
                    { label: 'Featured', val: featured.length, col: '#6366f1' },
                    { label: 'Low Stock', val: lowStock.length, col: lowStock.length > 0 ? '#ef4444' : '#10b981' },
                    { label: 'New Items', val: products.filter(p => Boolean(p.new || p.is_new)).length, col: '#B38B21' },
                ].map(s => (
                    <div key={s.label} className="bg-[#0a0a0a] border border-white/5 rounded-xl p-4">
                        <p className="text-[9px] text-white/30 uppercase tracking-widest mb-1">{s.label}</p>
                        <p className="text-2xl font-black" style={{ color: s.col }}>{s.val}</p>
                    </div>
                ))}
            </div>

            {/* Low stock banner */}
            {lowStock.length > 0 && (
                <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4">
                    <p className="text-xs font-black text-red-400 flex items-center gap-2 mb-2"><AlertTriangle size={13} /> Low Stock Alert</p>
                    <div className="flex flex-wrap gap-2">
                        {lowStock.map(p => <span key={p.id} className="text-[10px] bg-red-500/10 text-red-400 px-2 py-1 rounded-lg font-bold">{p.name ?? '(unnamed)'} ({p.stock} left)</span>)}
                    </div>
                </div>
            )}

            {/* Filters + Add */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
                <div className="flex items-center gap-2 overflow-x-auto bb-scrollbar min-w-0 flex-1 pb-1 -mx-0.5 px-0.5">
                    {cats.map(c => (
                        <button key={c} onClick={() => setCatFilter(c)}
                            className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${catFilter === c ? 'bg-[#B38B21] text-black' : 'bg-white/5 text-white/40 hover:text-white'}`}>
                            {c}{' '}
                            <span className="opacity-70">
                                ({c === 'All' ? products.length : (catMap[c] ?? 0)})
                            </span>
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <SearchInput value={q} onChange={setQ} placeholder="Search shop..." />
                    {canEdit && (
                        <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-2 bg-[#B38B21] text-black font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-[#D4AF37] transition-all">
                            <Plus size={12} /> Add Product
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="text-center py-12 text-white/30 text-sm">Loading products...</div>
            ) : (
                <TableWrapper>
                    <thead><tr>
                        <Th></Th><Th>Name</Th><Th>Category</Th><Th>Price</Th><Th>Stock</Th><Th>Rating</Th><Th>Options</Th><Th>Feature</Th>
                        {canEdit && <Th>Actions</Th>}
                    </tr></thead>
                    <tbody>
                        {filtered.length === 0 && <tr><td colSpan={9} className="py-10 text-center text-white/20 text-sm">No products</td></tr>}
                        {filtered.map(p => (
                            <tr key={p.id} className="hover:bg-white/[0.02] transition-all">
                                <Td>
                                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden shrink-0">
                                        {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-contain" /> : <Box size={14} className="text-white/20" />}
                                    </div>
                                </Td>
                                <Td>
                                    <p className="text-xs font-black text-white">{p.name}</p>
                                    {Boolean(p.new || p.is_new) && <span className="text-[8px] bg-[#B38B21]/20 text-[#B38B21] px-1.5 py-0.5 rounded-full font-black uppercase">New</span>}
                                </Td>
                                <Td><span className="text-[10px] text-white/40 font-bold">{p.category}</span></Td>
                                <Td>
                                    <span className="text-xs font-black text-white">{formatCurrency(p.price)}</span>
                                    {p.discount != null && Number(p.discount) > 0 && (
                                        <span className="ml-1 text-[9px] text-red-400 font-bold">-{p.discount}%</span>
                                    )}
                                </Td>
                                <Td><span className={`text-xs font-black ${(p.stock ?? 0) < 5 ? 'text-red-400' : 'text-white/60'}`}>{p.stock ?? '—'}</span></Td>
                                <Td><span className="text-[10px] text-[#B38B21] font-black">{p.rating ? `★ ${p.rating}` : '—'}</span></Td>
                                <Td>
                                    <div className="flex gap-1 flex-wrap">
                                        {((p as any).colors || []).slice(0, 2).map((c: string) => <span key={c} className="text-[8px] bg-white/5 text-white/40 px-1.5 py-0.5 rounded-md">{c}</span>)}
                                        {((p as any).storage || []).slice(0, 2).map((s: string) => <span key={s} className="text-[8px] bg-white/5 text-white/40 px-1.5 py-0.5 rounded-md">{s}</span>)}
                                    </div>
                                </Td>
                                {/* Featured toggle */}
                                <Td>
                                    <button type="button" onClick={(e) => { e.stopPropagation(); void toggleFeatured(p.id); }}
                                        title="Toggle homepage feature"
                                        className={`p-1.5 rounded-lg transition-all ${Boolean((p as any).featured) ? 'bg-[#B38B21]/20 text-[#B38B21]' : 'bg-white/5 text-white/20 hover:text-[#B38B21] hover:bg-[#B38B21]/10'}`}>
                                        <Star size={13} fill={Boolean((p as any).featured) ? 'currentColor' : 'none'} />
                                    </button>
                                </Td>
                                {canEdit && (
                                    <Td>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg bg-white/5 hover:bg-[#B38B21]/20 text-white/30 hover:text-[#B38B21] transition-all"><Edit2 size={12} /></button>
                                            <button onClick={() => del(p.id)} className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-all"><Trash2 size={12} /></button>
                                        </div>
                                    </Td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </TableWrapper>
            )}

            {showForm && (
                <Modal isLight={isLight} onClose={() => { setShowForm(false); setError(''); }} maxW="max-w-5xl">
                    <ModalClose isLight={isLight} onClose={() => { setShowForm(false); setError(''); }} />
                    <AdminProductForm
                        isLight={isLight}
                        draft={draft}
                        setDraft={setDraft}
                        colorIn={colorIn}
                        setColorIn={setColorIn}
                        storageIn={storageIn}
                        setStorageIn={setStorageIn}
                        ramIn={ramIn}
                        setRamIn={setRamIn}
                        specsIn={specsIn}
                        setSpecsIn={setSpecsIn}
                        onAddChip={addChip}
                        onRemoveChip={rmChip}
                        skuMatrixEnabled={skuMatrixEnabled}
                        setSkuMatrixEnabled={setSkuMatrixEnabled}
                        skuRows={skuRows}
                        setSkuRows={setSkuRows}
                        saving={saving}
                        error={error}
                        onSubmit={submitForm}
                    />
                </Modal>
            )}
        </div>
    );
};
