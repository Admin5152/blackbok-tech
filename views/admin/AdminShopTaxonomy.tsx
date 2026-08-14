import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Edit2, FolderTree, Plus, Save, Trash2, X } from 'lucide-react';
import { dbNotSavedMessage, dbSavedMessage } from '../../lib/dbSaveFeedback';
import {
  createShopTaxonomyNode,
  deleteShopTaxonomyNode,
  taxonomyChildren,
  updateShopTaxonomyNode,
  useShopTaxonomy,
  type ShopTaxonomyKind,
  type ShopTaxonomyNode,
} from '../../lib/shopTaxonomy';
import { useAppContext } from '../../lib/appContext';

type Props = { canEdit?: boolean; theme?: 'light' | 'dark' };

const nextKind = (parent: ShopTaxonomyNode | null): ShopTaxonomyKind =>
  !parent ? 'category' : parent.kind === 'category' ? 'subcategory' : 'series';

export const AdminShopTaxonomy: React.FC<Props> = ({ canEdit = true, theme = 'dark' }) => {
  const isLight = theme === 'light';
  const { notify } = useAppContext();
  const { nodes, loading, error, reload } = useShopTaxonomy(true);
  const [expanded, setExpanded] = useState(false);
  const [parent, setParent] = useState<ShopTaxonomyNode | null>(null);
  const [editing, setEditing] = useState<ShopTaxonomyNode | null>(null);
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const roots = useMemo(() => taxonomyChildren(nodes, null, 'category'), [nodes]);
  const resetForm = () => {
    setEditing(null);
    setParent(null);
    setLabel('');
    setDescription('');
  };
  const beginAdd = (nextParent: ShopTaxonomyNode | null) => {
    setEditing(null);
    setParent(nextParent);
    setLabel('');
    setDescription('');
  };
  const beginEdit = (node: ShopTaxonomyNode) => {
    setEditing(node);
    setParent(node.parent_id ? nodes.find((item) => item.id === node.parent_id) ?? null : null);
    setLabel(node.label);
    setDescription(node.description);
  };

  const save = async () => {
    if (!canEdit || !label.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await updateShopTaxonomyNode(editing.id, { label, description });
        notify?.(dbSavedMessage(`Updated “${label.trim()}”.`), 'success');
      } else {
        await createShopTaxonomyNode({
          parent_id: parent?.id ?? null,
          kind: nextKind(parent),
          // Stable assignment key. Labels can be edited later without orphaning products.
          value: label.trim(),
          label,
          description,
        });
        notify?.(dbSavedMessage(`Created “${label.trim()}”.`), 'success');
      }
      resetForm();
      await reload();
    } catch (cause) {
      notify?.(dbNotSavedMessage(cause, editing ? 'update category' : 'create category'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (node: ShopTaxonomyNode) => {
    if (!canEdit || !window.confirm(`Delete “${node.label}”?`)) return;
    setSaving(true);
    try {
      await deleteShopTaxonomyNode(node, nodes);
      notify?.(dbSavedMessage(`Deleted “${node.label}”.`), 'success');
      await reload();
    } catch (cause) {
      notify?.(dbNotSavedMessage(cause, 'delete category'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const panel = isLight
    ? 'border-black/10 bg-white text-black'
    : 'border-white/10 bg-[#0a0a0a] text-white';
  const muted = isLight ? 'text-black/50' : 'text-white/45';
  const input = `w-full rounded-xl border px-3 py-2 text-xs outline-none ${
    isLight ? 'border-black/10 bg-black/[0.03]' : 'border-white/10 bg-black/40 text-white'
  }`;

  const renderNode = (node: ShopTaxonomyNode, depth: number) => {
    const children = taxonomyChildren(
      nodes,
      node.id,
      node.kind === 'category' ? 'subcategory' : 'series',
    );
    return (
      <div key={node.id} className={depth ? 'ml-4 border-l border-[#B38B21]/20 pl-3' : ''}>
        <div className="group flex items-start gap-2 rounded-xl px-2 py-2 hover:bg-[#B38B21]/[0.06]">
          <FolderTree size={14} className="mt-0.5 shrink-0 text-[#B38B21]" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black">{node.label}</p>
            <p className={`text-[10px] ${muted}`}>
              {node.kind}{node.description ? ` · ${node.description}` : ''}
            </p>
          </div>
          {canEdit && (
            <div className="flex shrink-0 gap-1">
              {node.kind !== 'series' && (
                <button
                  type="button"
                  title={`Add ${node.kind === 'category' ? 'subcategory' : 'series'}`}
                  onClick={() => beginAdd(node)}
                  className="rounded-lg p-1.5 text-[#B38B21] hover:bg-[#B38B21]/15"
                >
                  <Plus size={12} />
                </button>
              )}
              <button type="button" onClick={() => beginEdit(node)} className="rounded-lg p-1.5 hover:bg-white/10">
                <Edit2 size={12} />
              </button>
              <button
                type="button"
                onClick={() => void remove(node)}
                className="rounded-lg p-1.5 text-red-400 hover:bg-red-500/10"
              >
                <Trash2 size={12} />
              </button>
            </div>
          )}
        </div>
        {children.map((child) => (
          <React.Fragment key={child.id}>{renderNode(child, depth + 1)}</React.Fragment>
        ))}
      </div>
    );
  };

  const formKind = editing?.kind ?? nextKind(parent);
  return (
    <section className={`rounded-2xl border ${panel}`}>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <FolderTree size={18} className="text-[#B38B21]" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-black">Categories & subcategories</h2>
          <p className={`text-[10px] ${muted}`}>
            Create your own Category → Subcategory → Series path, then assign products below.
          </p>
        </div>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {expanded && (
        <div className="grid gap-4 border-t border-current/10 p-4 lg:grid-cols-[1fr_320px]">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#B38B21]">
                Custom shop tree
              </p>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => beginAdd(null)}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#B38B21] px-2.5 py-1.5 text-[9px] font-black uppercase text-black"
                >
                  <Plus size={11} /> Category
                </button>
              )}
            </div>
            {loading ? (
              <p className={`py-5 text-xs ${muted}`}>Loading categories…</p>
            ) : error ? (
              <p className="py-5 text-xs text-red-400">{error}</p>
            ) : roots.length === 0 ? (
              <p className={`rounded-xl border border-dashed p-5 text-xs ${muted}`}>
                No custom categories yet. Create one, then add its subcategories and series.
              </p>
            ) : (
              <div className="space-y-1">{roots.map((node) => renderNode(node, 0))}</div>
            )}
          </div>

          {canEdit && (
            <div className={`h-fit rounded-xl border p-4 ${panel}`}>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-black">
                  {editing ? `Edit ${formKind}` : `Add ${formKind}`}
                </p>
                {(editing || parent || label) && (
                  <button type="button" onClick={resetForm} className={`p-1 ${muted}`}>
                    <X size={14} />
                  </button>
                )}
              </div>
              {parent && (
                <p className={`mb-3 text-[10px] ${muted}`}>
                  Inside <span className="font-black text-[#B38B21]">{parent.label}</span>
                </p>
              )}
              <div className="space-y-3">
                <input
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder={`${formKind} name`}
                  maxLength={80}
                  className={input}
                />
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Short description (optional)"
                  maxLength={240}
                  rows={3}
                  className={input}
                />
                <button
                  type="button"
                  disabled={saving || !label.trim()}
                  onClick={() => void save()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#B38B21] px-3 py-2.5 text-[10px] font-black uppercase text-black disabled:opacity-40"
                >
                  <Save size={12} /> {saving ? 'Saving…' : editing ? 'Update' : `Create ${formKind}`}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
