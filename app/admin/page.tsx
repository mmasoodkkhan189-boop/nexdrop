"use client";

import Link from "next/link";
import {useEffect,useState,useCallback} from "react";
import {AdminShell} from "../components";
import {apiFetch,useRealtimeStream} from "../lib";
import AdminCharts from "./AdminCharts";
import {useTilt} from "./useTilt";

const money = (n:any) => "$" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Admin(){

const [users,setUsers]=useState<any[]>([]);
const [orders,setOrders]=useState<any[]>([]);
const [stats,setStats]=useState<any>({
  totalUsers:0,
  totalProducts:0,
  totalOrders:0,
  pendingOrders:0,
  onWayOrders:0,
  deliveredOrders:0,
  completedOrders:0,
  totalSales:0,
  totalCommission:0,
  activeProducts:0,
  inactiveProducts:0,
  lowStockProducts:0,
  outOfStockProducts:0
});

const load = useCallback(()=>{
  apiFetch("/api/admin/users",{ cache:"no-store" })
    .then(r=>r.json())
    .then(d=>setUsers(d.users||[]))
    .catch(()=>{});
  apiFetch("/api/admin/orders",{ cache:"no-store" })
    .then(r=>r.json())
    .then(d=>setOrders(d.orders||[]))
    .catch(()=>{});
  apiFetch("/api/admin/stats",{ cache:"no-store" })
    .then(r=>r.json())
    .then(d=>setStats(d))
    .catch(()=>{});
}, []);

useEffect(()=>{
  load();
},[load]);

useRealtimeStream(()=>{
  load();
});

useTilt();

const customers = users.filter((u:any)=>u.role !== "admin");
const recentOrders = orders.slice(0,6);
const latestAccounts = customers.slice(-6).reverse();
const nameOf = (id:string)=> users.find((u:any)=>u.id===id)?.name || "Customer";

const tiles = [
  { icon:"👥", c:"c1", label:"Total Users",    value:String(stats.totalUsers ?? 0),      sub:"Registered accounts" },
  { icon:"🛍️", c:"c2", label:"Products",       value:String(stats.totalProducts ?? 0),   sub:"Store inventory" },
  { icon:"📦", c:"c3", label:"Orders",         value:String(stats.totalOrders ?? 0),     sub:"All customer orders" },
  { icon:"💰", c:"c4", label:"Revenue",        value:money(stats.totalSales),            sub:"Completed sales" },
  { icon:"💎", c:"c6", label:"Commission",     value:money(stats.totalCommission),       sub:"Total paid out" },
  { icon:"⏳", c:"c5", label:"Pending",        value:String(stats.pendingOrders ?? 0),   sub:"Waiting to process" },
  { icon:"🚚", c:"c2", label:"On The Way",     value:String(stats.onWayOrders ?? 0),     sub:"In delivery" },
  { icon:"✅", c:"c3", label:"Completed",      value:String(stats.completedOrders ?? 0), sub:"Finished orders" }
];

return (

<AdminShell>
<div className="ov3d">

  <div className="topbar">
    <div>
      <span className="eyebrow">Nexdrop Intelligence</span>
      <h1>Business Control Center</h1>
    </div>
    <span className="admin-chip live-chip"><i/> Live Database</span>
  </div>

  {/* ---------- Hero ---------- */}
  <section className="ovx-hero tilt-3d" data-tilt="2">
    <div className="ovx-hero-copy">
      <span className="ovx-hero-badge" aria-hidden="true">📊</span>
      <span className="eyebrow">Business Overview</span>
      <h2>Manage your complete store operations</h2>
      <p>Orders, products, customers and revenue in one live dashboard.</p>
      <div className="ovx-hero-actions">
        <Link href="/admin/orders" className="ovx-btn primary">📦 Manage Orders</Link>
        <Link href="/admin/products" className="ovx-btn">🛍️ Products</Link>
        <Link href="/admin/users" className="ovx-btn">👥 Users</Link>
      </div>
    </div>

    <div className="ovx-hero-art" aria-hidden="true">
      <span className="ov-orb o1"/>
      <span className="ov-orb o2"/>
      <span className="ov-ring"/>
      <span className="ov-cube">
        <i className="f1"/><i className="f2"/><i className="f3"/><i className="f4"/><i className="f5"/><i className="f6"/>
      </span>
    </div>

    <div className="ovx-hero-stats">
      <div><small>Revenue</small><strong>{money(stats.totalSales)}</strong></div>
      <div><small>Customers</small><strong>{customers.length}</strong></div>
      <div><small>Orders</small><strong>{stats.totalOrders ?? 0}</strong></div>
    </div>
  </section>

  {/* ---------- KPI tiles ---------- */}
  <div className="ovx-stats">
    {tiles.map(t=>(
      <div className="dx-stat ovx-stat tilt-3d" key={t.label}>
        <span className={`dx-ico ${t.c}`}>{t.icon}</span>
        <span className="dx-label">{t.label}</span>
        <strong>{t.value}</strong>
        <small>{t.sub}</small>
      </div>
    ))}
  </div>

  <AdminCharts stats={stats}/>

  {/* ---------- Recent orders + latest accounts ---------- */}
  <div className="ovx-bottom">

    <section className="ovx-card">
      <div className="ovx-card-head">
        <div>
          <span className="eyebrow">Orders</span>
          <h2>Recent Orders</h2>
        </div>
        <Link href="/admin/orders" className="ovx-link">View all →</Link>
      </div>

      {recentOrders.length === 0 ? (
        <div className="ovx-empty">No orders yet.</div>
      ) : (
        <div className="ovx-list">
          {recentOrders.map((o:any)=>(
            <div className="ovx-row" key={o.id}>
              {o.image
                ? <img className="ovx-thumb" src={o.image} alt=""/>
                : <span className="ovx-thumb">📦</span>}
              <div className="ovx-row-main">
                <b>{o.productName}</b>
                <small>{nameOf(o.customerId)} · <code>#{String(o.id).slice(0,8).toUpperCase()}</code></small>
              </div>
              <div className="ovx-row-end">
                <strong>{money(o.orderAmount)}</strong>
                <span className={`status ${o.status}`}>{String(o.status).replace(/_/g," ")}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>

    <section className="ovx-card">
      <div className="ovx-card-head">
        <div>
          <span className="eyebrow">Customers</span>
          <h2>Latest Accounts</h2>
        </div>
        <Link href="/admin/users" className="ovx-link">Manage →</Link>
      </div>

      {latestAccounts.length === 0 ? (
        <div className="ovx-empty">No customers yet.</div>
      ) : (
        <div className="ovx-list">
          {latestAccounts.map((u:any)=>(
            <Link href={`/admin/users/${u.id}`} className="ovx-row" key={u.id}>
              <span className={`ovx-avatar ${u.profileImage ? "has-photo" : ""}`}>
                {u.profileImage ? <img src={u.profileImage} alt=""/> : (u.name?.[0] || "U")}
              </span>
              <div className="ovx-row-main">
                <b>{u.name}</b>
                <small>{u.email}</small>
              </div>
              <div className="ovx-row-end">
                <strong>{money(u.balance)}</strong>
                <span className={`status ${String(u.status||"").toLowerCase()}`}>{u.status}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>

  </div>

</div>
</AdminShell>

);
}
