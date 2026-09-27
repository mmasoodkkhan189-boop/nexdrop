"use client";

import Link from "next/link";
import { UserShell } from "../components";
import { apiFetch, apiMe, useRealtimeStream } from "../lib";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from "recharts";


/* ---------- 3D + motion helpers ---------- */

function prefersReducedMotion(){
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/** Animates a number from its previous value to `value`. */
function useCountUp(value: number, duration = 1100){
  const [shown,setShown] = useState(0);
  const from = useRef(0);
  useEffect(()=>{
    if(prefersReducedMotion()){ setShown(value); from.current = value; return; }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (t: number)=>{
      const k = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - k, 3);
      setShown(a + (value - a) * eased);
      if(k < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(raf);
  },[value, duration]);
  return shown;
}

function CountUp({ value, money = false }: { value: number; money?: boolean }){
  const v = useCountUp(Number(value || 0));
  return <>{money ? "$" + v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : Math.round(v).toLocaleString()}</>;
}

/** Card that tilts toward the pointer in 3D and shows a moving shine. */
function Tilt({ className = "", children, max = 8 }: { className?: string; children: React.ReactNode; max?: number }){
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.PointerEvent<HTMLDivElement>)=>{
    const el = ref.current;
    if(!el || e.pointerType === "touch" || prefersReducedMotion()) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--rx", `${(0.5 - y) * max}deg`);
    el.style.setProperty("--ry", `${(x - 0.5) * max}deg`);
    el.style.setProperty("--mx", `${x * 100}%`);
    el.style.setProperty("--my", `${y * 100}%`);
  };
  const onLeave = ()=>{
    const el = ref.current;
    if(!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };
  return (
    <div ref={ref} className={`tilt ${className}`} onPointerMove={onMove} onPointerLeave={onLeave}>
      {children}
      <span className="tilt-shine" aria-hidden="true"/>
    </div>
  );
}

/**
 * Hero animation: a phone playing the dropshipping journey as six app screens —
 * Shop → Order → Pack → Ship → Deliver → Complete (3s each, 18s per loop).
 * Scenes are switched in JS and re-mounted, so every scene's entrance
 * animation always starts from zero. Each loop features the next of 10
 * catalog products, then it starts over.
 */
const PV_STEPS = [
  { k: "Shop", icon: "🛍️" },
  { k: "Order", icon: "🧾" },
  { k: "Pack", icon: "📦" },
  { k: "Ship", icon: "🚚" },
  { k: "Deliver", icon: "🏠" },
  { k: "Complete", icon: "🤝" }
];

const PV_PRODUCTS = [
  { name: "Smart Watch Ultra",      price: 676, image: "/products/amazfit-t-rex-ultra-2-smart-watch-676.jpg" },
  { name: "Daily 4.0 Sneakers",     price: 71,  image: "/products/adidas-men-daily-4-0-shoes-71.jpg" },
  { name: "Coco Eau de Parfum",     price: 301, image: "/products/chanel-coco-mademoiselle-intense-eau-de-parfum-301.jpg" },
  { name: "Classic Backpack",       price: 117, image: "/products/adidas-unisex-classic-three-stripes-backpack-back-117.jpg" },
  { name: "28QT Air Fryer Oven",    price: 567, image: "/products/28qt-air-fryer-toaster-oven-combo-567.jpg" },
  { name: "Electric Guitar",        price: 578, image: "/products/cream-electric-guitar-578.jpg" },
  { name: "Aspire Go 15 Laptop",    price: 676, image: "/products/acer-aspire-go-15-ai-ready-laptop-676.jpg" },
  { name: "4K UHD Projector",       price: 980, image: "/products/4k-projector-7000-lumens-s7-model-uhd-980.jpg" },
  { name: "Ergonomic Office Chair", price: 272, image: "/products/big-and-tall-office-chair-272.jpg" },
  { name: "Sauvage Elixir",         price: 286, image: "/products/christian-dior-sauvage-elixir-286.jpg" }
];

const PV_SCENE_MS = 3000;

function PvCheck({ size = 64 }: { size?: number }){
  return (
    <svg className="pv-check" width={size} height={size} viewBox="0 0 64 64">
      <circle className="pv-check-ring" cx="32" cy="32" r="28" pathLength="100"/>
      <path className="pv-check-tick" d="M20 33 l8 8 l16 -17" pathLength="100"/>
    </svg>
  );
}

function PvBox({ image }: { image: string }){
  return (
    <div className="pv-box-stage">
      <img className="pv-drop" src={image} alt=""/>
      <div className="pv-box">
        <div className="pv-f front"><span className="pv-logo">N</span><em>NEXDROP</em><i className="pv-tape-front"/></div>
        <div className="pv-f back"/>
        <div className="pv-f right"><span className="pv-arrows">↑↑</span></div>
        <div className="pv-f left"/>
        <div className="pv-f bottom"/>
        <div className="pv-top">
          <i className="pv-inside"/>
          <i className="pv-flap l"/>
          <i className="pv-flap r"/>
          <i className="pv-tape-top"/>
        </div>
      </div>
      <div className="pv-box-shadow"/>
    </div>
  );
}

function StoryScene(){
  // One counter drives everything: scene = tick % 6, product = tick / 6
  const [tick,setTick] = useState(0);
  const scene = tick % PV_STEPS.length;
  const idx = Math.floor(tick / PV_STEPS.length) % PV_PRODUCTS.length;
  const p = PV_PRODUCTS[idx];
  const orderNo = 2048 + idx * 7;
  const price = "$" + p.price.toFixed(2);

  // Preload product images so a swap never flashes empty
  useEffect(()=>{
    PV_PRODUCTS.forEach(x=>{ const im = new Image(); im.src = x.image; });
  },[]);

  // Advance one scene every 3s (after "Complete" the next product starts)
  useEffect(()=>{
    const t = setInterval(()=>setTick(n=>n + 1), PV_SCENE_MS);
    return ()=>clearInterval(t);
  },[]);

  const key = `${idx}-${scene}`;

  return (
    <div className="pv" aria-hidden="true">
      <div className="pv-aura"/>

      <div className="pv-phone">
        <span className="pv-island"/>
        <div className="pv-screen">
          <div className="pv-status"><b>9:41</b><span>▮▮▮ ◔</span></div>

          {scene === 0 && (
            <div className="pv-scene shop" key={key}>
              <div className="pv-appbar"><span>‹</span><b>Nexdrop</b><span className="pv-cart">🛒<em>1</em></span></div>
              <div className="pv-hero-img">
                <img src={p.image} alt=""/>
                <i className="pv-floor"/>
              </div>
              <div className="pv-info">
                <b>{p.name}</b>
                <span className="pv-rating">★★★★★ <small>4.9</small></span>
                <strong>{price}</strong>
              </div>
              <div className="pv-cta"><span className="pv-cta-a">Add to cart</span><span className="pv-cta-b">✓ Added to cart</span></div>
              <span className="pv-finger"/>
            </div>
          )}

          {scene === 1 && (
            <div className="pv-scene order" key={key}>
              <PvCheck size={70}/>
              <b className="pv-title">Order confirmed</b>
              <small className="pv-sub">Order #NX-{orderNo}</small>
              <div className="pv-sum">
                <img src={p.image} alt=""/>
                <div><b>{p.name}</b><small>Qty 1 · Free shipping</small><strong>{price}</strong></div>
              </div>
              <div className="pv-sparkles"><i/><i/><i/><i/><i/><i/></div>
            </div>
          )}

          {scene === 2 && (
            <div className="pv-scene pack" key={key}>
              <PvBox image={p.image}/>
              <b className="pv-title">Packing your order</b>
              <small className="pv-sub">Supplier warehouse</small>
              <div className="pv-bar"><i/></div>
            </div>
          )}

          {scene === 3 && (
            <div className="pv-scene ship" key={key}>
              <div className="pv-map">
                <svg viewBox="0 0 170 130" className="pv-map-svg">
                  <path d="M0 40 H170 M0 95 H170 M45 0 V130 M120 0 V130" stroke="#E2EFEB" strokeWidth="9"/>
                  <path className="pv-route-base" d="M22 108 C 50 108, 45 62, 85 62 S 128 22, 150 22"/>
                  <path className="pv-route" d="M22 108 C 50 108, 45 62, 85 62 S 128 22, 150 22" pathLength="100"/>
                  <circle cx="22" cy="108" r="5" fill="#0D9488"/>
                </svg>
                <span className="pv-pin">📍</span>
                <span className="pv-van">🚚</span>
              </div>
              <div className="pv-sheet">
                <div className="pv-sheet-top"><b>In transit</b><em>ETA today</em></div>
                <div className="pv-track"><i className="done"/><i className="done"/><i className="live"/><i/></div>
                <small>#NX-{orderNo} · {p.name}</small>
              </div>
            </div>
          )}

          {scene === 4 && (
            <div className="pv-scene deliver" key={key}>
              <div className="pv-door">
                <span className="pv-house">🏠</span>
                <img className="pv-parcel" src={p.image} alt=""/>
                <span className="pv-door-check"><PvCheck size={34}/></span>
              </div>
              <b className="pv-title">Delivered</b>
              <small className="pv-sub">Left at the front door</small>
              <span className="pv-stars">★★★★★</span>
            </div>
          )}

          {scene === 5 && (
            <div className="pv-scene done" key={key}>
              <div className="pv-deal">
                <i className="pv-deal-ring"/>
                <span className="pv-deal-emoji">🤝</span>
              </div>
              <b className="pv-title">Order completed</b>
              <small className="pv-sub">#NX-{orderNo} closed successfully</small>
              <div className="pv-chips">
                {["Placed","Packed","Shipped","Delivered"].map((c,i)=>(
                  <span key={c} style={{ ["--d" as any]: `${0.5 + i * 0.12}s` }}><i>✓</i>{c}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <ol className="pv-steps">
        {PV_STEPS.map((s,i)=>(
          <li key={s.k} className={i === scene ? "on" : i < scene ? "past" : ""}>
            <span>{s.icon}</span>
            <small>{s.k}</small>
          </li>
        ))}
      </ol>
    </div>
  );
}


export default function Dashboard(){

  const [data,setData] = useState<any>(null);
  const [orders,setOrders] = useState<any[]>([]);
  const [products,setProducts] = useState<any[]>([]);
  const [storeViews,setStoreViews] = useState<number>(0);

  const load = useCallback(async()=>{
    try {
      const [
        me,
        ordersRes,
        productsRes
      ] = await Promise.all([
        apiMe(),
        apiFetch("/api/orders",{ cache:"no-store" }),
        apiFetch("/api/store-products",{ cache:"no-store" })
      ]);

      const ordersData = await ordersRes.json();
      const productsData = await productsRes.json();

      setData(me);
      setOrders(Array.isArray(ordersData?.orders) ? ordersData.orders : []);
      setProducts(Array.isArray(productsData?.products) ? productsData.products : []);
    } catch {}
  }, []);

  useEffect(()=>{
    load();
  },[load]);

  useRealtimeStream(()=>{
    load();
  });


  // Store Views — fluctuates live between admin-set min/max range
  // If admin hasn't set a range (both 0), stays at 0
  useEffect(()=>{
    const vMin = Number(data?.user?.storeViewsMin || 0);
    const vMax = Number(data?.user?.storeViewsMax || 0);

    // No range set → show 0, no animation
    if (vMin === 0 && vMax === 0) {
      setStoreViews(0);
      return;
    }

    const range = vMax - vMin;
    const initial = vMin + Math.floor(Math.random() * (range + 1));
    setStoreViews(initial);

    const interval = setInterval(()=>{
      setStoreViews(prev=>{
        const delta = Math.floor(Math.random() * 61) - 30;
        const next = prev + delta;
        return Math.min(vMax, Math.max(vMin, next));
      });
    }, 3500);

    return ()=>clearInterval(interval);
  },[data?.user?.storeViewsMin, data?.user?.storeViewsMax]);





  const totalProducts =
    products.length;



  const totalOrders =
    orders.length;



  const totalSales =
    orders
      .filter((o:any)=>
        [
          "delivered",
          "completed"
        ].includes(o.status)
      )
      .reduce(
        (sum:number,o:any)=>
          sum + Number(o.orderAmount || 0),
        0
      );



  const pendingOrders =
    orders.filter((o:any)=>
      [
        "sent",
        "pending"
      ].includes(o.status)
    ).length;



  const onWayOrders =
    orders.filter((o:any)=>
      [
        "handed_over",
        "on_the_way"
      ].includes(o.status)
    ).length;



  const deliveredOrders =
    orders.filter((o:any)=>
      [
        "delivered",
        "completed"
      ].includes(o.status)
    ).length;



  const recentOrders =
    orders.slice(0,5);

  const kycStatus = String(data?.user?.kycStatus || "pending").toLowerCase();
  const kycApproved = kycStatus === "approved" || kycStatus === "verified";

  const firstName = String(data?.user?.name || "Seller").split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const todayLabel = new Date().toLocaleDateString([], { weekday: "long", day: "numeric", month: "short" });
  // Share of orders that reached delivery — drives the truck on the journey rail
  const journeyPct = totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0;

  const planName = (data?.user?.currentPackageName || "").toLowerCase();
  let planIcon = "⭐";
  let planClass = "";
  if(planName.includes("diamond")){ planIcon = "💎"; planClass = "plan-diamond"; }
  else if(planName.includes("silver")){ planIcon = "🥈"; planClass = "plan-silver"; }
  else if(planName.includes("bronze")){ planIcon = "🥉"; planClass = "plan-bronze"; }
const salesData = orders.map((o:any)=>({

  date:new Date(o.createdAt)
    .toLocaleDateString(
      "en-US",
      {
        month:"short",
        day:"numeric"
      }
    ),

  sales:Number(o.orderAmount || 0)

}));



const orderStats = {

  newOrder: orders.filter((o:any)=>
    o.status==="sent"
  ).length,


  cancelled: orders.filter((o:any)=>
    o.status==="cancelled"
  ).length,


  onDelivery: orders.filter((o:any)=>
    [
      "handed_over",
      "on_the_way"
    ].includes(o.status)
  ).length,


  delivered: orders.filter((o:any)=>
    [
      "completed",
      "delivered"
    ].includes(o.status)
  ).length

};


  return (

    <UserShell>


      {/* ---------- 3D welcome hero ---------- */}
      <section className="dx-hero">
        <div className="dx-hero-copy">
          <span className="dx-hello">{greeting} 👋</span>
          <h1>Welcome back, {firstName}</h1>
          <p>
            {data?.user?.shopName ? <><b>{data.user.shopName}</b> · </> : null}
            Here's what's happening in your Nexdrop store today.
          </p>
          <div className="dx-hero-meta">
            <span className="dx-pill plan">★ {data?.user?.currentPackageName || "No plan"}</span>
            <span className={`dx-pill ${kycApproved ? "ok" : kycStatus === "rejected" ? "bad" : "wait"}`}>
              <i/>{kycApproved ? "Verified seller" : kycStatus === "rejected" ? "KYC rejected" : "KYC pending"}
            </span>
            <span className="dx-pill date">{todayLabel}</span>
          </div>
          <div className="dx-actions">
            <Link href="/my-store" className="dx-act primary">🏪 My Store</Link>
            <Link href="/orders" className="dx-act">📦 Orders{pendingOrders > 0 && <em>{pendingOrders}</em>}</Link>
            <Link href="/order-status" className="dx-act">🚚 Tracking</Link>
          </div>
        </div>
        <StoryScene/>
      </section>

      {/* ---------- 3D stat cards ---------- */}
      <div className="dx-stats">
        <Tilt className="dx-stat">
          <span className="dx-ico c1">🛍️</span>
          <span className="dx-label">Products</span>
          <strong><CountUp value={totalProducts}/></strong>
          <small>In your store</small>
        </Tilt>
        <Tilt className="dx-stat">
          <span className="dx-ico c2">📦</span>
          <span className="dx-label">Total Orders</span>
          <strong><CountUp value={totalOrders}/></strong>
          <small>{pendingOrders} waiting · {deliveredOrders} delivered</small>
        </Tilt>
        <Tilt className="dx-stat">
          <span className="dx-ico c3">💹</span>
          <span className="dx-label">Total Sales</span>
          <strong><CountUp value={totalSales} money/></strong>
          <small>Completed sales</small>
        </Tilt>
        <Tilt className={`dx-stat ${kycApproved ? "" : "warn"}`}>
          <span className={`dx-ico ${kycApproved ? "c4" : "c5"}`}>🛡️</span>
          <span className="dx-label">Verification</span>
          <strong className="dx-word">{kycApproved ? "Verified" : kycStatus === "rejected" ? "Rejected" : "Pending"}</strong>
          <small>{kycApproved ? "KYC approved seller" : kycStatus === "rejected" ? "Please resubmit your KYC" : "KYC under review"}</small>
        </Tilt>
        <Tilt className="dx-stat">
          <span className="dx-ico c6">👁️</span>
          <span className="dx-label">Store Views</span>
          <strong>{storeViews.toLocaleString()}</strong>
          <small>Store activity</small>
        </Tilt>
      </div>

      {/* ---------- Order journey ---------- */}
      <section className="dx-journey">
        <div className="dx-journey-head">
          <div>
            <span className="eyebrow">Order Journey</span>
            <h2>From new order to delivery</h2>
          </div>
          <Link href="/order-status" className="dx-link">View tracking →</Link>
        </div>
        <div className="dx-track">
          <div className="dx-rail"><i style={{ width: `${journeyPct}%` }}/></div>
          <span className="dx-truck" style={{ ["--p" as any]: journeyPct }} aria-hidden="true">🚚</span>
          {[
            { k: "New", v: orderStats.newOrder, icon: "🆕" },
            { k: "Grabbed", v: orders.filter((o:any)=>o.status === "pending").length, icon: "🤝" },
            { k: "On the way", v: orderStats.onDelivery, icon: "🛣️" },
            { k: "Delivered", v: orderStats.delivered, icon: "✅" }
          ].map(s=>(
            <div className={`dx-stop ${s.v > 0 ? "on" : ""}`} key={s.k}>
              <span className="dx-stop-dot">{s.icon}</span>
              <b><CountUp value={s.v}/></b>
              <small>{s.k}</small>
            </div>
          ))}
        </div>
      </section>

      <div className="content-grid">
        {/* LEFT COLUMN: Balance & Profit + Sales Overview */}
        <div className="dash-col">

          {/* 1. Balance & Profit Summary */}
          <section className="panel dash-panel">
            <div className="panel-head">
              <div>
                <span className="eyebrow">Account Summary</span>
                <h2>Balance & Profit</h2>
              </div>
            </div>

            <div className="dash-funds">
              <div className="dash-fund balance">
                <span className="dash-fund-icon">💳</span>
                <div className="dash-fund-label">Total Balance</div>
                <strong>${Number(data?.user?.balance || 0).toFixed(2)}</strong>
                <small>Available account balance</small>
              </div>

              <div className="dash-fund profit">
                <span className="dash-fund-icon">📈</span>
                <div className="dash-fund-label">Total Profit</div>
                <strong>${Number(data?.user?.profit || 0).toFixed(2)}</strong>
                <small>Total earnings</small>
              </div>
            </div>
          </section>

          {/* 2. Sales Overview Chart */}
          <section className="panel dash-panel dash-grow">
            <div className="panel-head">
              <div>
                <span className="eyebrow">Sales Statistics</span>
                <h2>Sales Overview</h2>
              </div>
            </div>

            <div className="dash-chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.35}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" axisLine={false} tickLine={false} stroke="#5F7A76" fontSize={11} />
                  <YAxis axisLine={false} tickLine={false} stroke="#5F7A76" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "#FFFFFF",
                      border: "1px solid rgba(13,148,136,.25)",
                      borderRadius: "12px",
                      color: "#0B2A27",
                      boxShadow: "0 12px 28px rgba(13,148,136,.16)"
                    }}
                    formatter={(value: any) => [`$${Number(value).toFixed(2)}`, "Sales"]}
                  />
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(13,148,136,.14)" vertical={false} />
                  <Area type="monotone" dataKey="sales" stroke="#0D9488" strokeWidth={3} fill="url(#salesGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

        </div>

        {/* RIGHT COLUMN: Purchased Package */}
        <section className="panel dash-plan">
          <div className="panel-head">
            <div>
              <span className="eyebrow">Seller Plan</span>
              <h2>Purchased Package</h2>
            </div>
          </div>

          <div className="dash-plan-body">
            <div className="dash-plan-badge">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
                <polygon
                  points="20,3 24.5,14.5 37,14.5 27,22 30.5,34 20,27 9.5,34 13,22 3,14.5 15.5,14.5"
                  fill="url(#planStarGrad)"
                />
                <defs>
                  <linearGradient id="planStarGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#FFFFFF"/>
                    <stop offset="100%" stopColor="#A7F3D0"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <span className="dash-plan-kicker">Current Active Package</span>
            <h3 className="dash-plan-name">{data?.user?.currentPackageName || "No Active Package"}</h3>

            <span className="dash-plan-status">
              <i/>
              {data?.user?.packageStatus === "active" ? "Active Membership" : (data?.user?.packageStatus || "Active")}
            </span>

            <div className="dash-plan-rows">
              <div className="dash-plan-row">
                <span><em>📦</em> Product Limit</span>
                <strong>{data?.user?.productLimit || 0} Products</strong>
              </div>
              <div className="dash-plan-row">
                <span><em>💰</em> Profit Commission</span>
                <strong className="accent">{data?.user?.commissionRate || 0}%</strong>
              </div>
            </div>

            <Link href="/traffic-packages" className="dash-plan-cta">
              <span>Upgrade Package</span>
              <span aria-hidden="true">→</span>
            </Link>

            <p className="dash-plan-note">
              Want a higher plan? Reach out to our customer support team and we'll help you upgrade.
            </p>
          </div>
        </section>

      </div>

      {/* FULL WIDTH: Recent Activity (cleanly placed underneath the grid) */}
      <section className="panel">

        <div className="panel-head">


          <div>

            <span className="eyebrow">
              Recent Activity
            </span>


            <h2>
              Recent Orders
            </h2>


          </div>



          <Link
            className="btn btn-small"
            href="/order-status"
          >
            View All
          </Link>


        </div>






        {recentOrders.length === 0 ? (


          <div className="empty-state">

            No orders available yet.

          </div>



        ) : (



          <div className="table-wrap">


            <table>


              <thead>


                <tr>


                  <th>
                    Product
                  </th>


                  <th>
                    Amount
                  </th>


                  <th>
                    Status
                  </th>


                </tr>


              </thead>





              <tbody>



                {recentOrders.map((o:any)=>(


                  <tr key={o.id}>


                    <td>


                      <div className="user-cell">


                        {o.image && (


                          <img
                            className="table-thumb"
                            src={o.image}
                            alt=""
                          />


                        )}




                        <div>


                          <b>
                            {o.productName}
                          </b>


                          <small>
                            Order #{String(o.id).slice(0,8)}
                          </small>


                        </div>



                      </div>



                    </td>





                    <td>

                      ${Number(
                        o.orderAmount || 0
                      ).toFixed(2)}

                    </td>





                    <td>


                      <span
                        className={`status ${o.status}`}
                      >

                        {String(o.status).replace("_"," ")}

                      </span>



                    </td>



                  </tr>



                ))}



              </tbody>



            </table>



          </div>



              )}

      </section>

    </UserShell>

  );
}
