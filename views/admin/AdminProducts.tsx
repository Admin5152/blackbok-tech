import React, { useState, useEffect } from 'react';
import { Package, Plus, Edit2, Trash2, Save, X, AlertTriangle, Box, Star } from 'lucide-react';
import { SearchInput, Modal, ModalClose, Td, Th, TableWrapper, PROD_KEY } from './adminUtils';
import {
    getProducts, createProduct, updateProduct, deleteProduct
} from '../../lib/api';
// Products are sourced exclusively from Supabase.
import type { Product } from '../../types';
import { formatCurrency } from '../../lib/utils';

interface Props { canEdit?: boolean; }

const CATEGORIES = ['iPhone', 'Laptop', 'Gaming', 'Accessories', 'Audio', 'Tablet', 'Trades'] as const;

type ProductDraft = Partial<Product> & {
    colors?: string[]; storage?: string[]; ram?: string[]; specs?: string[];
    featured?: boolean;
};

const EMPTY: ProductDraft = {
    name: '', price: 0, category: 'iPhone', description: '', image: '',
    stock: 10, rating: 4.5, discount: undefined, new: false,
    colors: [], storage: [], ram: [], specs: [], featured: false,
};

export const AdminProducts: React.FC<Props> = ({ canEdit = true }) => {
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
    const [error, setError] = useState('');

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

    const openAdd = () => { setDraft({ ...EMPTY }); setColorIn(''); setStorageIn(''); setRamIn(''); setSpecsIn(''); setError(''); setShowForm(true); };
    const openEdit = (p: Product) => { setDraft({ ...p } as any); setColorIn(''); setStorageIn(''); setRamIn(''); setSpecsIn(''); setError(''); setShowForm(true); };

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
        setSaving(true); setError('');
        try {
            if (draft.id) {
                await updateProduct(draft.id, {
                    name: draft.name,
                    description: draft.description || '',
                    price: priceNum,
                    image: draft.image || '',
                    category: draft.category || 'iPhone',
                    stock: draft.stock != null ? Number(draft.stock) : 0,
                    rating: draft.rating != null ? Number(draft.rating) : undefined,
                    discount: draft.discount != null ? Number(draft.discount) : undefined,
                    new: draft.new ?? false,
                    reviewCount: (draft as any).reviewCount,
                    colors: draft.colors,
                    storage: draft.storage,
                    ram: draft.ram,
                    specs: draft.specs,
                    featured: Boolean((draft as any).featured),
                });
            } else {
                await createProduct({
                    name: draft.name!,
                    description: draft.description || '',
                    price: priceNum,
                    image: draft.image || '',
                    category: draft.category || 'iPhone',
                    stock: draft.stock ?? 10,
                    rating: draft.rating ?? 4.5,
                    discount: draft.discount != null ? Number(draft.discount) : undefined,
                    new: draft.new ?? false,
                    reviewCount: 0,
                    colors: draft.colors,
                    storage: draft.storage,
                    ram: draft.ram,
                    specs: draft.specs?.length ? draft.specs : [],
                    featured: Boolean((draft as any).featured),
                });
            }
            setShowForm(false);
            setDraft(EMPTY);
            await load({ silent: true });
            window.dispatchEvent(new CustomEvent('products:refresh'));
        } catch (e: any) {
            setError('Save failed: ' + (e.message || 'Unknown error'));
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
        if (!arr.includes(val.trim())) setDraft({ ...draft, [field]: [...arr, val.trim()] });
        clear();
    };
    const rmChip = (field: 'colors' | 'storage' | 'ram' | 'specs', val: string) =>
        setDraft({ ...draft, [field]: ((draft[field] as string[] | undefined) || []).filter(x => x !== val) });

    const cats = ['All', ...CATEGORIES];
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
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                    {cats.map(c => (
                        <button key={c} onClick={() => setCatFilter(c)}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${catFilter === c ? 'bg-[#B38B21] text-black' : 'bg-white/5 text-white/40 hover:text-white'}`}>
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

            {/* Product Form Modal */}
            {showForm && (
                <Modal onClose={() => { setShowForm(false); setError(''); }} maxW="max-w-xl">
                    <ModalClose onClose={() => { setShowForm(false); setError(''); }} />
                    <div className="p-6 overflow-y-auto max-h-[88vh]">
                        <h3 className="text-base font-black text-white mb-5">{draft.id ? 'Edit Product' : 'Add New Product'}</h3>

                        {error && <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl px-4 py-3">{error}</div>}

                        <div className="space-y-4">
                            {/* Name + Price */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-white/30 block mb-1">Product Name *</label>
                                    <input placeholder="e.g. iPhone 16 Pro Max" value={draft.name ?? ''}
                                        onChange={e => setDraft({ ...draft, name: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-[#B38B21]/50 focus:outline-none" />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-white/30 block mb-1">Price (GH₵) *</label>
                                    <input type="number" placeholder="0.00" value={draft.price ?? ''}
                                        onChange={e => setDraft({ ...draft, price: parseFloat(e.target.value) || 0 })}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-[#B38B21]/50 focus:outline-none" />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-white/30 block mb-1">Category</label>
                                    <select value={draft.category ?? 'iPhone'} onChange={e => setDraft({ ...draft, category: e.target.value as any })}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-[#B38B21]/50 focus:outline-none">
                                        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                                {[['Stock', 'stock'], ['Discount (%)', 'discount'], ['Rating (0-5)', 'rating']].map(([l, k]) => (
                                    <div key={k}>
                                        <label className="text-[9px] font-black uppercase tracking-widest text-white/30 block mb-1">{l}</label>
                                        <input type="number" placeholder={l} value={(draft as any)[k] ?? ''}
                                            onChange={e => setDraft({ ...draft, [k]: parseFloat(e.target.value) || 0 })}
                                            className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-[#B38B21]/50 focus:outline-none" />
                                    </div>
                                ))}
                            </div>

                            {/* Image URL */}
                            <div>
                                <label className="text-[9px] font-black uppercase tracking-widest text-white/30 block mb-1">Image URL</label>
                                <input type="text" placeholder="https://..." value={draft.image ?? ''}
                                    onChange={e => setDraft({ ...draft, image: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-[#B38B21]/50 focus:outline-none" />
                                {draft.image && (
                                    <img src={draft.image} alt="" className="mt-2 h-16 w-auto object-contain rounded-xl bg-white/5 p-2"
                                        onError={e => (e.currentTarget.style.display = 'none')} />
                                )}
                            </div>

                            {/* Description */}
                            <div>
                                <label className="text-[9px] font-black uppercase tracking-widest text-white/30 block mb-1">Description</label>
                                <textarea rows={2} placeholder="Product description..." value={draft.description ?? ''}
                                    onChange={e => setDraft({ ...draft, description: e.target.value })}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-sm resize-none focus:border-[#B38B21]/50 focus:outline-none" />
                            </div>

                            {/* Chip fields */}
                            <ChipField label="Color Options" chips={draft.colors || []} inputVal={colorIn} setInputVal={setColorIn}
                                placeholder="e.g. Black Titanium" onAdd={() => addChip('colors', colorIn, () => setColorIn(''))} onRemove={v => rmChip('colors', v)} />
                            <ChipField label="Storage Options" chips={draft.storage || []} inputVal={storageIn} setInputVal={setStorageIn}
                                placeholder="e.g. 256GB" onAdd={() => addChip('storage', storageIn, () => setStorageIn(''))} onRemove={v => rmChip('storage', v)} />
                            <ChipField label="RAM Options" chips={draft.ram || []} inputVal={ramIn} setInputVal={setRamIn}
                                placeholder="e.g. 16GB" onAdd={() => addChip('ram', ramIn, () => setRamIn(''))} onRemove={v => rmChip('ram', v)} />
                            <ChipField label="Spec highlights (PDP)" chips={draft.specs || []} inputVal={specsIn} setInputVal={setSpecsIn}
                                placeholder="e.g. A18 chip, Ceramic Shield" onAdd={() => addChip('specs', specsIn, () => setSpecsIn(''))} onRemove={v => rmChip('specs', v)} />

                            {/* Checkboxes */}
                            <div className="flex gap-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={draft.new ?? false} onChange={e => setDraft({ ...draft, new: e.target.checked })} className="accent-[#B38B21]" />
                                    <span className="text-xs text-white/50">Mark as New</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={(draft as any).featured ?? false} onChange={e => setDraft({ ...draft, featured: e.target.checked })} className="accent-[#B38B21]" />
                                    <span className="text-xs text-white/50">⭐ Feature on Homepage</span>
                                </label>
                            </div>

                            <button type="button" onClick={submitForm} disabled={saving || !draft.name?.trim() || !Number.isFinite(Number(draft.price)) || Number(draft.price) < 0}
                                className="w-full py-3 bg-[#B38B21] text-black font-black text-xs uppercase tracking-widest rounded-xl hover:bg-[#D4AF37] transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                                <Save size={14} /> {saving ? 'Saving...' : (draft.id ? 'Save Changes' : 'Add Product')}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

// ── ChipField ──────────────────────────────────────────────────────────────────
const ChipField = ({ label, chips, inputVal, setInputVal, placeholder, onAdd, onRemove }: {
    label: string; chips: string[]; inputVal: string; setInputVal: (v: string) => void;
    placeholder: string; onAdd: () => void; onRemove: (v: string) => void;
}) => (
    <div>
        <label className="text-[9px] font-black uppercase tracking-widest text-white/30 block mb-1">{label}</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
            {chips.map(c => (
                <span key={c} className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white/60">
                    {c}
                    <button onClick={() => onRemove(c)} className="text-white/30 hover:text-red-400 transition-colors"><X size={10} /></button>
                </span>
            ))}
        </div>
        <div className="flex gap-2">
            <input value={inputVal} onChange={e => setInputVal(e.target.value)} placeholder={placeholder}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), onAdd())}
                className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-[#B38B21]/50 focus:outline-none" />
            <button type="button" onClick={onAdd} className="px-3 py-2 bg-white/5 hover:bg-[#B38B21]/20 text-white/40 hover:text-[#B38B21] border border-white/10 rounded-xl text-xs font-black transition-all">Add chip</button>
        </div>
    </div>
);
