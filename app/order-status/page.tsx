"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { UserShell } from "../components";
import { apiFetch, useRealtimeStream } from "../lib";
import { ORDER_STATUSES, getOrderStatusConfig } from "../order-statuses";

/* Short labels + icons for the tracker stops (same order as ORDER_STATUSES) */
const STOPS: Record<string, { short: string; icon: string }> = {
  pending:     { short: "Pending",     icon: "⏳" },
  handed_over: { short: "Handed over", icon: "🤝" },
  on_the_way:  { short: "On the way",  icon: "🚚" },
  delivered:   { short: "Delivered",   icon: "🏠" },
  completed:   { short: "Completed",   icon: "✅" }
};

const money = (n: number) => "$" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const shortDate = (d?: string) => d ? new Date(d).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" }) : "—";

export default function OrderStatus() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const load = useCallback(() => {
    apiFetch("/api/orders", { cache: "no-store" })
      .then(r => r.json())
      .then(d => setOrders((d.orders || []).filter((o: any) => o.status !== "sent")))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeStream(() => {
    load();
  });

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    ORDER_STATUSES.forEach(s => { c[s.value] = 0; });
    orders.forEach(o => { if (c[o.status] !== undefined) c[o.status]++; });
    return c;
  }, [orders]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter(o =>
      (filter === "all" || o.status === filter) &&
      (!q || String(o.productName || "").toLowerCase().includes(q) || String(o.id || "").toLowerCase().includes(q))
    );
  }, [orders, filter, search]);

  const inTransit = (counts.handed_over || 0) + (counts.on_the_way || 0);

  return (
    <UserShell>
      <div className="tr">

        {/* ---------- hero ---------- */}
        <section className="tr-hero">
          <div className="tr-hero-copy">
            <span className="tr-kicker">Order tracking</span>
            <h1>Track your orders</h1>
            <p>Follow every grabbed order from pending to completed. Updates appear here live.</p>
          </div>
          <div className="tr-hero-stats">
            <div><b>{orders.length}</b><small>Total</small></div>
            <div><b>{inTransit}</b><small>In transit</small></div>
            <div><b>{(counts.delivered || 0) + (counts.completed || 0)}</b><small>Delivered</small></div>
          </div>
        </section>

        {/* ---------- filters ---------- */}
        <div className="tr-toolbar">
          <div className="tr-filters" role="tablist" aria-label="Filter by status">
            <button type="button" role="tab" aria-selected={filter === "all"} className={filter === "all" ? "on" : ""} onClick={() => setFilter("all")}>
              All <em>{orders.length}</em>
            </button>
            {ORDER_STATUSES.map(s => (
              <button type="button" role="tab" key={s.value} aria-selected={filter === s.value} className={filter === s.value ? "on" : ""} onClick={() => setFilter(s.value)}>
                <span aria-hidden="true">{STOPS[s.value]?.icon}</span>{STOPS[s.value]?.short || s.label} <em>{counts[s.value] || 0}</em>
              </button>
            ))}
          </div>
          <label className="tr-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search product or order ID…"/>
          </label>
        </div>

        {/* ---------- list ---------- */}
        {!loaded ? (
          <div className="tr-list">{[0, 1].map(i => <div className="tr-card tr-skel" key={i}/>)}</div>
        ) : orders.length === 0 ? (
          <section className="tr-empty">
            <span>🚚</span>
            <b>No orders to track yet</b>
            <small>Grabbed orders will appear here as Pending.</small>
            <Link href="/orders" className="tr-btn">Go to Orders →</Link>
          </section>
        ) : visible.length === 0 ? (
          <section className="tr-empty small">
            <b>No orders match</b>
            <small>Try another status or search.</small>
            <button type="button" className="tr-btn ghost" onClick={() => { setFilter("all"); setSearch(""); }}>Clear filters</button>
          </section>
        ) : (
          <div className="tr-list">
            {visible.map((o, idx) => {
              const current = ORDER_STATUSES.findIndex(s => s.value === o.status);
              const cfg = getOrderStatusConfig(o.status);
              const pct = current <= 0 ? 0 : (current / (ORDER_STATUSES.length - 1)) * 100;
              const finished = o.status === "completed";
              // truck sits halfway to the next stop, i.e. heading onward
              const truckPct = Math.min(100, ((current + 0.5) / (ORDER_STATUSES.length - 1)) * 100);
              return (
                <article className="tr-card" key={o.id} style={{ animationDelay: `${Math.min(idx, 6) * 0.06}s` }}>
                  <div className="tr-media">
                    {o.image ? <img src={o.image} alt={o.productName}/> : <span>📦</span>}
                  </div>

                  <div className="tr-body">
                    <div className="tr-head">
                      <span className="tr-pill" style={{ color: cfg.color, background: cfg.bg }}>
                        <i style={{ background: cfg.dot }}/>{cfg.label}
                      </span>
                      <span className="tr-id">#{String(o.id).slice(0, 8).toUpperCase()}</span>
                      <span className="tr-date">{shortDate(o.grabbedAt || o.createdAt)}</span>
                    </div>

                    <h2>{o.productName}</h2>
                    <p className="tr-desc">{cfg.desc}</p>

                    <div className="tr-amounts">
                      <div><small>Order amount</small><b>{money(o.orderAmount)}</b></div>
                      <div><small>Commission</small><b className="ok">{money(o.commission)}</b></div>
                      <div className="total"><small>Total amount</small><b>{money(o.totalAmount)}</b></div>
                    </div>

                    {/* tracker */}
                    <div className={`tr-track ${finished ? "finished" : ""}`}>
                      <div className="tr-rail"><i style={{ width: `${pct}%` }}/></div>
                      {!finished && current >= 0 && (
                        <span className="tr-truck" style={{ left: `calc(10% + ${truckPct} * 0.8%)` }} aria-hidden="true">🚚</span>
                      )}
                      {ORDER_STATUSES.map((s, i) => (
                        <div key={s.value} className={`tr-stop ${i < current ? "done" : i === current ? "now" : ""}`}>
                          <span className="tr-dot">{i < current ? "✓" : STOPS[s.value]?.icon}</span>
                          <small>{STOPS[s.value]?.short || s.label}</small>
                        </div>
                      ))}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </UserShell>
  );
}
