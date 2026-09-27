"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { UserShell } from "../components";
import { apiFetch, apiMe, useRealtimeStream } from "../lib";

type SortKey = "newest" | "price-high" | "price-low" | "name";

const money = (n: number) => "$" + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
// Commission amounts always show cents, e.g. $440.20
const cents = (n: number) => "$" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const shortDate = (d?: string) => d ? new Date(d).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" }) : "—";

export default function MyStore(){

  const [products,setProducts] = useState<any[]>([]);
  const [loading,setLoading] = useState(true);
  const [limit,setLimit] = useState(0);
  const [packageName,setPackageName] = useState("");
  const [shopName,setShopName] = useState("");
  const [commissionRate,setCommissionRate] = useState(0);
  const [selectedProduct,setSelectedProduct] = useState<any|null>(null);
  const [search,setSearch] = useState("");
  const [category,setCategory] = useState("All");
  const [sort,setSort] = useState<SortKey>("newest");

  const load = useCallback(async()=>{
    try {
      const [prodRes, meRes] = await Promise.all([
        apiFetch("/api/seller-products", { cache:"no-store" }),
        apiMe()
      ]);

      const d = await prodRes.json();
      setProducts(d.products || []);

      const user = meRes?.user;
      setLimit(Number(user?.productLimit || 0));
      setPackageName(user?.currentPackageName || "");
      setShopName(user?.shopName || "");
      setCommissionRate(Number(user?.commissionRate || 0));
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(()=>{
    load();
  },[load]);

  useRealtimeStream(()=>{
    load();
  });

  // Close the details popup with Escape
  useEffect(()=>{
    if(!selectedProduct) return;
    const onKey = (e: KeyboardEvent)=>{ if(e.key === "Escape") setSelectedProduct(null); };
    window.addEventListener("keydown", onKey);
    return ()=>window.removeEventListener("keydown", onKey);
  },[selectedProduct]);

  const valid = useMemo(()=>products.filter((item:any)=>item.product),[products]);

  const categories = useMemo(()=>{
    const set = new Set<string>();
    valid.forEach((item:any)=>set.add(item.product.category || "General"));
    return ["All", ...Array.from(set).sort()];
  },[valid]);

  const visible = useMemo(()=>{
    const q = search.trim().toLowerCase();
    const list = valid.filter((item:any)=>{
      const p = item.product;
      if(category !== "All" && (p.category || "General") !== category) return false;
      if(!q) return true;
      return String(p.name || "").toLowerCase().includes(q) || String(p.sku || "").toLowerCase().includes(q);
    });
    const price = (i:any)=>Number(i.product.price || 0);
    const added = (i:any)=>new Date(i.addedDate || 0).getTime();
    return [...list].sort((a,b)=>
      sort === "price-high" ? price(b) - price(a) :
      sort === "price-low" ? price(a) - price(b) :
      sort === "name" ? String(a.product.name).localeCompare(String(b.product.name)) :
      added(b) - added(a)
    );
  },[valid, search, category, sort]);

  const used = products.length;
  const remaining = Math.max(limit - used, 0);
  const usedPct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const storeValue = valid.reduce((s:number,i:any)=>s + Number(i.product.price || 0), 0);

  const sp = selectedProduct?.product;

  return (

    <UserShell>

      {/* ---------- Store header ---------- */}
      <section className="ms-hero">
        <div className="ms-hero-main">
          <span className="ms-hero-icon" aria-hidden="true">🏪</span>
          <div>
            <span className="eyebrow">Seller Store</span>
            <h1>{shopName || "My Store"}</h1>
            <p>Products you've added to your store. Tap any product to see its details.</p>
          </div>
        </div>
        <div className="ms-hero-plan">
          <span className="ms-plan-chip">★ {packageName || "No Package"}</span>
          <small>{commissionRate}% commission</small>
        </div>
      </section>

      {/* ---------- Stats ---------- */}
      <div className="ms-stats">
        <div className="ms-stat">
          <span>Products added</span>
          <strong>{used}<em> / {limit}</em></strong>
          <div className="ms-meter" aria-label={`${usedPct}% of product limit used`}>
            <i style={{ width: `${usedPct}%` }} className={usedPct >= 90 ? "full" : ""}/>
          </div>
          <small>{usedPct}% of your plan limit used</small>
        </div>
        <div className="ms-stat">
          <span>Remaining slots</span>
          <strong>{remaining}</strong>
          <small>{remaining === 0 && limit > 0 ? "Your store is full" : "Space for more products"}</small>
        </div>
        <div className="ms-stat">
          <span>Store value</span>
          <strong>{money(storeValue)}</strong>
          <small>Total price of listed products</small>
        </div>
        <div className="ms-stat">
          <span>Categories</span>
          <strong>{Math.max(categories.length - 1, 0)}</strong>
          <small>Different product types</small>
        </div>
      </div>

      {/* ---------- Toolbar ---------- */}
      {!loading && valid.length > 0 && (
        <div className="ms-toolbar">
          <label className="ms-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by product name or code…"/>
          </label>
          <div className="ms-cats">
            {categories.map(c=>(
              <button type="button" key={c} className={category===c ? "on" : ""} onClick={()=>setCategory(c)}>{c}</button>
            ))}
          </div>
          <select className="ms-sort" value={sort} onChange={e=>setSort(e.target.value as SortKey)} aria-label="Sort products">
            <option value="newest">Newest first</option>
            <option value="price-high">Price: high to low</option>
            <option value="price-low">Price: low to high</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>
      )}

      {/* ---------- Products ---------- */}
      {loading ? (
        <div className="ms-grid">
          {Array.from({ length: 4 }).map((_,i)=><div className="ms-card ms-skeleton" key={i}/>)}
        </div>
      ) : valid.length === 0 ? (
        <section className="ms-empty">
          <span className="ms-empty-icon">📦</span>
          <b>Your store is empty</b>
          <p>Add products from the catalog to start building your store.</p>
          <Link href="/products" className="ms-btn primary">Browse products →</Link>
        </section>
      ) : visible.length === 0 ? (
        <section className="ms-empty small">
          <b>No products match</b>
          <p>Try a different search or category.</p>
          <button type="button" className="ms-btn ghost" onClick={()=>{ setSearch(""); setCategory("All"); }}>Clear filters</button>
        </section>
      ) : (
        <>
          <div className="ms-count">Showing <b>{visible.length}</b> of {valid.length} products</div>
          <div className="ms-grid">
            {visible.map((item:any)=>{
              const p = item.product;
              const earn = Number(p.price || 0) * commissionRate / 100;
              return (
                <button type="button" className="ms-card" key={item.id} onClick={()=>setSelectedProduct(item)}>
                  <div className="ms-media">
                    {p.image ? <img src={p.image} alt={p.name}/> : <span className="ms-noimg">📦</span>}
                    <span className="ms-cat">{p.category || "General"}</span>
                    <span className={`ms-status ${String(item.status || "active").toLowerCase()}`}>{item.status || "active"}</span>
                  </div>
                  <div className="ms-body">
                    <h3>{p.name}</h3>
                    {p.sku && <small className="ms-sku">{p.sku}</small>}
                    <div className="ms-price-row">
                      <strong>{money(p.price)}</strong>
                      {commissionRate > 0 && <span className="ms-earn">+{cents(earn)}</span>}
                    </div>
                    <div className="ms-foot">
                      <span>Added {shortDate(item.addedDate)}</span>
                      <em>View →</em>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* ---------- Details popup ---------- */}
      {selectedProduct && sp && (
        <div className="ms-backdrop" onClick={()=>setSelectedProduct(null)}>
          <div className="ms-modal" role="dialog" aria-modal="true" aria-label={sp.name} onClick={e=>e.stopPropagation()}>

            <button type="button" className="ms-close" onClick={()=>setSelectedProduct(null)} aria-label="Close">✕</button>

            <div className="ms-modal-media">
              {sp.image ? <img src={sp.image} alt={sp.name}/> : <span className="ms-noimg big">📦</span>}
            </div>

            <div className="ms-modal-body">
              <span className="eyebrow">Product Details</span>
              <h2>{sp.name}</h2>
              <div className="ms-modal-tags">
                <span className={`ms-status inline ${String(selectedProduct.status || "active").toLowerCase()}`}>{selectedProduct.status || "active"}</span>
                <span className="ms-tag">{sp.category || "General"}</span>
                {sp.sku && <span className="ms-tag mono">{sp.sku}</span>}
              </div>

              <div className="ms-money">
                <div>
                  <span>Product price</span>
                  <strong>{money(sp.price)}</strong>
                </div>
                <div className="accent">
                  <span>Your commission ({commissionRate}%)</span>
                  <strong>{cents(Number(sp.price || 0) * commissionRate / 100)}</strong>
                  <small>per sale</small>
                </div>
              </div>

              <div className="ms-facts">
                <div><span>Added on</span><b>{shortDate(selectedProduct.addedDate)}</b></div>
                {Number(sp.stock) > 0 && <div><span>Stock available</span><b>{sp.stock}</b></div>}
                <div><span>Product code</span><b>{sp.sku || "—"}</b></div>
              </div>

              {sp.description && (
                <div className="ms-desc">
                  <span>Description</span>
                  <p>{sp.description}</p>
                </div>
              )}

              <button type="button" className="ms-btn ghost full" onClick={()=>setSelectedProduct(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

    </UserShell>

  );

}
