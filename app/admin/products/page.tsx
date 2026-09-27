"use client";

import { useEffect, useState, useCallback, useMemo, FormEvent } from "react";
import { AdminShell } from "../../components";
import { apiFetch, useRealtimeStream } from "../../lib";
import { useTilt } from "../useTilt";

type StockFilter = "all" | "in" | "low" | "out" | "inactive";
type Sort = "newest" | "price-asc" | "price-desc" | "name";

const PAGE_SIZE = 24;

const EMPTY_FORM = {
  sku: "", name: "", brand: "", supplier: "", category: "", description: "",
  purchasePrice: "", price: "", image: "", stock: "", lowStockLimit: "5", status: "Active"
};

const money = (n:any) => "$" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function stockState(p:any): "in" | "low" | "out" {
  const stock = Number(p.stock || 0);
  const limit = Number(p.lowStockLimit ?? 5) || 5;
  if (stock <= 0) return "out";
  if (stock <= limit) return "low";
  return "in";
}

export default function AdminProducts() {

  const [products, setProducts] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState("");
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(() => {
    apiFetch("/api/products", { cache: "no-store" })
      .then(r => r.json())
      .then(d => setProducts(d.products || []))
      .catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);
  useRealtimeStream(() => { load(); });
  useTilt();

  // Messages clear themselves
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 5000);
    return () => clearTimeout(t);
  }, [message]);

  // Esc closes the dialog
  useEffect(() => {
    if (!formOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !saving) setFormOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [formOpen, saving]);

  // Reset paging whenever the result set changes
  useEffect(() => { setVisible(PAGE_SIZE); }, [q, category, stockFilter, sort]);

  const set = (key: keyof typeof EMPTY_FORM) => (e: any) => setForm(f => ({ ...f, [key]: e.target.value }));

  const openAdd = () => {
    setEditId("");
    setForm({ ...EMPTY_FORM });
    setFormError("");
    setFormOpen(true);
  };

  const openEdit = (p:any) => {
    setEditId(p.id);
    setForm({
      sku: p.sku || "",
      name: p.name || "",
      brand: p.brand || "",
      supplier: p.supplier || "",
      category: p.category || "",
      description: p.description || "",
      purchasePrice: p.purchasePrice !== undefined ? String(p.purchasePrice) : "",
      price: p.price !== undefined ? String(p.price) : "",
      image: p.image || "",
      stock: p.stock !== undefined ? String(p.stock) : "",
      lowStockLimit: p.lowStockLimit !== undefined ? String(p.lowStockLimit) : "5",
      status: p.status || "Active"
    });
    setFormError("");
    setFormOpen(true);
  };

  const saveProduct = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setFormError("");
    setSaving(true);
    try {
      const r = await apiFetch(editId ? `/api/products/${editId}` : "/api/products", {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setFormError(d.error || "Unable to save product");
        return;
      }
      setMessage(editId ? "Product updated successfully." : "Product added successfully.");
      setFormOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (p:any) => {
    if (!confirm(`Delete "${p.name}"? This can't be undone.`)) return;
    const r = await apiFetch(`/api/products/${p.id}`, { method: "DELETE" });
    if (r.ok) {
      setMessage("Product deleted.");
      if (editId === p.id) setFormOpen(false);
      load();
    } else {
      const d = await r.json().catch(() => ({}));
      setMessage(d.error || "Could not delete product");
    }
  };

  /* ---------- derived ---------- */
  const categories = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of products) {
      const c = p.category || "Uncategorized";
      m.set(c, (m.get(c) || 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [products]);

  const counts = useMemo(() => ({
    total: products.length,
    active: products.filter(p => (p.status || "Active") === "Active").length,
    inactive: products.filter(p => (p.status || "Active") !== "Active").length,
    in: products.filter(p => stockState(p) === "in").length,
    low: products.filter(p => stockState(p) === "low").length,
    out: products.filter(p => stockState(p) === "out").length,
    avgPrice: products.length ? products.reduce((s, p) => s + Number(p.price || 0), 0) / products.length : 0
  }), [products]);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    const out = products.filter(p => {
      if (category !== "all" && (p.category || "Uncategorized") !== category) return false;
      if (stockFilter === "inactive") { if ((p.status || "Active") === "Active") return false; }
      else if (stockFilter !== "all" && stockState(p) !== stockFilter) return false;
      if (!term) return true;
      return [p.name, p.sku, p.category, p.brand, p.supplier].some(v => String(v || "").toLowerCase().includes(term));
    });
    if (sort === "price-asc") out.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    else if (sort === "price-desc") out.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    else if (sort === "name") out.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    else out.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return out;
  }, [products, q, category, stockFilter, sort]);

  const shown = list.slice(0, visible);

  const formMargin = Number(form.price || 0) - Number(form.purchasePrice || 0);
  const formMarginPct = Number(form.price || 0) > 0 ? (formMargin / Number(form.price)) * 100 : 0;

  const stockChips: { id: StockFilter; label: string; n: number; dot?: string }[] = [
    { id: "all",      label: "All",          n: counts.total },
    { id: "in",       label: "In stock",     n: counts.in,       dot: "#10B981" },
    { id: "low",      label: "Low stock",    n: counts.low,      dot: "#F59E0B" },
    { id: "out",      label: "Out of stock", n: counts.out,      dot: "#E11D48" },
    { id: "inactive", label: "Inactive",     n: counts.inactive, dot: "#94A3B8" }
  ];

  return (
    <AdminShell>
    <div className="ov3d">

      <div className="topbar">
        <div>
          <span className="eyebrow">Catalog management</span>
          <h1>Products</h1>
        </div>
        <button type="button" className="px-add" onClick={openAdd}>＋ Add Product</button>
      </div>

      {/* ---------- Hero ---------- */}
      <section className="ovx-hero px-hero tilt-3d" data-tilt="2">
        <div className="ovx-hero-copy">
          <span className="ovx-hero-badge" aria-hidden="true">🛍️</span>
          <span className="eyebrow">Product catalogue</span>
          <h2>Everything you sell, in one place</h2>
          <p>Add products, keep prices and stock up to date, and spot items that need restocking.</p>
          <div className="ovx-hero-actions">
            <button type="button" className="ovx-btn primary" onClick={openAdd}>＋ Add Product</button>
            <button type="button" className="ovx-btn" onClick={() => setStockFilter("low")}>⚠️ Low stock ({counts.low})</button>
          </div>
        </div>

        <div className="px-hero-stack" aria-hidden="true">
          {products.filter(p => p.image).slice(0, 3).map((p, i) => (
            <img key={p.id} src={p.image} alt="" className={`px-float f${i + 1}`}/>
          ))}
        </div>

        <div className="ovx-hero-stats">
          <div><small>Products</small><strong>{counts.total}</strong></div>
          <div><small>Categories</small><strong>{categories.length}</strong></div>
          <div><small>Avg. price</small><strong>{money(counts.avgPrice)}</strong></div>
        </div>
      </section>

      {/* ---------- KPI tiles ---------- */}
      <div className="ovx-stats">
        <div className="dx-stat ovx-stat tilt-3d"><span className="dx-ico c1">📦</span><span className="dx-label">Active</span><strong>{counts.active}</strong><small>Listed for sale</small></div>
        <div className="dx-stat ovx-stat tilt-3d"><span className="dx-ico c3">✅</span><span className="dx-label">In stock</span><strong>{counts.in}</strong><small>Ready to ship</small></div>
        <div className="dx-stat ovx-stat tilt-3d"><span className="dx-ico c5">⚠️</span><span className="dx-label">Low stock</span><strong>{counts.low}</strong><small>At or below limit</small></div>
        <div className="dx-stat ovx-stat tilt-3d"><span className="dx-ico c6">⛔</span><span className="dx-label">Out of stock</span><strong>{counts.out}</strong><small>Stock is zero</small></div>
      </div>

      {message && <div className="info-banner px-msg">{message}</div>}

      {/* ---------- Catalogue ---------- */}
      <section className="ovx-card">
        <div className="ovx-card-head ux-head">
          <div>
            <span className="eyebrow">{list.length} of {products.length} products</span>
            <h2>Product Catalog</h2>
          </div>
          <div className="px-tools">
            <label className="ux-search">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, SKU, brand, category…"/>
            </label>
            <select className="px-select" value={category} onChange={e => setCategory(e.target.value)} aria-label="Category">
              <option value="all">All categories</option>
              {categories.map(([c, n]) => <option key={c} value={c}>{c} ({n})</option>)}
            </select>
            <select className="px-select" value={sort} onChange={e => setSort(e.target.value as Sort)} aria-label="Sort">
              <option value="newest">Newest first</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="name">Name A–Z</option>
            </select>
          </div>
        </div>

        <div className="ux-chips" role="tablist" aria-label="Filter by stock">
          {stockChips.map(c => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={stockFilter === c.id}
              className={`ux-chip ${stockFilter === c.id ? "on" : ""}`}
              onClick={() => setStockFilter(c.id)}
            >
              {c.dot && <i style={{ background: c.dot }}/>}
              {c.label}
              <em>{c.n}</em>
            </button>
          ))}
        </div>

        {list.length === 0 ? (
          <div className="ovx-empty">No products match these filters.</div>
        ) : (
          <>
            <div className="px-grid">
              {shown.map(p => {
                const st = stockState(p);
                const inactive = (p.status || "Active") !== "Active";
                const margin = Number(p.price || 0) - Number(p.purchasePrice || 0);
                return (
                  <article className={`px-card tilt-3d ${inactive ? "is-inactive" : ""}`} data-tilt="7" key={p.id}>
                    <div className="px-media">
                      {p.image
                        ? <img src={p.image} alt={p.name} loading="lazy"/>
                        : <span className="px-noimg">🛍️</span>}
                      <span className={`px-stock ${st}`}>
                        {st === "in" ? `${p.stock} in stock` : st === "low" ? `Low · ${p.stock} left` : "Out of stock"}
                      </span>
                      {inactive && <span className="px-inactive">Inactive</span>}
                    </div>
                    <div className="px-body">
                      <div className="px-meta">
                        <span className="px-cat">{p.category || "Uncategorized"}</span>
                        {p.sku && <code>{p.sku}</code>}
                      </div>
                      <h3 title={p.name}>{p.name}</h3>
                      {(p.brand || p.supplier) && <small className="px-brand">{[p.brand, p.supplier].filter(Boolean).join(" · ")}</small>}
                      <div className="px-price">
                        <strong>{money(p.price)}</strong>
                        {Number(p.purchasePrice) > 0 && (
                          <span className={margin >= 0 ? "up" : "down"}>{margin >= 0 ? "+" : ""}{money(margin)} margin</span>
                        )}
                      </div>
                      <div className="px-actions">
                        <button type="button" className="ux-btn primary" onClick={() => openEdit(p)}>✏️ Edit</button>
                        <button type="button" className="ux-btn danger" onClick={() => deleteProduct(p)} aria-label={`Delete ${p.name}`} title="Delete product">🗑</button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {visible < list.length && (
              <div className="px-more">
                <button type="button" className="ux-btn" onClick={() => setVisible(v => v + PAGE_SIZE)}>
                  Show more ({list.length - visible} left)
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* ---------- Add / Edit dialog ---------- */}
      {formOpen && (
        <div className="px-backdrop" onClick={() => !saving && setFormOpen(false)}>
          <form
            className="px-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="px-dialog-title"
            onClick={e => e.stopPropagation()}
            onSubmit={saveProduct}
          >
            <div className="px-dialog-head">
              <div>
                <span className="eyebrow">{editId ? "Edit product" : "New product"}</span>
                <h2 id="px-dialog-title">{editId ? form.name || "Edit product" : "Add a product"}</h2>
              </div>
              <button type="button" className="px-close" onClick={() => setFormOpen(false)} aria-label="Close" disabled={saving}>✕</button>
            </div>

            <div className="px-dialog-body">
              <div className="px-preview">
                {form.image ? <img src={form.image} alt="Preview"/> : <span>🖼️<small>Image preview</small></span>}
              </div>

              <div className="px-fields">
                <label className="span2">Product name *<input value={form.name} onChange={set("name")} required autoFocus/></label>
                <label>SKU<input value={form.sku} onChange={set("sku")} placeholder="Auto if empty"/></label>
                <label>Category<input value={form.category} onChange={set("category")} placeholder="e.g. Jewellery" list="px-cats"/></label>
                <label>Brand<input value={form.brand} onChange={set("brand")}/></label>
                <label>Supplier<input value={form.supplier} onChange={set("supplier")}/></label>
                <label>Purchase price ($)<input type="number" min="0" step="0.01" value={form.purchasePrice} onChange={set("purchasePrice")}/></label>
                <label>Sale price ($) *<input type="number" min="0" step="0.01" value={form.price} onChange={set("price")} required/></label>
                <label>Stock<input type="number" min="0" step="1" value={form.stock} onChange={set("stock")}/></label>
                <label>Low-stock limit<input type="number" min="0" step="1" value={form.lowStockLimit} onChange={set("lowStockLimit")}/></label>
                <label className="span2">Image URL<input value={form.image} onChange={set("image")} placeholder="https://… or /products/…"/></label>
                <label className="span2">Description<textarea value={form.description} onChange={set("description")} rows={3} placeholder="Product details…"/></label>
                <label>Status
                  <select value={form.status} onChange={set("status")}>
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </label>
                <div className={`px-margin ${formMargin >= 0 ? "up" : "down"}`}>
                  <span>Margin</span>
                  <b>{money(formMargin)}</b>
                  <small>{formMarginPct.toFixed(0)}%</small>
                </div>
              </div>
              <datalist id="px-cats">
                {categories.map(([c]) => <option key={c} value={c}/>)}
              </datalist>
            </div>

            {formError && <div className="form-error px-form-error">{formError}</div>}

            <div className="px-dialog-foot">
              {editId && (
                <button type="button" className="ux-btn danger px-del" onClick={() => deleteProduct({ id: editId, name: form.name })} disabled={saving}>🗑 Delete</button>
              )}
              <button type="button" className="ux-btn" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</button>
              <button type="submit" className="ux-btn primary" disabled={saving}>{saving ? "Saving…" : editId ? "Save changes" : "Add product"}</button>
            </div>
          </form>
        </div>
      )}

    </div>
    </AdminShell>
  );
}
