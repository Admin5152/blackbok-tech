/**
 * Admin product create/edit form — details, options/SKUs, images, listing.
 *
 * WHY: Central staff surface for catalog CRUD; trade_model bridges to
 * trade_devices so PDP trade-in banners resolve correctly.
 */
import React, { useEffect, useMemo, useState, useRef, useCallback, type Dispatch, type SetStateAction } from 'react';
import { createPortal } from 'react-dom';
import { Save, X, Package, ImageIcon, Layers, Tag, Upload, Star } from 'lucide-react';
import type { Product, ProductImage } from '../../types';
import type { SkuMatrixRow } from '../../lib/productSkuMatrix';
import { totalSkuStock, canUseSkuMatrix, chipsFromSkuRows, IPAD_SIM_OPTIONS } from '../../lib/productSkuMatrix';
import { formatCurrency } from '../../lib/utils';
import { ProductSkuMatrix } from './ProductSkuMatrix';
import { ProductColorImageUploader } from '../../components/admin/ProductColorImageUploader';
import { getApf, type AdminProductFormStyles } from './adminProductFormStyles';
import { getTradeDevices } from '../../lib/tradeApi';
import { ensureTradeCatalogModel, getAdminDevices } from '../../lib/tradeAdminApi';
import type { TradeDeviceRow } from '../../types/supabase';
import { uploadImage, compressImage, IMAGE_FILE_ACCEPT } from '../../lib/upload';
import { validateImageFileMeta } from '../../lib/security';
import {
  addProductImage,
  upsertProductImageForVariant,
  setPrimaryProductImage,
  deleteProductImage,
  setProductImageVariant,
  updateProduct,
  friendlyProductActionError,
  normalizeProductCategory,
} from '../../lib/api';
import { friendlyError } from '../../lib/friendlyErrors';
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CONDITION_OPTIONS,
  PRODUCT_SIM_OPTIONS,
  PRODUCT_STATUSES,
  type ProductDraft,
} from './adminProductConstants';
import {
  applyAdminTaxonomyFields,
  categoryUsesBrandThenSeries,
  categoryUsesConditionSubcategory,
  categoryUsesSeriesStep,
  getCategorySeriesOptions,
  getCategorySubcategoryOptions,
  suggestBrandFromTaxonomy,
} from '../../lib/storeFilters';
import { formatSimTypeLabel } from '../../lib/productLabels';

type TabId = 'details' | 'options' | 'images' | 'listing';

type ChipFieldProps = {
  label: string;
  chips: string[];
  inputVal: string;
  setInputVal: (v: string) => void;
  placeholder: string;
  onAdd: () => void;
  onRemove: (v: string) => void;
  styles: AdminProductFormStyles;
  readOnly?: boolean;
  readOnlyNote?: string;
  /** Optional display formatter (e.g. SIM codes → Physical SIM). */
  formatChip?: (value: string) => string;
};

const ChipField: React.FC<ChipFieldProps> = ({
  label,
  chips,
  inputVal,
  setInputVal,
  placeholder,
  onAdd,
  onRemove,
  styles: s,
  readOnly,
  readOnlyNote,
  formatChip,
}) => (
  <div className={s.card}>
    <label className={s.label}>{label}</label>
    {readOnly && readOnlyNote && (
      <p className={`text-[10px] mb-2 ${s.muted}`}>{readOnlyNote}</p>
    )}
    <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
      {chips.length === 0 && <span className={`text-[10px] italic ${s.muted}`}>None yet</span>}
      {chips.map((c) => (
        <span
          key={c}
          className={`flex items-center gap-1 border rounded-lg px-2 py-1 text-[10px] font-bold ${s.chip}`}
        >
          {formatChip ? formatChip(c) : c}
          {!readOnly && (
            <button type="button" onClick={() => onRemove(c)} className="opacity-50 hover:text-red-500 transition-colors">
              <X size={10} />
            </button>
          )}
        </span>
      ))}
    </div>
    {!readOnly && (
      <div className="flex gap-2">
        <input
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), onAdd())}
          className={`${s.input} flex-1 text-xs`}
        />
        <button
          type="button"
          onClick={onAdd}
          className="px-3 py-2 bg-[#B38B21]/15 hover:bg-[#B38B21]/30 text-[#B38B21] border border-[#B38B21]/30 rounded-xl text-[10px] font-black uppercase transition-all shrink-0"
        >
          Add
        </button>
      </div>
    )}
  </div>
);

type Props = {
  draft: ProductDraft;
  setDraft: React.Dispatch<React.SetStateAction<ProductDraft>>;
  colorIn: string;
  setColorIn: (v: string) => void;
  storageIn: string;
  setStorageIn: (v: string) => void;
  ramIn: string;
  setRamIn: (v: string) => void;
  simIn: string;
  setSimIn: (v: string) => void;
  specsIn: string;
  setSpecsIn: (v: string) => void;
  onAddChip: (field: 'colors' | 'storage' | 'ram' | 'specs' | 'sim_types' | 'display_sizes', val: string, clear: () => void) => void;
  onRemoveChip: (field: 'colors' | 'storage' | 'ram' | 'specs' | 'sim_types' | 'display_sizes', val: string) => void;
  sizeIn: string;
  setSizeIn: (v: string) => void;
  skuMatrixEnabled: boolean;
  setSkuMatrixEnabled: (v: boolean) => void;
  skuRows: SkuMatrixRow[];
  setSkuRows: Dispatch<SetStateAction<SkuMatrixRow[]>>;
  skuHighlightIndices?: number[];
  skuFocusNonce?: number;
  saving: boolean;
  error: string;
  onSubmit: () => void;
  isLight?: boolean;
};

export const AdminProductForm: React.FC<Props> = ({
  draft,
  setDraft,
  isLight = false,
  colorIn,
  setColorIn,
  storageIn,
  setStorageIn,
  ramIn,
  setRamIn,
  simIn,
  setSimIn,
  sizeIn,
  setSizeIn,
  specsIn,
  setSpecsIn,
  onAddChip,
  onRemoveChip,
  skuMatrixEnabled,
  setSkuMatrixEnabled,
  skuRows,
  setSkuRows,
  skuHighlightIndices = [],
  skuFocusNonce = 0,
  saving,
  error,
  onSubmit,
}) => {
  const s = getApf(isLight);
  const [tab, setTab] = useState<TabId>('details');
  const [tradeDevices, setTradeDevices] = useState<TradeDeviceRow[]>([]);
  const [tradeSearch, setTradeSearch] = useState('');
  const [tradeOpen, setTradeOpen] = useState(false);
  const [tradeMenuPos, setTradeMenuPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const tradeInputRef = useRef<HTMLInputElement>(null);
  const [imgBusy, setImgBusy] = useState(false);
  const [imgError, setImgError] = useState('');
  const [specsJsonError, setSpecsJsonError] = useState('');

  useEffect(() => {
    if (!skuFocusNonce) return;
    setTab('options');
  }, [skuFocusNonce]);

  const priceNum = Number(draft.price) || 0;
  const chipsLocked = skuMatrixEnabled && skuRows.length > 0;
  const hasOptions = canUseSkuMatrix(
    draft.colors || [],
    draft.storage || [],
    draft.ram || [],
    draft.sim_types || [],
    draft.display_sizes || [],
  );
  const displayStock = skuMatrixEnabled && skuRows.length > 0 ? totalSkuStock(skuRows) : (draft.stock ?? 0);
  const comboCount = skuRows.length;
  const gallery = draft.images || [];
  const categoryKey = String(draft.category || 'iPhone');
  const taxonomyOptions = useMemo(
    () => getCategorySubcategoryOptions(categoryKey),
    [categoryKey],
  );
  const usesConditionTaxonomy = categoryUsesConditionSubcategory(categoryKey);
  const brandThenSeries = categoryUsesBrandThenSeries(categoryKey);
  const taxonomySelectValue = useMemo(() => {
    const raw = String(draft.taxonomy_value ?? '').trim();
    if (raw && taxonomyOptions.some((o) => o.value === raw)) return raw;
    if (usesConditionTaxonomy) {
      const cond = String(draft.condition ?? 'new').toLowerCase();
      if (cond === 'preowned' || cond === 'refurbished' || cond === 'used') {
        return taxonomyOptions.some((o) => o.value === 'used') ? 'used' : (taxonomyOptions[0]?.value ?? '');
      }
      return taxonomyOptions.some((o) => o.value === 'new') ? 'new' : (taxonomyOptions[0]?.value ?? '');
    }
    if (brandThenSeries) {
      const brand = String(draft.brand ?? '').trim();
      if (brand) {
        const byBrand = taxonomyOptions.find(
          (o) =>
            o.value.toLowerCase() === brand.toLowerCase() ||
            o.label.toLowerCase() === brand.toLowerCase() ||
            o.value.replace(/\s+/g, '').toLowerCase() === brand.replace(/\s+/g, '').toLowerCase(),
        );
        if (byBrand) return byBrand.value;
        const hay = `${brand} ${draft.subcategory ?? ''} ${draft.series ?? ''}`.toLowerCase();
        if (hay.includes('airpod') && taxonomyOptions.some((o) => o.value === 'AirPods')) return 'AirPods';
        if (hay.includes('beats') && taxonomyOptions.some((o) => o.value === 'Beats')) return 'Beats';
        if (
          (hay.includes('harman') || hay.includes('kardon')) &&
          taxonomyOptions.some((o) => o.value === 'HarmanKardon')
        ) {
          return 'HarmanKardon';
        }
      }
    }
    const sub = String(draft.subcategory ?? '').trim();
    if (sub) {
      const hit = taxonomyOptions.find(
        (o) =>
          o.value.toLowerCase() === sub.toLowerCase() ||
          o.label.toLowerCase() === sub.toLowerCase() ||
          o.value.replace(/\s+/g, '').toLowerCase() === sub.replace(/\s+/g, '').toLowerCase(),
      );
      if (hit) return hit.value;
    }
    return '';
  }, [
    draft.taxonomy_value,
    draft.condition,
    draft.subcategory,
    draft.brand,
    draft.series,
    taxonomyOptions,
    usesConditionTaxonomy,
    brandThenSeries,
  ]);

  const applyTaxonomySelection = useCallback(
    (category: string, taxonomyValue: string) => {
      const seriesAllowed = getCategorySeriesOptions(
        category,
        categoryUsesBrandThenSeries(category) ? taxonomyValue : undefined,
      );
      const keepSeries =
        draft.series && seriesAllowed.some((o) => o.value === draft.series)
          ? draft.series
          : seriesAllowed.length === 1
            ? seriesAllowed[0].value
            : null;
      const applied = applyAdminTaxonomyFields({
        category,
        taxonomyValue,
        existingCondition: draft.condition,
        series: keepSeries,
        existingSubcategory: draft.subcategory,
      });
      const suggested = suggestBrandFromTaxonomy(category, taxonomyValue);
      const cat = normalizeProductCategory(category);
      setDraft((prev) => {
        const prevSpecs =
          prev.specifications && typeof prev.specifications === 'object'
            ? { ...(prev.specifications as Record<string, unknown>) }
            : {};
        if (cat === 'Accessories') {
          prevSpecs.catalog = 'accessories';
          prevSpecs.accessory_type = taxonomyValue || null;
        } else if (cat === 'Headphones' || cat === 'Speakers') {
          prevSpecs.catalog = 'audio';
          prevSpecs.audio_type = cat === 'Speakers' ? 'speakers' : 'headphones';
          if (keepSeries) prevSpecs.series = keepSeries;
        } else if (cat === 'Laptops') {
          prevSpecs.catalog = 'laptop';
          if (keepSeries) prevSpecs.series = keepSeries;
        } else if (cat === 'Android phones') {
          prevSpecs.catalog = 'android';
          if (keepSeries) prevSpecs.series = keepSeries;
        } else if (cat === 'MacBooks') {
          prevSpecs.catalog = 'macbook';
          if (keepSeries) prevSpecs.series = keepSeries;
        } else if (cat === 'Gaming') {
          prevSpecs.catalog = 'gaming';
          prevSpecs.platform = taxonomyValue || null;
        } else if (cat === 'Smart watches' || cat === 'Apple Watches') {
          prevSpecs.catalog = 'watches';
          // Line (Ultra / Series / Galaxy) lives on series after Brand
          if (keepSeries) {
            prevSpecs.watch_group = keepSeries;
            prevSpecs.series = keepSeries;
          }
        }
        return {
          ...prev,
          category: applied.category,
          taxonomy_value: taxonomyValue || null,
          subcategory: applied.subcategory,
          condition: applied.condition,
          is_new: applied.is_new,
          new: applied.is_new,
          series: keepSeries,
          brand: suggested ?? prev.brand,
          specifications: Object.keys(prevSpecs).length ? prevSpecs : prev.specifications,
          specificationsJson: Object.keys(prevSpecs).length
            ? JSON.stringify(prevSpecs, null, 2)
            : prev.specificationsJson,
        };
      });
    },
    [draft.condition, draft.series, draft.subcategory, setDraft],
  );

  const derivedChips = useMemo(
    () => (chipsLocked ? chipsFromSkuRows(skuRows) : null),
    [chipsLocked, skuRows],
  );
  const displayColors = derivedChips?.colors ?? draft.colors ?? [];
  const displayStorage = derivedChips?.storage ?? draft.storage ?? [];
  const displayRam = derivedChips?.ram ?? draft.ram ?? [];
  const displaySimTypes = derivedChips?.sim_types ?? draft.sim_types ?? [];
  const displaySizes = derivedChips?.display_sizes ?? draft.display_sizes ?? [];
  const isTabletCategory = String(draft.category || '').toLowerCase() === 'ipad';
  const normalizedCategory = normalizeProductCategory(categoryKey);
  const isLaptopCategory = normalizedCategory === 'Laptops';
  const isAudioCategory =
    normalizedCategory === 'Headphones' || normalizedCategory === 'Speakers';
  const isAccessoryCategory = normalizedCategory === 'Accessories';
  const isGamingCategory = normalizedCategory === 'Gaming';
  const isWatchCategory =
    normalizedCategory === 'Smart watches' || normalizedCategory === 'Apple Watches';
  const isPhoneCategory =
    normalizedCategory === 'iPhone' || normalizedCategory === 'Android phones';
  const isMacCategory = normalizedCategory === 'MacBooks';
  /** Phone / tablet / Mac keep storage+SIM; laptops keep storage+RAM; audio/accessories are usually colour SKUs. */
  const showStorageOption =
    isPhoneCategory || isTabletCategory || isMacCategory || isLaptopCategory || isGamingCategory;
  const showRamOption = isLaptopCategory || isPhoneCategory || isMacCategory;
  const showSimOption = isPhoneCategory || isTabletCategory;
  const seriesOptions = categoryUsesSeriesStep(categoryKey)
    ? getCategorySeriesOptions(
        categoryKey,
        brandThenSeries ? taxonomySelectValue || undefined : undefined,
      )
    : [];
  const taxonomyPathHint = (() => {
    if (usesConditionTaxonomy && seriesOptions.length > 0) {
      return `Shop path: ${normalizedCategory} → Series → New/Used → products.`;
    }
    if (usesConditionTaxonomy) {
      return `Shop path: ${normalizedCategory} → New/Used → products.`;
    }
    if (brandThenSeries) {
      return isWatchCategory
        ? `Shop path: Smart watches → Brand (Apple / Samsung / Others) → Series → products.`
        : normalizedCategory === 'Android phones'
          ? `Shop path: Android phones → Brand (Samsung / Google / Motorola) → Series → products.`
          : `Shop path: ${normalizedCategory} → Brand → Series → products.`;
    }
    if (isAccessoryCategory) {
      return `Shop path: Accessories → Type (Cases / Protectors / Chargers) → products.`;
    }
    if (isWatchCategory) {
      return `Shop path: Smart watches → Brand (Apple / Samsung / Others) → Series → products.`;
    }
    if (isGamingCategory) {
      return `Shop path: ${normalizedCategory} → Brand/platform → products.`;
    }
    return null;
  })();
  const simQuickPicks = isTabletCategory ? IPAD_SIM_OPTIONS : PRODUCT_SIM_OPTIONS;

  const colorImages = useMemo(() => {
    const map: Record<string, string> = {};
    for (const color of displayColors) {
      const hit = skuRows.find((r) => r.color === color && String(r.image_url ?? '').trim());
      if (hit?.image_url) map[color] = String(hit.image_url).trim();
    }
    return map;
  }, [displayColors, skuRows]);

  const applyColorImageToSkus = (color: string, url: string) => {
    const trimmed = url.trim();
    setSkuRows((rows) =>
      rows.map((r) =>
        r.color === color ? { ...r, image_url: trimmed || undefined } : r,
      ),
    );
  };

  const linkColorImageToGallery = async (color: string, url: string) => {
    if (!draft.id || !url.trim()) return;
    const variantId = skuRows.find((r) => r.color === color && r.id)?.id;
    if (!variantId) return;
    try {
      const row = await upsertProductImageForVariant(draft.id, variantId, url.trim());
      setDraft((d) => {
        const imgs = d.images || [];
        const idx = imgs.findIndex((g) => g.variant_id === variantId);
        if (idx >= 0) {
          const next = [...imgs];
          next[idx] = { ...next[idx], url: row.url, variant_id: variantId };
          return { ...d, images: next };
        }
        return { ...d, images: [...imgs, row] };
      });
    } catch (e) {
      console.warn('colour gallery link failed:', e);
    }
  };

  const handleColorImageUpload = async (color: string, file: File) => {
    setImgBusy(true);
    setImgError('');
    try {
      let toUpload = file;
      try {
        toUpload = await compressImage(file, 1600, 0.85);
      } catch {
        toUpload = file;
      }
      const url = await uploadImage(toUpload, 'product-images');
      if (!url) throw new Error('Upload returned no URL');
      applyColorImageToSkus(color, url);
      await linkColorImageToGallery(color, url);
    } catch (e) {
      setImgError(friendlyError(e, 'upload this colour photo'));
    } finally {
      setImgBusy(false);
    }
  };

  const handleColorImageUrl = (color: string, url: string) => {
    applyColorImageToSkus(color, url);
    if (draft.id && url.trim()) {
      void linkColorImageToGallery(color, url);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Include inactive catalog stubs so upgrade-target models appear here too.
        const devices = await getAdminDevices(true);
        if (!cancelled) setTradeDevices(devices);
      } catch (e) {
        console.warn('getAdminDevices failed, falling back to active trade devices:', e);
        try {
          const devices = await getTradeDevices();
          if (!cancelled) setTradeDevices(devices);
        } catch (e2) {
          console.warn('getTradeDevices failed:', e2);
          if (!cancelled) setTradeDevices([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (draft.specificationsJson != null) return;
    const spec = draft.specifications;
    const json =
      spec && typeof spec === 'object'
        ? JSON.stringify(spec, null, 2)
        : '{}';
    setDraft((d) => ({ ...d, specificationsJson: json }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.id]);

  const filteredTradeModels = useMemo(() => {
    const q = tradeSearch.trim().toLowerCase();
    if (!q) return tradeDevices.slice(0, 40);
    return tradeDevices.filter((d) => d.model.toLowerCase().includes(q)).slice(0, 40);
  }, [tradeDevices, tradeSearch]);

  const updateTradeMenuPos = useCallback(() => {
    const el = tradeInputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const gap = 4;
    const maxH = 192; // max-h-48
    const spaceBelow = window.innerHeight - r.bottom - gap;
    const openUp = spaceBelow < Math.min(maxH, 120) && r.top > spaceBelow;
    setTradeMenuPos({
      top: openUp ? Math.max(8, r.top - gap - Math.min(maxH, r.top - 8)) : r.bottom + gap,
      left: r.left,
      width: r.width,
    });
  }, []);

  useEffect(() => {
    if (!tradeOpen) {
      setTradeMenuPos(null);
      return;
    }
    updateTradeMenuPos();
    const onReposition = () => updateTradeMenuPos();
    window.addEventListener('resize', onReposition);
    document.addEventListener('scroll', onReposition, true);
    return () => {
      window.removeEventListener('resize', onReposition);
      document.removeEventListener('scroll', onReposition, true);
    };
  }, [tradeOpen, filteredTradeModels.length, updateTradeMenuPos]);

  useEffect(() => {
    if (!tradeOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTradeOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tradeOpen]);

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'details', label: 'Details', icon: <Package size={12} /> },
    { id: 'options', label: 'Options & stock', icon: <Layers size={12} /> },
    { id: 'images', label: 'Images', icon: <ImageIcon size={12} /> },
    { id: 'listing', label: 'Listing', icon: <Tag size={12} /> },
  ];

  const canSave =
    Boolean(draft.name?.trim()) && Number.isFinite(priceNum) && priceNum >= 0 && !saving && !specsJsonError;

  const applySpecsJson = (raw: string) => {
    setDraft((d) => {
      if (!raw.trim()) {
        setSpecsJsonError('');
        return { ...d, specificationsJson: raw, specifications: {} };
      }
      try {
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          setSpecsJsonError('That text isn’t valid — check commas and quotes');
          return { ...d, specificationsJson: raw };
        }
        setSpecsJsonError('');
        return {
          ...d,
          specificationsJson: raw,
          specifications: parsed as Record<string, unknown>,
        };
      } catch {
        setSpecsJsonError('That text isn’t valid — check commas and quotes');
        return { ...d, specificationsJson: raw };
      }
    });
  };

  const handleUploadImage = async (file: File | null) => {
    if (!file) return;
    // Details-tab button is "Replace photo" — always promote to main shop photo.
    await handleUploadFiles([file], { asMain: true });
  };

  const handleUploadFiles = async (
    files: FileList | File[] | null,
    opts?: { asMain?: boolean },
  ) => {
    if (!files || (files as FileList).length === 0) return;
    const list = Array.from(files as FileList).filter((f) => validateImageFileMeta(f).ok);
    if (list.length === 0) {
      setImgError('Please choose a JPEG, PNG, WebP, or GIF image.');
      return;
    }

    setImgBusy(true);
    setImgError('');
    const productId = draft.id;
    const asMain = Boolean(opts?.asMain);
    const added: ProductImage[] = [];

    try {
      for (let i = 0; i < list.length; i++) {
        const file = list[i];
        let toUpload = file;
        try {
          toUpload = await compressImage(file, 1600, 0.85);
        } catch {
          toUpload = file;
        }
        const url = await uploadImage(toUpload, 'product-images');
        if (!url) throw new Error('Upload returned no URL');

        const galleryLen = (draft.images?.length || 0) + added.length;
        // Replace/Upload photo → primary. Gallery multi-add → primary only if gallery empty.
        const isPrimary = asMain ? i === 0 : galleryLen === 0;
        const sortOrder = asMain && i === 0 ? 0 : galleryLen;

        if (productId) {
          try {
            const row = await addProductImage(productId, {
              url,
              sort_order: sortOrder,
              is_primary: isPrimary,
            });
            added.push({ ...row, is_primary: isPrimary || row.is_primary });
            // Ensure products.image_url matches even if setPrimary was skipped.
            if (isPrimary) {
              try {
                await updateProduct(productId, { image: url, image_url: url });
              } catch (prodErr) {
                console.warn('products.image_url update failed after primary upload', prodErr);
              }
            }
          } catch (galleryErr) {
            // Storage succeeded but gallery RLS may still block — keep the photo on the product.
            console.warn('product_images insert failed; saving image_url on product', galleryErr);
            if (isPrimary || !draft.image) {
              try {
                await updateProduct(productId, { image: url, image_url: url });
              } catch (prodErr) {
                console.warn('products.image_url update failed', prodErr);
              }
            }
            added.push({
              id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              url,
              sort_order: sortOrder,
              is_primary: isPrimary,
            });
          }
        } else {
          added.push({
            id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            url,
            sort_order: sortOrder,
            is_primary: isPrimary,
          });
        }
      }

      setDraft((d) => {
        const prev = d.images || [];
        if (asMain && added.length > 0) {
          const main = added[0];
          const images = [
            ...prev.map((img) => ({ ...img, is_primary: false })),
            ...added.map((img, idx) => ({ ...img, is_primary: idx === 0 })),
          ];
          return {
            ...d,
            images,
            image: main.url,
            image_url: main.url,
          };
        }
        const images = [...prev, ...added];
        const primary = images.find((img) => img.is_primary) || images[0];
        return {
          ...d,
          images,
          image: primary?.url || d.image,
          image_url: primary?.url || d.image_url,
        };
      });
    } catch (e) {
      setImgError(friendlyError(e, 'upload this image'));
    } finally {
      setImgBusy(false);
    }
  };

  const handleSetPrimary = async (imageId: string) => {
    const img = gallery.find((g) => g.id === imageId);
    if (!img) return;
    if (draft.id && !String(imageId).startsWith('pending-')) {
      setImgBusy(true);
      try {
        await setPrimaryProductImage(draft.id, imageId);
        setDraft({
          ...draft,
          image: img.url,
          images: gallery.map((g) => ({ ...g, is_primary: g.id === imageId })),
        });
      } catch (e) {
        setImgError(friendlyError(e, 'set the main image'));
      } finally {
        setImgBusy(false);
      }
    } else {
      setDraft({
        ...draft,
        image: img.url,
        images: gallery.map((g) => ({ ...g, is_primary: g.id === imageId })),
      });
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm('Remove this image?')) return;
    if (draft.id && !String(imageId).startsWith('pending-')) {
      try {
        await deleteProductImage(imageId, draft.id);
      } catch (e) {
        setImgError(friendlyProductActionError(e, 'delete'));
        return;
      }
    }
    const next = gallery.filter((g) => g.id !== imageId);
    const primary = next.find((g) => g.is_primary) || next[0];
    setDraft({
      ...draft,
      images: next.map((g, i) => ({
        ...g,
        sort_order: i,
        is_primary: primary ? g.id === primary.id : false,
      })),
      image: primary?.url || draft.image,
    });
  };

  const handleAssignVariant = async (imageId: string, variantId: string) => {
    const nextVid = variantId || null;
    setDraft({
      ...draft,
      images: gallery.map((g) =>
        g.id === imageId ? { ...g, variant_id: nextVid } : g,
      ),
    });
    if (draft.id && !String(imageId).startsWith('pending-')) {
      try {
        await setProductImageVariant(imageId, nextVid);
      } catch (e) {
        console.warn('variant_id assign failed:', e);
        setImgError(friendlyError(e, 'link this image to a stock version'));
      }
    }
  };

  const variantOptions = skuRows.filter((r) => r.id);

  return (
    <div className="flex flex-col lg:flex-row min-h-0">
      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        <div className={`shrink-0 sticky top-0 z-20 backdrop-blur border-b px-5 sm:px-6 py-4 ${s.headerBg} ${s.headerBorder}`}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pr-8">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#B38B21]">
                {draft.id ? 'Edit product' : 'New product'}
              </p>
              <h3 className={`text-lg font-black mt-0.5 truncate max-w-[280px] sm:max-w-md ${s.title}`}>
                {draft.name?.trim() || 'Untitled product'}
              </h3>
            </div>
            <button
              type="button"
              onClick={onSubmit}
              disabled={!canSave}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#B38B21] text-black font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-[#D4AF37] transition-all disabled:opacity-40 shrink-0"
            >
              <Save size={14} />
              {saving ? 'Saving…' : draft.id ? 'Save' : 'Publish'}
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all ${
                  tab === t.id ? s.tabActive : s.tabIdle
                }`}
              >
                {t.icon}
                {t.label}
                {t.id === 'options' && comboCount > 0 && (
                  <span className={`ml-0.5 px-1.5 py-0.5 rounded-md text-[9px] ${isLight ? 'bg-black/10' : 'bg-black/20'}`}>{comboCount}</span>
                )}
                {t.id === 'images' && gallery.length > 0 && (
                  <span className={`ml-0.5 px-1.5 py-0.5 rounded-md text-[9px] ${isLight ? 'bg-black/10' : 'bg-black/20'}`}>{gallery.length}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 sm:px-6 py-5">
          {error && (
            <div className={`mb-4 text-xs rounded-xl px-4 py-3 ${s.errorBox}`}>
              {error}
            </div>
          )}

          {tab === 'details' && (
            <div className="space-y-4">
              <div className={s.card}>
                <label className={s.label}>Product name *</label>
                <input
                  placeholder="e.g. iPhone 16 Pro Max"
                  value={draft.name ?? ''}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className={s.input}
                />
              </div>

              <div className={`${s.card} grid grid-cols-1 sm:grid-cols-2 gap-4`}>
                {taxonomyPathHint && (
                  <div
                    className={`sm:col-span-2 rounded-xl border px-3 py-2.5 text-[11px] leading-relaxed ${
                      isLight
                        ? 'border-[#B38B21]/35 bg-[#B38B21]/8 text-black/70'
                        : 'border-[#B38B21]/25 bg-[#B38B21]/10 text-white/65'
                    }`}
                  >
                    <span className="font-black uppercase tracking-wider text-[9px] text-[#B38B21] mr-2">
                      Taxonomy
                    </span>
                    {taxonomyPathHint} Set every step below so the product appears in the right shop filters.
                  </div>
                )}
                <div>
                  <label className={s.label}>Price (GH₵) *</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={draft.price ?? ''}
                    onChange={(e) => setDraft({ ...draft, price: parseFloat(e.target.value) || 0 })}
                    className={s.input}
                  />
                </div>
                <div>
                  <label className={s.label}>Main category *</label>
                  <select
                    value={
                      PRODUCT_CATEGORIES.includes(categoryKey as (typeof PRODUCT_CATEGORIES)[number])
                        ? categoryKey
                        : PRODUCT_CATEGORIES[0]
                    }
                    onChange={(e) => {
                      const nextCat = e.target.value;
                      const opts = getCategorySubcategoryOptions(nextCat);
                      const defaultTax = opts[0]?.value ?? '';
                      applyTaxonomySelection(nextCat, defaultTax);
                    }}
                    className={s.input}
                  >
                    {PRODUCT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                {taxonomyOptions.length > 0 && (
                  <div>
                    <label className={s.label}>
                      {usesConditionTaxonomy
                        ? 'Condition *'
                        : brandThenSeries
                          ? 'Brand *'
                          : isAccessoryCategory
                            ? 'Type *'
                            : isWatchCategory
                              ? 'Line *'
                              : isGamingCategory
                              ? 'Platform / brand *'
                              : 'Sub-category *'}
                    </label>
                    <select
                      value={taxonomySelectValue}
                      onChange={(e) => applyTaxonomySelection(categoryKey, e.target.value)}
                      className={s.input}
                      required
                    >
                      <option value="" disabled>
                        {usesConditionTaxonomy
                          ? 'Select New or Used'
                          : brandThenSeries
                            ? 'Select brand'
                            : isAccessoryCategory
                              ? 'Select accessory type'
                              : isWatchCategory
                                ? 'Select Ultra or Series'
                                : 'Select sub-category'}
                      </option>
                      {taxonomyOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <p className={`text-[10px] mt-1 ${s.muted}`}>
                      {taxonomyOptions.find((o) => o.value === taxonomySelectValue)?.description}
                    </p>
                  </div>
                )}
                {seriesOptions.length > 0 && (
                  <div>
                    <label className={s.label}>
                      Series{brandThenSeries ? ' *' : ''}
                    </label>
                    <select
                      value={draft.series ?? ''}
                      onChange={(e) => {
                        const series = e.target.value || null;
                        const nextSpecs = {
                          ...(draft.specifications && typeof draft.specifications === 'object'
                            ? (draft.specifications as Record<string, unknown>)
                            : {}),
                          series,
                          ...(isAudioCategory
                            ? {
                                catalog: 'audio',
                                audio_type:
                                  normalizedCategory === 'Speakers' ? 'speakers' : 'headphones',
                              }
                            : isLaptopCategory
                              ? { catalog: 'laptop' }
                              : isMacCategory
                                ? { catalog: 'macbook' }
                                : isWatchCategory
                                  ? { catalog: 'watches', watch_group: series }
                                  : normalizedCategory === 'Android phones'
                                    ? { catalog: 'android' }
                                    : {}),
                        };
                        setDraft({
                          ...draft,
                          series,
                          // Brand→series categories persist series on subcategory
                          subcategory: brandThenSeries ? series : draft.subcategory,
                          specifications: nextSpecs,
                          specificationsJson: JSON.stringify(nextSpecs, null, 2),
                        });
                      }}
                      className={s.input}
                      required={brandThenSeries}
                    >
                      <option value="">Select series</option>
                      {seriesOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <p className={`text-[10px] mt-1 ${s.muted}`}>
                      {brandThenSeries
                        ? isWatchCategory
                          ? 'Required. Shop path: Brand → Series (Ultra / Series / Galaxy).'
                          : 'Required. Matches the shop Brand → Series filters (incl. Sony, EarPods, HomePod).'
                        : 'Shown on the shop as Category → Series → New/Used.'}
                    </p>
                  </div>
                )}
                <div>
                  <label className={s.label}>
                    Brand{brandThenSeries ? ' (auto)' : ''}
                  </label>
                  <input
                    type="text"
                    value={draft.brand ?? ''}
                    onChange={(e) => setDraft({ ...draft, brand: e.target.value })}
                    className={s.input}
                    placeholder={
                      isAccessoryCategory
                        ? 'e.g. Spigen, Anker…'
                        : isWatchCategory
                          ? 'Apple'
                          : taxonomySelectValue === 'Others'
                            ? 'e.g. Samsung, Fitbit…'
                            : 'Apple'
                    }
                  />
                  {(brandThenSeries || isAccessoryCategory || isWatchCategory) && (
                    <p className={`text-[10px] mt-1 ${s.muted}`}>
                      {brandThenSeries
                        ? 'Filled from the Brand picker above — edit if the listing brand differs.'
                        : isAccessoryCategory
                          ? 'Maker / label shown on the product card. Type above sets the shop filter.'
                          : isWatchCategory
                            ? 'Defaults to Apple for Ultra and Series listings.'
                            : 'Required when platform is Others — enter the real watch brand.'}
                    </p>
                  )}
                </div>
                {!usesConditionTaxonomy && (
                  <div>
                    <label className={s.label}>Condition</label>
                    <select
                      value={draft.condition ?? 'new'}
                      onChange={(e) => {
                        const condition = e.target.value;
                        const isNew = condition === 'new';
                        setDraft({
                          ...draft,
                          condition,
                          is_new: isNew,
                          new: isNew,
                        });
                      }}
                      className={s.input}
                    >
                      {PRODUCT_CONDITION_OPTIONS.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <p className={`text-[10px] mt-1 ${s.muted}`}>
                      Saved with the product (New / Pre-owned / Refurbished).
                    </p>
                  </div>
                )}
                <div>
                  <label className={s.label}>Status</label>
                  <select
                    value={draft.status ?? 'active'}
                    onChange={(e) => setDraft({ ...draft, status: e.target.value })}
                    className={s.input}
                  >
                    {PRODUCT_STATUSES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={s.label}>Currency</label>
                  <select
                    value={draft.currency ?? 'GHS'}
                    onChange={(e) => setDraft({ ...draft, currency: e.target.value })}
                    className={s.input}
                  >
                    <option value="GHS">GHS</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
                {/* Catalog model link: used for upgrade targets + trade-in eligibility */}
                <div className="sm:col-span-2">
                  <label className={s.label}>Matching trade-in model</label>
                  <input
                    ref={tradeInputRef}
                    type="text"
                    value={tradeOpen ? tradeSearch : (draft.trade_model ?? '')}
                    onFocus={() => {
                      setTradeOpen(true);
                      setTradeSearch(draft.trade_model ?? '');
                    }}
                    onChange={(e) => {
                      setTradeSearch(e.target.value);
                      setTradeOpen(true);
                    }}
                    onBlur={() => {
                      window.setTimeout(() => setTradeOpen(false), 180);
                    }}
                    className={s.input}
                    placeholder="Search or type model… e.g. iPhone 14"
                    autoComplete="off"
                    aria-expanded={tradeOpen}
                    aria-controls="trade-model-listbox"
                    role="combobox"
                  />
                  {tradeOpen &&
                    tradeMenuPos &&
                    createPortal(
                      <div
                        id="trade-model-listbox"
                        role="listbox"
                        data-lenis-prevent
                        style={{
                          position: 'fixed',
                          top: tradeMenuPos.top,
                          left: tradeMenuPos.left,
                          width: tradeMenuPos.width,
                          zIndex: 200,
                        }}
                        className={`max-h-48 overflow-y-auto overscroll-y-contain bb-scrollbar rounded-xl border shadow-2xl [-webkit-overflow-scrolling:touch] ${
                          isLight ? 'bg-white border-black/10' : 'bg-[#121212] border-white/15'
                        }`}
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        <button
                          type="button"
                          role="option"
                          className={`w-full text-left px-3 py-2.5 text-xs ${s.muted} hover:bg-[#B38B21]/10`}
                          onClick={() => {
                            setDraft({ ...draft, trade_model: null });
                            setTradeSearch('');
                            setTradeOpen(false);
                          }}
                        >
                          Clear — not for trade-in
                        </button>
                        {tradeSearch.trim() &&
                          !tradeDevices.some(
                            (d) => d.model.toLowerCase() === tradeSearch.trim().toLowerCase(),
                          ) && (
                            <button
                              type="button"
                              role="option"
                              className={`w-full text-left px-3 py-2.5 text-xs font-bold hover:bg-[#B38B21]/15 ${s.title}`}
                              onClick={() => {
                                const model = tradeSearch.trim();
                                setDraft({ ...draft, trade_model: model });
                                setTradeSearch(model);
                                setTradeOpen(false);
                                void ensureTradeCatalogModel(model, {
                                  category: draft.category,
                                }).catch((e) =>
                                  console.warn('ensureTradeCatalogModel failed:', e),
                                );
                              }}
                            >
                              Use “{tradeSearch.trim()}”
                              <span className={`ml-2 font-normal ${s.muted}`}>new</span>
                            </button>
                          )}
                        {filteredTradeModels.length === 0 && !tradeSearch.trim() && (
                          <p className={`px-3 py-2.5 text-xs ${s.muted}`}>No models match</p>
                        )}
                        {filteredTradeModels.map((d) => (
                          <button
                            key={d.model}
                            type="button"
                            role="option"
                            className={`w-full text-left px-3 py-2.5 text-xs font-bold hover:bg-[#B38B21]/15 ${s.title}`}
                            onClick={() => {
                              setDraft({ ...draft, trade_model: d.model });
                              setTradeSearch(d.model);
                              setTradeOpen(false);
                            }}
                          >
                            {d.model}
                            <span className={`ml-2 font-normal ${s.muted}`}>
                              {d.device_type}
                              {d.is_active === false ? ' · on trade list, not shown to customers yet' : ''}
                            </span>
                          </button>
                        ))}
                      </div>,
                      document.body,
                    )}
                  <p className={`text-[10px] mt-1.5 leading-relaxed ${s.muted}`}>
                    Links this shop phone so customers can choose it as their upgrade on Trade-in.
                    Linked iPhone / iPad products appear in upgrade options (and are added to the
                    staff upgrade list when one is saved). Type a new model name if it isn’t listed yet.
                  </p>
                </div>
                {!skuMatrixEnabled && (
                  <div>
                    <label className={s.label}>Stock</label>
                    <input
                      type="number"
                      min={0}
                      value={draft.stock ?? ''}
                      onChange={(e) => setDraft({ ...draft, stock: parseInt(e.target.value, 10) || 0 })}
                      className={s.input}
                    />
                  </div>
                )}
                {skuMatrixEnabled && skuRows.length > 0 && (
                  <div>
                    <label className={s.label}>Total stock</label>
                    <p className={s.input + ' text-white/50 cursor-default'}>
                      {totalSkuStock(skuRows)}{' '}
                      <span className="text-[10px] text-white/30">(from versions below)</span>
                    </p>
                  </div>
                )}
                <div>
                  <label className={s.label}>Discount (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={draft.discount ?? ''}
                    onChange={(e) => setDraft({ ...draft, discount: parseFloat(e.target.value) || 0 })}
                    className={s.input}
                    placeholder="e.g. 20"
                  />
                  <p className={`text-[10px] mt-1 ${s.muted}`}>
                    Used for sale price and Deal of the Day (e.g. 20 = 20% off).
                  </p>
                </div>
                <div>
                  <label className={s.label}>Rating (0–5)</label>
                  <input
                    type="number"
                    min={0}
                    max={5}
                    step="0.1"
                    value={draft.rating ?? ''}
                    onChange={(e) => setDraft({ ...draft, rating: parseFloat(e.target.value) || 0 })}
                    className={s.input}
                  />
                </div>
              </div>

              <div className={s.card}>
                <label className={s.label}>
                  <ImageIcon size={10} className="inline mr-1 opacity-60" />
                  Product photo
                </label>
                <p className={`text-[10px] mb-3 leading-relaxed ${s.muted}`}>
                  Upload a photo from your computer (JPEG, PNG, WebP — up to 10MB). First upload becomes the main shop photo.
                </p>
                {imgError && tab === 'details' && (
                  <div className={`mb-3 text-xs rounded-xl px-3 py-2 ${s.errorBox}`}>{imgError}</div>
                )}
                <div className="flex flex-wrap items-center gap-3">
                  <label
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#B38B21] text-black text-[10px] font-black uppercase cursor-pointer hover:bg-[#D4AF37] transition-colors ${
                      imgBusy ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    <Upload size={12} />
                    {imgBusy ? 'Uploading…' : draft.image ? 'Replace photo' : 'Upload photo'}
                    <input
                      type="file"
                      accept={IMAGE_FILE_ACCEPT}
                      className="hidden"
                      disabled={imgBusy}
                      onChange={(e) => {
                        void handleUploadImage(e.target.files?.[0] ?? null);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  {draft.image && (
                    <div
                      className={`w-16 h-16 rounded-xl overflow-hidden border flex items-center justify-center ${
                        isLight ? 'border-black/10 bg-black/[0.03]' : 'border-white/10 bg-white/5'
                      }`}
                    >
                      <img src={draft.image} alt="" className="max-w-full max-h-full object-contain" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setTab('images')}
                    className={`text-[10px] font-black uppercase tracking-wider underline-offset-2 hover:underline ${s.muted}`}
                  >
                    Manage gallery →
                  </button>
                </div>
              </div>

              <div className={s.card}>
                <label className={s.label}>Description</label>
                <textarea
                  rows={4}
                  placeholder="Product description for the shop page…"
                  value={draft.description ?? ''}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  className={`${s.input} resize-y min-h-[96px]`}
                />
              </div>
            </div>
          )}

          {tab === 'options' && (
            <div className="space-y-4">
              <p className={`text-[11px] px-1 ${s.muted}`}>
                {chipsLocked
                  ? 'Options are locked to the generated versions below. Edit price and stock on each row — or rebuild from options.'
                  : isTabletCategory
                    ? 'Add Size, Colour, Storage, and Connectivity (Wi‑Fi / Cellular). Generate versions, then set prices and stock.'
                    : isAudioCategory || isAccessoryCategory
                      ? 'These categories usually need Colour only. Skip Storage / RAM / SIM unless this product has real variants.'
                      : isLaptopCategory || isMacCategory
                        ? 'Add Colour, Storage, and RAM for notebook versions. SIM is hidden for Macs / laptops.'
                        : isWatchCategory
                          ? 'Add Case size (e.g. 49mm) and Colour for watch versions. SIM is not required.'
                          : isGamingCategory
                            ? 'Add Colour and Storage if needed for variants. SIM is usually not required.'
                            : 'Add every Color, Storage, RAM, and SIM option once. Generate versions to auto-build all combinations — then only fill or edit prices and stock.'}
              </p>
              {isTabletCategory && (
                <ChipField
                  label="Screen size"
                  chips={displaySizes}
                  inputVal={sizeIn}
                  setInputVal={setSizeIn}
                  placeholder='e.g. 11" or 13"'
                  onAdd={() => onAddChip('display_sizes', sizeIn, () => setSizeIn(''))}
                  onRemove={(v) => onRemoveChip('display_sizes', v)}
                  styles={s}
                  readOnly={chipsLocked}
                  readOnlyNote="Managed by generated versions"
                />
              )}
              {isWatchCategory && (
                <ChipField
                  label="Case size"
                  chips={displaySizes}
                  inputVal={sizeIn}
                  setInputVal={setSizeIn}
                  placeholder="e.g. 49mm or 46mm"
                  onAdd={() => onAddChip('display_sizes', sizeIn, () => setSizeIn(''))}
                  onRemove={(v) => onRemoveChip('display_sizes', v)}
                  styles={s}
                  readOnly={chipsLocked}
                  readOnlyNote="Managed by generated versions"
                />
              )}
              {isTabletCategory && !chipsLocked && (
                <div className="flex flex-wrap gap-1.5 px-1 -mt-2 mb-3">
                  {['11"', '13"', '8.3"', '10.9"', '10.2"'].map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => onAddChip('display_sizes', sz, () => setSizeIn(''))}
                      className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg border ${
                        (displaySizes || []).includes(sz)
                          ? 'border-[#B38B21] text-[#B38B21] bg-[#B38B21]/10'
                          : isLight
                            ? 'border-black/10 text-black/50'
                            : 'border-white/10 text-white/45'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              )}
              {isWatchCategory && !chipsLocked && (
                <div className="flex flex-wrap gap-1.5 px-1 -mt-2 mb-3">
                  {['49mm', '46mm', '45mm', '44mm', '42mm', '41mm', '40mm'].map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => onAddChip('display_sizes', sz, () => setSizeIn(''))}
                      className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg border ${
                        (displaySizes || []).includes(sz)
                          ? 'border-[#B38B21] text-[#B38B21] bg-[#B38B21]/10'
                          : isLight
                            ? 'border-black/10 text-black/50'
                            : 'border-white/10 text-white/45'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              )}
              <ChipField
                label="Colors"
                chips={displayColors}
                inputVal={colorIn}
                setInputVal={setColorIn}
                placeholder="e.g. Black Titanium"
                onAdd={() => onAddChip('colors', colorIn, () => setColorIn(''))}
                onRemove={(v) => onRemoveChip('colors', v)}
                styles={s}
                readOnly={chipsLocked}
                readOnlyNote="Managed by generated versions"
              />
              {showStorageOption && (
                <ChipField
                  label="Storage"
                  chips={displayStorage}
                  inputVal={storageIn}
                  setInputVal={setStorageIn}
                  placeholder="e.g. 256GB"
                  onAdd={() => onAddChip('storage', storageIn, () => setStorageIn(''))}
                  onRemove={(v) => onRemoveChip('storage', v)}
                  styles={s}
                  readOnly={chipsLocked}
                  readOnlyNote="Managed by generated versions"
                />
              )}
              {showRamOption && (
                <ChipField
                  label="RAM"
                  chips={displayRam}
                  inputVal={ramIn}
                  setInputVal={setRamIn}
                  placeholder="e.g. 16GB"
                  onAdd={() => onAddChip('ram', ramIn, () => setRamIn(''))}
                  onRemove={(v) => onRemoveChip('ram', v)}
                  styles={s}
                  readOnly={chipsLocked}
                  readOnlyNote="Managed by generated versions"
                />
              )}
              {showSimOption && (
                <>
                  <ChipField
                    label={isTabletCategory ? 'Connectivity (Wi‑Fi / Cellular)' : 'SIM type (Physical / eSIM / Wi‑Fi / …)'}
                    chips={displaySimTypes}
                    inputVal={simIn}
                    setInputVal={setSimIn}
                    placeholder={isTabletCategory ? 'wifi or cell_ps' : 'e.g. Physical SIM or eSIM — or pick below'}
                    onAdd={() => onAddChip('sim_types', simIn, () => setSimIn(''))}
                    onRemove={(v) => onRemoveChip('sim_types', v)}
                    styles={s}
                    readOnly={chipsLocked}
                    readOnlyNote="Set per version when generate-versions is on"
                    formatChip={formatSimTypeLabel}
                  />
                  {!chipsLocked && (
                    <div className="flex flex-wrap gap-1.5 px-1">
                      {simQuickPicks.map((code) => (
                        <button
                          key={code}
                          type="button"
                          onClick={() => onAddChip('sim_types', code, () => setSimIn(''))}
                          className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg border ${
                            (displaySimTypes || []).includes(code)
                              ? 'border-[#B38B21] text-[#B38B21] bg-[#B38B21]/10'
                              : isLight
                                ? 'border-black/10 text-black/50'
                                : 'border-white/10 text-white/45'
                          }`}
                        >
                          {formatSimTypeLabel(code)}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              <div className={s.card}>
                <ProductSkuMatrix
                  colors={draft.colors || []}
                  storage={showStorageOption ? draft.storage || [] : []}
                  ram={showRamOption ? draft.ram || [] : []}
                  simTypes={showSimOption ? draft.sim_types || [] : []}
                  displaySizes={draft.display_sizes || []}
                  basePrice={priceNum}
                  enabled={skuMatrixEnabled}
                  onEnabledChange={setSkuMatrixEnabled}
                  rows={skuRows}
                  onRowsChange={setSkuRows}
                  isLight={isLight}
                  tabletMode={isTabletCategory}
                  highlightIndices={skuHighlightIndices}
                  focusNonce={skuFocusNonce}
                  onUploadRowImage={async (index, file) => {
                    setImgBusy(true);
                    setImgError('');
                    try {
                      let toUpload = file;
                      try {
                        toUpload = await compressImage(file, 1600, 0.85);
                      } catch {
                        toUpload = file;
                      }
                      const url = await uploadImage(toUpload, 'product-images');
                      if (!url) throw new Error('Upload returned no URL');
                      const row = skuRows[index];
                      if (row?.color) {
                        applyColorImageToSkus(row.color, url);
                        await linkColorImageToGallery(row.color, url);
                      } else {
                        setSkuRows((rows) =>
                          rows.map((r, i) => (i === index ? { ...r, image_url: url } : r)),
                        );
                      }
                    } catch (e) {
                      setImgError(friendlyError(e, 'upload this version photo'));
                    } finally {
                      setImgBusy(false);
                    }
                  }}
                />
              </div>
            </div>
          )}

          {tab === 'images' && (
            <div className="space-y-4">
              <p className={`text-[11px] px-1 leading-relaxed ${s.muted}`}>
                Upload photos directly from your device. The primary photo is shown on the shop page.
                {!draft.id && ' You can upload before saving — images link to the product when you publish.'}
              </p>
              {displayColors.length > 0 && (
                <ProductColorImageUploader
                  colors={displayColors}
                  colorImages={colorImages}
                  busy={imgBusy}
                  isLight={isLight}
                  onUpload={handleColorImageUpload}
                  onUrlChange={handleColorImageUrl}
                />
              )}
              {imgError && <div className={`text-xs rounded-xl px-4 py-3 ${s.errorBox}`}>{imgError}</div>}
              <div
                className={`${s.card} border-dashed ${
                  isLight ? 'border-black/20 bg-black/[0.02]' : 'border-white/20 bg-white/[0.02]'
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (imgBusy) return;
                  void handleUploadFiles(e.dataTransfer.files);
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <label
                    className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#B38B21] text-black text-[10px] font-black uppercase cursor-pointer hover:bg-[#D4AF37] transition-colors ${
                      imgBusy ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    <Upload size={14} />
                    {imgBusy ? 'Uploading…' : 'Choose photos'}
                    <input
                      type="file"
                      accept={IMAGE_FILE_ACCEPT}
                      multiple
                      className="hidden"
                      disabled={imgBusy}
                      onChange={(e) => {
                        void handleUploadFiles(e.target.files);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  <p className={`text-[10px] ${s.muted}`}>
                    Or drag and drop images here · JPEG / PNG / WebP · max 10MB each
                  </p>
                </div>
              </div>
              {gallery.length === 0 ? (
                <div className={`text-center py-10 text-sm ${s.muted}`}>No gallery images yet — upload a photo above</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {gallery.map((img) => (
                    <div key={img.id} className={`${s.card} p-2 space-y-2`}>
                      <div className={`aspect-square rounded-lg overflow-hidden flex items-center justify-center ${isLight ? 'bg-black/[0.03]' : 'bg-white/5'}`}>
                        <img src={img.url} alt="" className="max-w-full max-h-full object-contain" />
                      </div>
                      <label className={`flex items-center gap-1.5 text-[10px] font-bold ${s.title}`}>
                        <input
                          type="radio"
                          name="primary-img"
                          checked={Boolean(img.is_primary)}
                          onChange={() => void handleSetPrimary(img.id)}
                          className="accent-[#B38B21]"
                        />
                        <Star size={10} className={img.is_primary ? 'text-[#B38B21]' : ''} />
                        Primary
                      </label>
                      {variantOptions.length > 0 && (
                        <select
                          value={img.variant_id || ''}
                          onChange={(e) => handleAssignVariant(img.id, e.target.value)}
                          className={`${s.input} text-[10px] py-1.5`}
                        >
                          <option value="">All versions</option>
                          {variantOptions.map((r) => (
                            <option key={r.id} value={r.id}>
                              {[r.color, r.storage, r.sim_type ? formatSimTypeLabel(r.sim_type) : '']
                                .filter(Boolean)
                                .join(' · ') || r.sku || 'Version'}
                            </option>
                          ))}
                        </select>
                      )}
                      <button
                        type="button"
                        onClick={() => void handleDeleteImage(img.id)}
                        className="text-[9px] font-black uppercase text-red-400 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'listing' && (
            <div className="space-y-4">
              <ChipField
                label="Spec highlights (product page)"
                chips={draft.specs || []}
                inputVal={specsIn}
                setInputVal={setSpecsIn}
                placeholder="e.g. A18 chip, Ceramic Shield"
                onAdd={() => onAddChip('specs', specsIn, () => setSpecsIn(''))}
                onRemove={(v) => onRemoveChip('specs', v)}
                styles={s}
              />

              <div className={s.card}>
                <label className={s.label}>Extra product details</label>
                {(isLaptopCategory || isMacCategory || isWatchCategory || isAudioCategory || isAccessoryCategory) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    {isAudioCategory && (
                      <>
                        <div>
                          <label className={s.label}>Audio type</label>
                          <select
                            className={s.input}
                            value={String((draft.specifications as Record<string, unknown> | null)?.audio_type ?? (normalizedCategory === 'Speakers' ? 'speakers' : 'headphones'))}
                            onChange={(e) => {
                              const next = {
                                ...(draft.specifications && typeof draft.specifications === 'object'
                                  ? (draft.specifications as Record<string, unknown>)
                                  : {}),
                                catalog: 'audio',
                                audio_type: e.target.value,
                                series: draft.series ?? null,
                              };
                              setDraft({
                                ...draft,
                                specifications: next,
                                specificationsJson: JSON.stringify(next, null, 2),
                              });
                            }}
                          >
                            <option value="headphones">Headphones</option>
                            <option value="speakers">Speakers</option>
                          </select>
                        </div>
                        <div>
                          <label className={s.label}>Catalog series</label>
                          <select
                            className={s.input}
                            value={String(
                              (draft.specifications as Record<string, unknown> | null)?.series ??
                                draft.series ??
                                '',
                            )}
                            onChange={(e) => {
                              const series = e.target.value || null;
                              const next = {
                                ...(draft.specifications && typeof draft.specifications === 'object'
                                  ? (draft.specifications as Record<string, unknown>)
                                  : {}),
                                catalog: 'audio',
                                series,
                              };
                              setDraft({
                                ...draft,
                                series,
                                subcategory: brandThenSeries ? series : draft.subcategory,
                                specifications: next,
                                specificationsJson: JSON.stringify(next, null, 2),
                              });
                            }}
                          >
                            <option value="">Same as Details → Series</option>
                            {getCategorySeriesOptions(categoryKey).map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                          <p className={`text-[10px] mt-1 ${s.muted}`}>
                            Prefer setting Series on the Details tab — this stays in sync.
                          </p>
                        </div>
                      </>
                    )}
                    {isAccessoryCategory && (
                      <div className="sm:col-span-2">
                        <label className={s.label}>Accessory type (shop filter)</label>
                        <select
                          className={s.input}
                          value={String(
                            (draft.specifications as Record<string, unknown> | null)?.accessory_type ??
                              draft.taxonomy_value ??
                              draft.subcategory ??
                              '',
                          )}
                          onChange={(e) => applyTaxonomySelection(categoryKey, e.target.value)}
                        >
                          <option value="">Select type</option>
                          {taxonomyOptions.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    {isLaptopCategory &&
                      (
                        [
                          ['processor', 'Processor'],
                          ['generation', 'Generation'],
                          ['storage_label', 'Storage label'],
                          ['memory', 'Memory'],
                          ['graphics', 'Graphics'],
                          ['display', 'Display'],
                          ['battery', 'Battery'],
                          ['os', 'OS'],
                          ['extras', 'Extras'],
                        ] as const
                      ).map(([key, label]) => (
                        <div key={key} className={key === 'extras' ? 'sm:col-span-2' : ''}>
                          <label className={s.label}>{label}</label>
                          <input
                            className={s.input}
                            value={String((draft.specifications as Record<string, unknown> | null)?.[key] ?? '')}
                            onChange={(e) => {
                              const raw = e.target.value.trim();
                              const next = {
                                ...(draft.specifications && typeof draft.specifications === 'object'
                                  ? (draft.specifications as Record<string, unknown>)
                                  : {}),
                                catalog: 'laptop',
                                series: draft.series ?? null,
                                [key]: raw || null,
                              };
                              setDraft({
                                ...draft,
                                specifications: next,
                                specificationsJson: JSON.stringify(next, null, 2),
                              });
                            }}
                            placeholder={key === 'memory' ? 'e.g. 16GB RAM' : 'Leave blank if unknown'}
                          />
                        </div>
                      ))}
                    {isMacCategory &&
                      (
                        [
                          ['processor', 'Chip / processor'],
                          ['generation', 'Year'],
                          ['storage_label', 'Storage'],
                          ['memory', 'Memory'],
                          ['display', 'Display size'],
                          ['os', 'OS'],
                          ['extras', 'Extras'],
                        ] as const
                      ).map(([key, label]) => (
                        <div key={key} className={key === 'extras' ? 'sm:col-span-2' : ''}>
                          <label className={s.label}>{label}</label>
                          <input
                            className={s.input}
                            value={String((draft.specifications as Record<string, unknown> | null)?.[key] ?? '')}
                            onChange={(e) => {
                              const raw = e.target.value.trim();
                              const next = {
                                ...(draft.specifications && typeof draft.specifications === 'object'
                                  ? (draft.specifications as Record<string, unknown>)
                                  : {}),
                                catalog: 'macbook',
                                series: draft.series ?? null,
                                [key]: raw || null,
                                ...(key === 'processor' ? { chip: raw || null } : {}),
                                ...(key === 'generation'
                                  ? { year: raw ? Number(raw) || raw : null }
                                  : {}),
                              };
                              setDraft({
                                ...draft,
                                specifications: next,
                                specificationsJson: JSON.stringify(next, null, 2),
                              });
                            }}
                            placeholder={
                              key === 'processor'
                                ? 'e.g. M5 Pro'
                                : key === 'generation'
                                  ? 'e.g. 2026'
                                  : key === 'display'
                                    ? 'e.g. 14"'
                                    : key === 'memory'
                                      ? 'e.g. 16GB RAM'
                                      : 'Leave blank if unknown'
                            }
                          />
                        </div>
                      ))}
                    {isWatchCategory &&
                      (
                        [
                          ['watch_group', 'Line (Ultra / Series)'],
                          ['generation', 'Generation'],
                          ['case_size', 'Case size'],
                          ['display', 'Display size'],
                          ['os', 'OS'],
                          ['extras', 'Extras'],
                        ] as const
                      ).map(([key, label]) => (
                        <div key={key} className={key === 'extras' ? 'sm:col-span-2' : ''}>
                          <label className={s.label}>{label}</label>
                          {key === 'watch_group' ? (
                            <select
                              className={s.input}
                              value={String(
                                (draft.specifications as Record<string, unknown> | null)?.watch_group ??
                                  draft.series ??
                                  '',
                              )}
                              onChange={(e) => {
                                const watch_group = e.target.value || null;
                                const next = {
                                  ...(draft.specifications && typeof draft.specifications === 'object'
                                    ? (draft.specifications as Record<string, unknown>)
                                    : {}),
                                  catalog: 'watches',
                                  watch_group,
                                  series: watch_group,
                                };
                                setDraft({
                                  ...draft,
                                  series: watch_group,
                                  subcategory: watch_group,
                                  specifications: next,
                                  specificationsJson: JSON.stringify(next, null, 2),
                                });
                              }}
                            >
                              <option value="">Same as Details → Series</option>
                              <option value="Ultra">Ultra</option>
                              <option value="Series">Series</option>
                              <option value="Galaxy">Galaxy Watch</option>
                              <option value="Other">Other brands</option>
                            </select>
                          ) : (
                            <input
                              className={s.input}
                              value={String((draft.specifications as Record<string, unknown> | null)?.[key] ?? '')}
                              onChange={(e) => {
                                const raw = e.target.value.trim();
                                const next = {
                                  ...(draft.specifications && typeof draft.specifications === 'object'
                                    ? (draft.specifications as Record<string, unknown>)
                                    : {}),
                                  catalog: 'watches',
                                  watch_group:
                                    (draft.specifications as Record<string, unknown> | null)?.watch_group ??
                                    draft.taxonomy_value ??
                                    null,
                                  [key]: raw || null,
                                  ...(key === 'case_size' ? { display: raw || null } : {}),
                                };
                                setDraft({
                                  ...draft,
                                  specifications: next,
                                  specificationsJson: JSON.stringify(next, null, 2),
                                });
                              }}
                              placeholder={
                                key === 'generation'
                                  ? 'e.g. 11 or 3'
                                  : key === 'case_size' || key === 'display'
                                    ? 'e.g. 49mm'
                                    : 'Leave blank if unknown'
                              }
                            />
                          )}
                        </div>
                      ))}
                  </div>
                )}
                <textarea
                  rows={6}
                  value={draft.specificationsJson ?? '{}'}
                  onChange={(e) => applySpecsJson(e.target.value)}
                  className={`${s.input} font-mono text-[11px] resize-y min-h-[120px]`}
                  placeholder='Example: {"display":"6.1","chip":"A18"}'
                />
                {specsJsonError && (
                  <p className="text-[10px] text-red-400 mt-1">{specsJsonError}</p>
                )}
                <p className={`text-[10px] mt-1 ${s.muted}`}>
                  {isLaptopCategory
                    ? 'Laptop KEY fields (processor, RAM, graphics…) stay blank until you fill them — do not invent specs.'
                    : isMacCategory
                      ? 'Mac KEY fields (chip, year, display, storage, memory) stay blank until you fill them — match the price list.'
                      : isWatchCategory
                        ? 'Watch KEY fields (Ultra/Series, generation, case size) stay blank until you fill them — match the price list.'
                      : isAudioCategory
                        ? 'Audio catalog fields help the shop Brand → Series filters. Colour SKUs stay on the Options tab.'
                        : isAccessoryCategory
                          ? 'Accessory type must match Cases / Protectors / Chargers so shop filters work.'
                          : 'Optional extra details for the product page. Ask a manager if you are unsure.'}
                </p>
              </div>

              <div className={s.card + ' space-y-4'}>
                <p className={`text-[10px] font-black uppercase tracking-widest ${s.muted}`}>Shop page options</p>
                <label className={`flex items-center gap-3 cursor-pointer rounded-xl border px-4 py-3 ${isLight ? 'border-black/10 bg-black/[0.03]' : 'border-white/10 bg-black/30'}`}>
                  <input
                    type="checkbox"
                    checked={draft.new ?? false}
                    onChange={(e) => setDraft({ ...draft, new: e.target.checked })}
                    className="accent-[#B38B21] w-4 h-4"
                  />
                  <span className={`text-sm font-bold ${s.title}`}>Mark as new</span>
                </label>
                <label className={`flex items-center gap-3 cursor-pointer rounded-xl border px-4 py-3 ${isLight ? 'border-black/10 bg-black/[0.03]' : 'border-[#B38B21]/20 bg-[#B38B21]/5'}`}>
                  <input
                    type="checkbox"
                    checked={Boolean(draft.featured)}
                    onChange={(e) => setDraft({ ...draft, featured: e.target.checked })}
                    className="accent-[#B38B21] w-4 h-4"
                  />
                  <span className={`text-sm font-bold ${s.title}`}>Feature on homepage</span>
                </label>
                <label className={`flex items-center gap-3 cursor-pointer rounded-xl border px-4 py-3 ${isLight ? 'border-orange-200 bg-orange-50' : 'border-orange-500/30 bg-orange-500/10'}`}>
                  <input
                    type="checkbox"
                    checked={Boolean(draft.is_deal_of_the_day ?? draft.isDealOfTheDay)}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        is_deal_of_the_day: e.target.checked,
                        isDealOfTheDay: e.target.checked,
                      })
                    }
                    className="accent-[#CDA032] w-4 h-4"
                  />
                  <span className={`text-sm font-bold ${s.title}`}>🔥 Deal of the Day</span>
                </label>
                <div>
                  <label className={s.label}>Promo text</label>
                  <input
                    type="text"
                    value={draft.promo_text ?? draft.promoText ?? ''}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        promo_text: e.target.value,
                        promoText: e.target.value,
                      })
                    }
                    className={s.input}
                    placeholder='e.g. "Limited Time Offer"'
                    maxLength={120}
                  />
                  <p className={`text-[10px] mt-1 ${s.muted}`}>
                    Shown on Deal of the Day cards when enabled.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <aside className={`lg:w-[240px] xl:w-[260px] shrink-0 border-t lg:border-t-0 lg:border-l p-5 lg:sticky lg:top-0 ${s.asideBg} ${s.asideBorder}`}>
        <p className={`text-[9px] font-black uppercase tracking-widest mb-3 ${s.muted}`}>Preview</p>
        <div className={`rounded-2xl border overflow-hidden ${s.previewCard}`}>
          <div className={`aspect-square flex items-center justify-center p-4 ${isLight ? 'bg-black/[0.03]' : 'bg-white/5'}`}>
            {draft.image ? (
              <img
                src={draft.image}
                alt=""
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <Package size={32} className={isLight ? 'text-black/15' : 'text-white/15'} />
            )}
          </div>
          <div className="p-3 space-y-2">
            <p className={`text-xs font-black leading-snug line-clamp-2 ${s.title}`}>
              {draft.name?.trim() || 'Product name'}
            </p>
            <p className="text-sm font-black text-[#B38B21]">{formatCurrency(priceNum)}</p>
            <div className="flex flex-wrap gap-1">
              {(draft.colors || []).slice(0, 2).map((c) => (
                <span key={c} className={`text-[8px] px-1.5 py-0.5 rounded ${isLight ? 'bg-black/5 text-black/45' : 'bg-white/5 text-white/40'}`}>
                  {c}
                </span>
              ))}
              {hasOptions && !skuMatrixEnabled && (
                <span className="text-[8px] text-amber-400/80">Per-version stock off</span>
              )}
            </div>
            <div className={`pt-2 border-t grid grid-cols-2 gap-2 text-center ${s.asideBorder}`}>
              <div>
                <p className={`text-[8px] uppercase font-black ${s.muted}`}>Stock</p>
                <p className={`text-sm font-black ${s.title}`}>{displayStock}</p>
              </div>
              <div>
                <p className={`text-[8px] uppercase font-black ${s.muted}`}>Versions</p>
                <p className={`text-sm font-black ${s.title}`}>{comboCount || (hasOptions ? '—' : '1')}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};
