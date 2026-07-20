/**
 * Admin Shop product list — filters, health saved views, form modal, CSV bulk.
 *
 * WHY: Staff need catalog CRUD plus ops checks (missing trade_model / SIM)
 * without leaving the admin shell.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { Package, Plus, Edit2, Trash2, AlertTriangle, Box, Star, FileSpreadsheet } from 'lucide-react';
import { SearchInput, Modal, ModalClose, Td, Th, TableWrapper, EmptyState, PROD_KEY } from './adminUtils';
import {
    getProductsAdmin, createProduct, updateProduct, deleteProduct,
    syncProductVariants, clearProductVariants, addProductImage,
    appendAuditNote, friendlyProductActionError, type SkuVariantInput,
} from '../../lib/api';
import { ConfirmDeleteDialog } from '../../components/ConfirmDeleteDialog';
import {
    parseSkuVariants,
    skuMatrixEnabledForProduct,
    syncSkuRowsFromChips,
    canUseSkuMatrix,
    totalSkuStock,
    chipsFromSkuRows,
    findDuplicateSkuKeys,
    autoGenerateSku,
    isAppleMissingTradeModel,
    isIphone14PlusMissingSim,
} from '../../lib/productSkuMatrix';
import type { SkuMatrixRow } from '../../lib/productSkuMatrix';
import { AdminProductForm } from './AdminProductForm';
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CONDITIONS,
  PRODUCT_STATUSES,
  type ProductDraft,
} from './adminProductConstants';
import type { Product } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { useAppContext } from '../../lib/appContext';

interface Props { canEdit?: boolean; theme?: 'light' | 'dark'; }

type HealthView = 'all' | 'apple_missing_trade' | 'iphone14_missing_sim';

const EMPTY: ProductDraft = {
    name: '', price: 0, category: 'iPhone', description: '', image: '',
    stock: 10, rating: 4.5, discount: undefined, new: false,
    colors: [], storage: [], ram: [], specs: [], sim_types: [], featured: false,
    brand: 'Apple', condition: 'new', status: 'active', trade_model: null,
    currency: 'GHS',
    images: [], specifications: {}, specificationsJson: '{}',
};

/** Letter O in a numeric field often means OCR/typo for digit 0. */
function hasLetterOInNumeric(raw: string): boolean {
    return /[Oo]/.test(raw) && /[0-9]/.test(raw.replace(/[Oo]/g, '0'));
}

type CsvPreviewRow = {
    line: number;
    name: string;
    price: number;
    category: string;
    brand: string;
    condition: string;
    status: string;
    trade_model: string | null;
    stock: number;
    errors: string[];
    valid: boolean;
};

function parseCsvText(text: string): CsvPreviewRow[] {
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter((l) => l.trim());
    if (lines.length < 2) return [];
    const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const idx = (name: string) => header.indexOf(name);
    const rows: CsvPreviewRow[] = [];
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map((c) => c.trim());
        const get = (name: string) => {
            const j = idx(name);
            return j >= 0 ? (cols[j] ?? '') : '';
        };
        const priceRaw = get('price');
        const stockRaw = get('stock') || '0';
        const errors: string[] = [];
        const name = get('name');
        if (!name) errors.push('name required');
        if (hasLetterOInNumeric(priceRaw)) errors.push('price may contain letter O instead of 0');
        if (hasLetterOInNumeric(stockRaw)) errors.push('stock may contain letter O instead of 0');
        const price = Number(priceRaw.replace(/,/g, ''));
        if (!Number.isFinite(price) || price < 0) errors.push('price must be a non-negative number');
        const stock = Number(stockRaw.replace(/,/g, ''));
        if (!Number.isFinite(stock) || stock < 0 || !Number.isInteger(stock)) {
            errors.push('stock must be a non-negative integer');
        }
        const status = (get('status') || 'active').toLowerCase();
        if (!PRODUCT_STATUSES.includes(status as (typeof PRODUCT_STATUSES)[number])) {
            errors.push('invalid status');
        }
        rows.push({
            line: i + 1,
            name,
            price: Number.isFinite(price) ? price : 0,
            category: get('category') || 'iPhone',
            brand: get('brand') || 'Apple',
            condition: get('condition') || 'new',
            status,
            trade_model: get('trade_model') || null,
            stock: Number.isFinite(stock) ? Math.floor(stock) : 0,
            errors,
            valid: errors.length === 0,
        });
    }
    return rows;
}

export const AdminProducts: React.FC<Props> = ({ canEdit = true, theme = 'dark' }) => {
    const { notify } = useAppContext();
    const isLight = theme === 'light';
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [saving, setSaving] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<Product | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [q, setQ] = useState('');
    const [catFilter, setCatFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [conditionFilter, setConditionFilter] = useState('All');
    const [healthView, setHealthView] = useState<HealthView>('all');
    const [showForm, setShowForm] = useState(false);
    const [draft, setDraft] = useState<ProductDraft>(EMPTY);
    const [colorIn, setColorIn] = useState('');
    const [storageIn, setStorageIn] = useState('');
    const [ramIn, setRamIn] = useState('');
    const [simIn, setSimIn] = useState('');
    const [specsIn, setSpecsIn] = useState('');
    const [skuMatrixEnabled, setSkuMatrixEnabled] = useState(false);
    const [skuRows, setSkuRows] = useState<SkuMatrixRow[]>([]);
    const [error, setError] = useState('');
    const [showCsv, setShowCsv] = useState(false);
    const [csvText, setCsvText] = useState('');
    const [csvPreview, setCsvPreview] = useState<CsvPreviewRow[]>([]);
    const [csvBusy, setCsvBusy] = useState(false);
    const [csvResult, setCsvResult] = useState('');

    const resetSkuState = (p?: Product | ProductDraft) => {
        const colors = p?.colors || [];
        const storage = p?.storage || [];
        const ram = p?.ram || [];
        const simTypes =
            (p as ProductDraft)?.sim_types ||
            Array.from(
              new Set(
                parseSkuVariants(p?.variants)
                  .map((r) => r.sim_type)
                  .filter(Boolean),
              ),
            );
        const fromDb = parseSkuVariants(p?.variants);
        const rows =
            fromDb.length > 0
                ? fromDb
                : canUseSkuMatrix(colors, storage, ram, simTypes)
                  ? syncSkuRowsFromChips(colors, storage, ram, [], simTypes)
                  : [];
        setSkuRows(rows);
        setSkuMatrixEnabled(p ? skuMatrixEnabledForProduct(p as Product) : false);
    };

    const applyDraftChips = (next: ProductDraft) => {
        setDraft(next);
        const colors = next.colors || [];
        const storage = next.storage || [];
        const ram = next.ram || [];
        const simTypes = next.sim_types || [];
        if (!canUseSkuMatrix(colors, storage, ram, simTypes)) {
            if (!parseSkuVariants(next.variants).length) {
                setSkuMatrixEnabled(false);
                setSkuRows([]);
            }
            return;
        }
        setSkuMatrixEnabled(true);
        setSkuRows((prev) => syncSkuRowsFromChips(colors, storage, ram, prev, simTypes));
    };

    const load = async (opts?: { silent?: boolean }) => {
        if (!opts?.silent) setLoading(true);
        setLoadError('');
        try {
            const remote = await getProductsAdmin();
            setProducts(remote);
            localStorage.setItem(PROD_KEY, JSON.stringify(remote));
        } catch (e) {
            console.error('Failed to load products from Supabase:', e);
            setProducts([]);
            setLoadError(friendlyProductActionError(e, 'load'));
        } finally {
            if (!opts?.silent) setLoading(false);
        }
    };

    useEffect(() => { void load(); }, []);

    const openAdd = () => {
        setDraft({ ...EMPTY });
        setColorIn(''); setStorageIn(''); setRamIn(''); setSimIn(''); setSpecsIn('');
        setSkuRows([]); setSkuMatrixEnabled(false);
        setError(''); setShowForm(true);
    };
    const openEdit = (p: Product) => {
        const simTypes = Array.from(
          new Set(parseSkuVariants(p.variants).map((r) => r.sim_type).filter(Boolean)),
        );
        const spec = p.specifications;
        setDraft({
            ...p,
            sim_types: simTypes,
            images: p.images || [],
            specifications: spec ?? {},
            specificationsJson: spec && typeof spec === 'object' ? JSON.stringify(spec, null, 2) : '{}',
        } as ProductDraft);
        setColorIn(''); setStorageIn(''); setRamIn(''); setSimIn(''); setSpecsIn('');
        resetSkuState({ ...p, sim_types: simTypes } as ProductDraft);
        setError(''); setShowForm(true);
    };

    const requestDelete = (p: Product) => {
        setPendingDelete(p);
    };

    const confirmDelete = async () => {
        if (!pendingDelete) return;
        setDeleting(true);
        try {
            const result = await deleteProduct(pendingDelete.id);
            await load({ silent: true });
            window.dispatchEvent(new CustomEvent('products:refresh'));
            setPendingDelete(null);
            if (result.mode === 'archived') {
                notify?.(result.reason, 'warning');
            } else {
                notify?.(`Deleted “${pendingDelete.name}”.`, 'success');
            }
        } catch (e) {
            notify?.(friendlyProductActionError(e, 'delete'), 'error');
        } finally {
            setDeleting(false);
        }
    };

    const toggleStatus = async (p: Product, next: string) => {
        const prev = String(p.status || 'active');
        // Optimistic — rollback on error
        setProducts((list) => list.map((x) => (x.id === p.id ? { ...x, status: next } : x)));
        try {
            await updateProduct(p.id, { status: next });
            window.dispatchEvent(new CustomEvent('products:refresh'));
        } catch (e) {
            setProducts((list) => list.map((x) => (x.id === p.id ? { ...x, status: prev } : x)));
            notify?.(friendlyProductActionError(e, 'update'), 'error');
        }
    };

    const toggleFeatured = async (id: string) => {
        const product = products.find(p => p.id === id);
        if (!product) return;
        const nextFeatured = !Boolean(product.featured);
        setProducts((list) =>
            list.map((x) => (x.id === id ? { ...x, featured: nextFeatured } : x)),
        );
        try {
            await updateProduct(id, { featured: nextFeatured });
            window.dispatchEvent(new CustomEvent('products:refresh'));
        } catch (e) {
            setProducts((list) =>
                list.map((x) => (x.id === id ? { ...x, featured: !nextFeatured } : x)),
            );
            notify?.(friendlyProductActionError(e, 'update'), 'error');
        }
    };

    const submitForm = async () => {
        const priceNum = Number(draft.price);
        if (!draft.name?.trim() || !Number.isFinite(priceNum) || priceNum < 0) {
            setError('Name and price are required.');
            return;
        }
        if (skuMatrixEnabled && skuRows.length === 0) {
            setError('Add Color / Storage / RAM options, turn on stock per version, and wait for rows to appear (or click Create versions).');
            return;
        }
        if (
            canUseSkuMatrix(
                draft.colors || [],
                draft.storage || [],
                draft.ram || [],
                draft.sim_types || [],
            ) &&
            (!skuMatrixEnabled || skuRows.length === 0)
        ) {
            setError(
                'You added Color / Storage / RAM / SIM options — turn on stock per version and create versions so the shop and trade-in only show real options.',
            );
            return;
        }
        if (skuMatrixEnabled && skuRows.length > 0) {
            const dups = findDuplicateSkuKeys(skuRows);
            if (dups.length) {
                setError('Duplicate combinations (color / storage / RAM / SIM). Fix duplicates before saving.');
                return;
            }
        }

        setSaving(true); setError('');
        const useMatrix = skuMatrixEnabled && skuRows.length > 0;
        const matrixStock = useMatrix ? totalSkuStock(skuRows) : (draft.stock != null ? Number(draft.stock) : 0);
        const derived = useMatrix ? chipsFromSkuRows(skuRows) : null;

        try {
            let productId = draft.id;
            const productPayload = {
                name: draft.name,
                description: draft.description || '',
                price: priceNum,
                image: draft.image || '',
                category: draft.category || 'iPhone',
                brand: draft.brand,
                condition: draft.condition,
                status: draft.status || 'active',
                trade_model: draft.trade_model ?? null,
                currency: draft.currency || 'GHS',
                stock: matrixStock,
                rating: draft.rating != null ? Number(draft.rating) : undefined,
                discount: draft.discount != null ? Number(draft.discount) : undefined,
                new: draft.new ?? false,
                colors: derived?.colors ?? draft.colors,
                storage: derived?.storage ?? draft.storage,
                ram: derived?.ram ?? draft.ram,
                specs: draft.specs,
                featured: Boolean(draft.featured),
                specifications: draft.specifications ?? {},
            };

            if (draft.id) {
                await updateProduct(draft.id, {
                    ...productPayload,
                    reviewCount: draft.reviewCount,
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
                        sim_type: r.sim_type || null,
                        stock: r.stock,
                        price_modifier: r.price_modifier,
                        price: r.price != null && Number.isFinite(Number(r.price)) ? Number(r.price) : null,
                        is_active: r.is_active !== false,
                        image_url: r.image_url || null,
                        sku: (r.sku || '').trim() || autoGenerateSku(r),
                    }));
                    await syncProductVariants(productId, variantPayload);
                } else {
                    await clearProductVariants(productId);
                }

                // Flush pending gallery uploads created before the product had an id
                const pending = (draft.images || []).filter((img) => String(img.id).startsWith('pending-'));
                for (const img of pending) {
                    await addProductImage(productId, {
                        url: img.url,
                        sort_order: img.sort_order,
                        is_primary: Boolean(img.is_primary),
                        variant_id: img.variant_id ?? null,
                    });
                }
            }

            setShowForm(false);
            setDraft(EMPTY);
            setSkuRows([]);
            setSkuMatrixEnabled(false);
            await load({ silent: true });
            window.dispatchEvent(new CustomEvent('products:refresh'));
        } catch (e) {
            const msg = friendlyProductActionError(e, 'save');
            if (/stock versions|product setup|Duplicate/i.test(msg)) {
                setError(msg);
            } else if (/Duplicate combination|Duplicate SKU|duplicate/i.test(String((e as Error)?.message || ''))) {
                setError(String((e as Error).message));
            } else {
                setError(msg);
            }
            notify?.(msg, 'error');
        } finally {
            setSaving(false);
        }
    };

    const addChip = (field: 'colors' | 'storage' | 'ram' | 'specs' | 'sim_types', val: string, clear: () => void) => {
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
    const rmChip = (field: 'colors' | 'storage' | 'ram' | 'specs' | 'sim_types', val: string) => {
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

    const healthCounts = useMemo(() => ({
        apple_missing_trade: products.filter(isAppleMissingTradeModel).length,
        iphone14_missing_sim: products.filter(isIphone14PlusMissingSim).length,
    }), [products]);

    const filtered = products.filter(p => {
        const mQ = String(p.name ?? '').toLowerCase().includes(q.toLowerCase())
            || String(p.trade_model ?? '').toLowerCase().includes(q.toLowerCase());
        const mC = catFilter === 'All' || p.category === catFilter;
        const st = String(p.status || 'active').toLowerCase();
        const mS = statusFilter === 'All' || st === statusFilter.toLowerCase();
        const cond = String(p.condition || '').toLowerCase();
        const mCond = conditionFilter === 'All' || cond === conditionFilter.toLowerCase();
        let mHealth = true;
        if (healthView === 'apple_missing_trade') mHealth = isAppleMissingTradeModel(p);
        if (healthView === 'iphone14_missing_sim') mHealth = isIphone14PlusMissingSim(p);
        return mQ && mC && mS && mCond && mHealth;
    });

    const catMap: Record<string, number> = {};
    products.forEach(p => { const c = p.category ?? ''; catMap[c] = (catMap[c] || 0) + 1; });
    const lowStock = products.filter(p => {
        const stock = totalSkuStock(parseSkuVariants(p.variants)) || (p.stock ?? 0);
        return stock < 5;
    });
    const featured = products.filter(p => Boolean(p.featured));

    const productStock = (p: Product) => {
        const fromVar = totalSkuStock(parseSkuVariants(p.variants));
        return fromVar > 0 || parseSkuVariants(p.variants).length > 0 ? fromVar : (p.stock ?? 0);
    };

    const runCsvPreview = (text: string) => {
        setCsvText(text);
        setCsvPreview(parseCsvText(text));
        setCsvResult('');
    };

    const commitCsv = async () => {
        const valid = csvPreview.filter((r) => r.valid);
        if (!valid.length) return;
        setCsvBusy(true);
        setCsvResult('');
        let ok = 0;
        let fail = 0;
        const notes: string[] = [];
        for (const row of valid) {
            try {
                const created = await createProduct({
                    name: row.name,
                    price: row.price,
                    category: row.category,
                    brand: row.brand,
                    condition: row.condition,
                    status: row.status,
                    trade_model: row.trade_model,
                    stock: row.stock,
                    description: '',
                    image: '',
                    colors: [],
                    storage: [],
                    ram: [],
                    specs: [],
                    new: false,
                    featured: false,
                    rating: 4.5,
                    reviewCount: 0,
                });
                ok++;
                notes.push(`${created.id}:${row.name}`);
            } catch (e) {
                fail++;
                notes.push(`FAIL line ${row.line}: ${friendlyProductActionError(e, 'import')}`);
            }
        }
        const summary = `CSV import: ${ok} created, ${fail} failed`;
        void appendAuditNote('products', 'bulk-csv', `${summary}. ${notes.slice(0, 40).join('; ')}`);
        setCsvResult(summary);
        setCsvBusy(false);
        await load({ silent: true });
        window.dispatchEvent(new CustomEvent('products:refresh'));
    };

    const muted = isLight ? 'text-black/40' : 'text-white/30';
    const cardBg = isLight ? 'bg-white border-black/10' : 'bg-[#0a0a0a] border-white/5';

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: 'Total', val: products.length, col: '#B38B21' },
                    { label: 'Featured', val: featured.length, col: '#6366f1' },
                    { label: 'Low Stock', val: lowStock.length, col: lowStock.length > 0 ? '#ef4444' : '#10b981' },
                    { label: 'New Items', val: products.filter(p => Boolean(p.new || p.is_new)).length, col: '#B38B21' },
                ].map(s => (
                    <div key={s.label} className={`border rounded-xl p-4 ${cardBg}`}>
                        <p className={`text-[9px] uppercase tracking-widest mb-1 ${muted}`}>{s.label}</p>
                        <p className="text-2xl font-black" style={{ color: s.col }}>{s.val}</p>
                    </div>
                ))}
            </div>

            {lowStock.length > 0 && (
                <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4">
                    <p className="text-xs font-black text-red-400 flex items-center gap-2 mb-2"><AlertTriangle size={13} /> Low Stock Alert</p>
                    <div className="flex flex-wrap gap-2">
                        {lowStock.map(p => (
                            <span key={p.id} className="text-[10px] bg-red-500/10 text-red-400 px-2 py-1 rounded-lg font-bold">
                                {p.name ?? '(unnamed)'} ({productStock(p)} left)
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Health saved views (12f / 10g) */}
            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={() => setHealthView('all')}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase ${healthView === 'all' ? 'bg-[#B38B21] text-black' : isLight ? 'bg-black/5 text-black/50' : 'bg-white/5 text-white/40'}`}
                >
                    All products
                </button>
                <button
                    type="button"
                    onClick={() => setHealthView('apple_missing_trade')}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase ${healthView === 'apple_missing_trade' ? 'bg-amber-500 text-black' : 'bg-amber-500/10 text-amber-400'}`}
                >
                    Apple missing trade_model ({healthCounts.apple_missing_trade})
                </button>
                <button
                    type="button"
                    onClick={() => setHealthView('iphone14_missing_sim')}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase ${healthView === 'iphone14_missing_sim' ? 'bg-sky-500 text-black' : 'bg-sky-500/10 text-sky-400'}`}
                >
                    iPhone 14+ missing SIM ({healthCounts.iphone14_missing_sim})
                </button>
            </div>

            <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                    {cats.map(c => (
                        <button key={c} type="button" onClick={() => setCatFilter(c)}
                            className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${catFilter === c ? 'bg-[#B38B21] text-black' : isLight ? 'bg-black/5 text-black/45' : 'bg-white/5 text-white/40 hover:text-white'}`}>
                            {c}{' '}
                            <span className="opacity-70">
                                ({c === 'All' ? products.length : (catMap[c] ?? 0)})
                            </span>
                        </button>
                    ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border ${isLight ? 'bg-white border-black/10' : 'bg-black/40 border-white/10 text-white'}`}
                    >
                        <option value="All">Status: All</option>
                        {PRODUCT_STATUSES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                    <select
                        value={conditionFilter}
                        onChange={(e) => setConditionFilter(e.target.value)}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border ${isLight ? 'bg-white border-black/10' : 'bg-black/40 border-white/10 text-white'}`}
                    >
                        <option value="All">Condition: All</option>
                        {PRODUCT_CONDITIONS.map((c) => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                    <div className="flex-1 min-w-[140px]">
                        <SearchInput value={q} onChange={setQ} placeholder="Search name or trade-in model…" />
                    </div>
                    {canEdit && (
                        <>
                            <button type="button" onClick={() => { setShowCsv(true); setCsvResult(''); }} className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-[10px] font-black uppercase ${isLight ? 'border-black/10 text-black/60' : 'border-white/10 text-white/50 hover:text-white'}`}>
                                <FileSpreadsheet size={12} /> CSV
                            </button>
                            <button type="button" onClick={openAdd} className="flex items-center gap-1.5 px-3 py-2 bg-[#B38B21] text-black font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-[#D4AF37] transition-all">
                                <Plus size={12} /> Add Product
                            </button>
                        </>
                    )}
                </div>
            </div>

            {loading ? (
                <div className={`text-center py-12 text-sm ${muted}`}>Loading products…</div>
            ) : loadError ? (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center space-y-3">
                    <p className="text-sm text-red-400 font-bold">{loadError}</p>
                    <button type="button" onClick={() => void load()} className="px-4 py-2 bg-[#B38B21] text-black text-[10px] font-black uppercase rounded-xl">
                        Retry
                    </button>
                </div>
            ) : filtered.length === 0 ? (
                <EmptyState icon={<Package size={40} />} message={products.length === 0 ? 'No products in catalog yet' : 'No products match these filters'} />
            ) : (
                <TableWrapper>
                    <thead><tr>
                        <Th></Th><Th>Name</Th><Th>Category</Th><Th>Trade-in model</Th><Th>Price</Th><Th>Stock</Th><Th>Status</Th><Th>Feature</Th>
                        {canEdit && <Th>Actions</Th>}
                    </tr></thead>
                    <tbody>
                        {filtered.map(p => {
                            const stock = productStock(p);
                            const status = String(p.status || 'active').toLowerCase();
                            return (
                            <tr key={p.id} className="hover:bg-white/[0.02] transition-all">
                                <Td>
                                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden shrink-0">
                                        {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-contain" /> : <Box size={14} className="text-white/20" />}
                                    </div>
                                </Td>
                                <Td>
                                    <p className={`text-xs font-black ${isLight ? 'text-black' : 'text-white'}`}>{p.name}</p>
                                    {Boolean(p.new || p.is_new) && <span className="text-[8px] bg-[#B38B21]/20 text-[#B38B21] px-1.5 py-0.5 rounded-full font-black uppercase">New</span>}
                                </Td>
                                <Td><span className={`text-[10px] font-bold ${isLight ? 'text-black/45' : 'text-white/40'}`}>{p.category}</span></Td>
                                <Td>
                                    <span className={`text-[10px] font-bold ${p.trade_model ? 'text-[#B38B21]' : isLight ? 'text-black/25' : 'text-white/25'}`}>
                                        {p.trade_model || '—'}
                                    </span>
                                </Td>
                                <Td>
                                    <span className={`text-xs font-black ${isLight ? 'text-black' : 'text-white'}`}>{formatCurrency(p.price)}</span>
                                    {p.discount != null && Number(p.discount) > 0 && (
                                        <span className="ml-1 text-[9px] text-red-400 font-bold">-{p.discount}%</span>
                                    )}
                                </Td>
                                <Td><span className={`text-xs font-black ${stock < 5 ? 'text-red-400' : isLight ? 'text-black/55' : 'text-white/60'}`}>{stock}</span></Td>
                                <Td>
                                    {canEdit ? (
                                        <select
                                            value={status}
                                            onChange={(e) => void toggleStatus(p, e.target.value)}
                                            className={`border rounded-lg px-2 py-1 text-[10px] font-black uppercase ${isLight ? 'bg-white border-black/10 text-black' : 'bg-black/50 border-white/10 text-white'}`}
                                        >
                                            {PRODUCT_STATUSES.map((s) => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <span className={`text-[10px] font-black uppercase ${isLight ? 'text-black/50' : 'text-white/50'}`}>{status}</span>
                                    )}
                                </Td>
                                <Td>
                                    <button type="button" onClick={(e) => { e.stopPropagation(); void toggleFeatured(p.id); }}
                                        title="Toggle homepage feature"
                                        className={`p-1.5 rounded-lg transition-all ${Boolean(p.featured) ? 'bg-[#B38B21]/20 text-[#B38B21]' : isLight ? 'bg-black/5 text-black/25 hover:text-[#B38B21]' : 'bg-white/5 text-white/20 hover:text-[#B38B21] hover:bg-[#B38B21]/10'}`}>
                                        <Star size={13} fill={Boolean(p.featured) ? 'currentColor' : 'none'} />
                                    </button>
                                </Td>
                                {canEdit && (
                                    <Td>
                                        <div className="flex items-center gap-2">
                                            <button type="button" onClick={() => openEdit(p)} className={`p-1.5 rounded-lg transition-all ${isLight ? 'bg-black/5 text-black/40 hover:text-[#B38B21]' : 'bg-white/5 hover:bg-[#B38B21]/20 text-white/30 hover:text-[#B38B21]'}`}><Edit2 size={12} /></button>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                requestDelete(p);
                                              }}
                                              title="Delete product"
                                              className={`p-1.5 rounded-lg transition-all ${isLight ? 'bg-black/5 text-black/40 hover:text-red-500' : 'bg-white/5 hover:bg-red-500/20 text-white/30 hover:text-red-400'}`}
                                            >
                                              <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </Td>
                                )}
                            </tr>
                            );
                        })}
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
                        simIn={simIn}
                        setSimIn={setSimIn}
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
                        onSubmit={() => void submitForm()}
                    />
                </Modal>
            )}

            {showCsv && (
                <Modal isLight={isLight} onClose={() => setShowCsv(false)} maxW="max-w-3xl">
                    <ModalClose isLight={isLight} onClose={() => setShowCsv(false)} />
                    <div className="p-5 sm:p-6 space-y-4">
                        <h3 className="text-lg font-black">Bulk CSV import</h3>
                        <p className={`text-xs ${muted}`}>
                            Columns: name,price,category,brand,condition,status,trade_model,stock
                        </p>
                        <textarea
                            rows={8}
                            value={csvText}
                            onChange={(e) => runCsvPreview(e.target.value)}
                            placeholder={'name,price,category,brand,condition,status,trade_model,stock\niPhone 15,8999,iPhone,Apple,new,active,iPhone 15,5'}
                            className={`w-full rounded-xl border px-3 py-2 text-xs font-mono ${isLight ? 'bg-white border-black/10' : 'bg-black/50 border-white/10 text-white'}`}
                        />
                        <label className="inline-flex items-center gap-2 text-[10px] font-black uppercase text-[#B38B21] cursor-pointer">
                            Upload file
                            <input
                                type="file"
                                accept=".csv,text/csv"
                                className="hidden"
                                onChange={async (e) => {
                                    const f = e.target.files?.[0];
                                    if (!f) return;
                                    const text = await f.text();
                                    runCsvPreview(text);
                                    e.target.value = '';
                                }}
                            />
                        </label>
                        {csvPreview.length > 0 && (
                            <div className="max-h-48 overflow-y-auto rounded-xl border border-white/10">
                                <table className="w-full text-[10px]">
                                    <thead>
                                        <tr className="text-left text-white/40">
                                            <th className="p-2">Line</th>
                                            <th className="p-2">Name</th>
                                            <th className="p-2">Price</th>
                                            <th className="p-2">Stock</th>
                                            <th className="p-2">OK</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {csvPreview.map((r) => (
                                            <tr key={r.line} className={r.valid ? '' : 'bg-red-500/10'}>
                                                <td className="p-2">{r.line}</td>
                                                <td className="p-2">{r.name || '—'}</td>
                                                <td className="p-2">{r.price}</td>
                                                <td className="p-2">{r.stock}</td>
                                                <td className="p-2">{r.valid ? '✓' : r.errors.join('; ')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {csvResult && <p className="text-xs text-[#B38B21] font-bold">{csvResult}</p>}
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setShowCsv(false)} className="px-4 py-2 rounded-xl text-[10px] font-black uppercase border border-white/10">
                                Close
                            </button>
                            <button
                                type="button"
                                disabled={csvBusy || !csvPreview.some((r) => r.valid)}
                                onClick={() => void commitCsv()}
                                className="px-4 py-2 rounded-xl text-[10px] font-black uppercase bg-[#B38B21] text-black disabled:opacity-40"
                            >
                                {csvBusy ? 'Importing…' : `Import ${csvPreview.filter((r) => r.valid).length} rows`}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            <ConfirmDeleteDialog
                open={pendingDelete != null}
                title="Delete product?"
                message={
                    pendingDelete
                        ? `Permanently delete “${pendingDelete.name}”? If it appears on past orders, it will be archived (hidden from the shop) instead.`
                        : ''
                }
                requireTypedDelete
                busy={deleting}
                onCancel={() => !deleting && setPendingDelete(null)}
                onConfirm={() => void confirmDelete()}
            />
        </div>
    );
};
