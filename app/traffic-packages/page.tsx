"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { UserShell } from "../components";
import { apiFetch, apiMe, useRealtimeStream } from "../lib";

/* ── Rank badge SVGs ── */
function SilverBadge() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      {/* ribbon tails */}
      <polygon points="28,52 20,80 40,68 60,80 52,52" fill="#94a3b8"/>
      {/* outer circle */}
      <circle cx="40" cy="36" r="32" fill="url(#sg)" stroke="#cbd5e1" strokeWidth="3"/>
      {/* inner circle */}
      <circle cx="40" cy="36" r="22" fill="url(#si)" stroke="#e2e8f0" strokeWidth="2"/>
      {/* S letter */}
      <text x="40" y="43" textAnchor="middle" fontSize="22" fontWeight="900" fill="#475569" fontFamily="sans-serif">S</text>
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f1f5f9"/>
          <stop offset="50%" stopColor="#94a3b8"/>
          <stop offset="100%" stopColor="#64748b"/>
        </linearGradient>
        <linearGradient id="si" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e2e8f0"/>
          <stop offset="100%" stopColor="#cbd5e1"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

function GoldBadge() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      <polygon points="28,52 20,80 40,68 60,80 52,52" fill="#d97706"/>
      <circle cx="40" cy="36" r="32" fill="url(#gg)" stroke="#fbbf24" strokeWidth="3"/>
      <circle cx="40" cy="36" r="22" fill="url(#gi)" stroke="#fde68a" strokeWidth="2"/>
      <text x="40" y="43" textAnchor="middle" fontSize="22" fontWeight="900" fill="#78350f" fontFamily="sans-serif">G</text>
      <defs>
        <linearGradient id="gg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fef3c7"/>
          <stop offset="50%" stopColor="#f59e0b"/>
          <stop offset="100%" stopColor="#b45309"/>
        </linearGradient>
        <linearGradient id="gi" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fde68a"/>
          <stop offset="100%" stopColor="#fbbf24"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

function DiamondBadge() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      <polygon points="28,52 20,80 40,68 60,80 52,52" fill="#0891b2"/>
      <circle cx="40" cy="36" r="32" fill="url(#dg)" stroke="#38bdf8" strokeWidth="3"/>
      <circle cx="40" cy="36" r="22" fill="url(#di)" stroke="#e0f2fe" strokeWidth="2"/>
      {/* Diamond shape */}
      <polygon points="40,20 52,33 40,52 28,33" fill="url(#ds)" stroke="#e0f2fe" strokeWidth="1"/>
      <defs>
        <linearGradient id="dg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e0f2fe"/>
          <stop offset="50%" stopColor="#0ea5e9"/>
          <stop offset="100%" stopColor="#0369a1"/>
        </linearGradient>
        <linearGradient id="di" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#bae6fd"/>
          <stop offset="100%" stopColor="#38bdf8"/>
        </linearGradient>
        <linearGradient id="ds" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f0f9ff"/>
          <stop offset="100%" stopColor="#7dd3fc"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function TrafficPackages(){

  const [packages,setPackages]=useState<any[]>([]);
  const [currentUserPackage,setCurrentUserPackage]=useState("");
  const [message,setMessage]=useState("");
  const [messageOk,setMessageOk]=useState(false);
  const [requesting,setRequesting]=useState("");

  const load = useCallback(async()=>{
    try {
      const [pkgRes, meRes] = await Promise.all([
        apiFetch("/api/packages", { cache:"no-store" }),
        apiMe()
      ]);
      const pkgData = await pkgRes.json();
      setPackages(pkgData.packages || []);
      setCurrentUserPackage(meRes?.user?.currentPackageName || "");
    } catch {}
  }, []);

  useEffect(()=>{ load(); },[load]);
  useRealtimeStream(()=>{ load(); });

  const requestPlan=async(id:string)=>{
    setMessage("");
    setRequesting(id);
    try{
      const r=await apiFetch("/api/package-request",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({packageId:id})
      });
      const d=await r.json();
      if(r.ok){
        setMessage(d.message||"Request submitted. Admin will review shortly.");
        setMessageOk(true);
      } else {
        setMessage(d.error||"Request failed.");
        setMessageOk(false);
      }
    }catch{
      setMessage("Unable to submit package request.");
      setMessageOk(false);
    }finally{
      setRequesting("");
    }
  };

  const featuresFor=(p:any)=>[
    `${p.productLimit} Product Upload Limit`,
    `${p.commission}% Max Profit Commission`,
    "Seller Dashboard Access",
    "Order Management",
    "Order Tracking",
    "Withdrawal Requests",
  ];

  /* Sort: Silver first, Gold second, Diamond third */
  const sorted = [...packages].sort((a,b)=>{
    const rank=(n:string)=>{
      const k=n.toLowerCase();
      if(k.includes("silver"))  return 0;
      if(k.includes("gold"))    return 1;
      if(k.includes("diamond")) return 2;
      return 3;
    };
    return rank(a.name)-rank(b.name);
  });

  /* Per-rank theme tokens */
  const rankTheme=(name:string)=>{
    const k=name.toLowerCase();
    if(k.includes("silver")) return {
      accent:"#64748b", accentLight:"#94a3b8", bg:"linear-gradient(160deg,#dde6f0 0%,#c8d6e0 100%)",
      border:"#94a3b8", badgeFn:<SilverBadge/>, label:"Silver"
    };
    if(k.includes("gold")) return {
      accent:"#b45309", accentLight:"#f59e0b", bg:"linear-gradient(160deg,#fef3c7 0%,#fde68a 100%)",
      border:"#f59e0b", badgeFn:<GoldBadge/>, label:"Gold"
    };
    if(k.includes("diamond")) return {
      accent:"#0369a1", accentLight:"#38bdf8", bg:"linear-gradient(160deg,#e0f2fe 0%,#bae6fd 100%)",
      border:"#38bdf8", badgeFn:<DiamondBadge/>, label:"Diamond"
    };
    return {
      accent:"#0D9488", accentLight:"#14b8a6", bg:"linear-gradient(160deg,#ccfbf1 0%,#99f6e4 100%)",
      border:"#0D9488", badgeFn:null, label:name
    };
  };

  const activeName = currentUserPackage || (sorted.find(p=>String(p.name).toLowerCase().includes("silver"))?.name || "");
  const isCurrent = (name:string)=>activeName.toLowerCase() === String(name).toLowerCase();

  const compareRows:[string,(p:any)=>React.ReactNode][] = [
    ["Price", p=>Number(p.price||0)===0 ? "Free" : `$${Number(p.price).toLocaleString()}`],
    ["Product upload limit", p=>`${p.productLimit} products`],
    ["Max profit commission", p=>`${p.commission}%`],
    ["Seller dashboard", ()=>"✓"],
    ["Order management & tracking", ()=>"✓"],
    ["Withdrawal requests", ()=>"✓"]
  ];

  return(
    <UserShell>
      <div className="pk">

        {/* ---------- hero ---------- */}
        <section className="pk-hero">
          <div className="pk-hero-copy">
            <span className="pk-crown" aria-hidden="true">♛</span>
            <span className="eyebrow">Seller Membership</span>
            <h1>Premium Packages for Sellers</h1>
            <p>Choose the right package for your store. Every package request requires admin approval.</p>
          </div>
          <div className="pk-current">
            <small>Your current plan</small>
            <b>{activeName || "No plan"}</b>
            <span><i/> Active</span>
          </div>
        </section>

        {message && (
          <div className={`pk-msg ${messageOk ? "ok" : "bad"}`}>
            <span>{messageOk ? "✓" : "!"}</span>
            <p>
              {message}{" "}
              {messageOk && <Link href="/support">Contact Support</Link>}
            </p>
          </div>
        )}

        {/* ---------- plan cards ---------- */}
        <div className="pk-grid">
          {sorted.map((p:any, i:number)=>{
            const name = String(p.name||"");
            const theme = rankTheme(name);
            const price = Number(p.price||0);
            const current = isCurrent(name);
            const features = featuresFor(p);
            const tier = theme.label.toLowerCase();
            return(
              <section
                key={p.id}
                className={`pk-card ${tier} ${current ? "current" : ""}`}
                style={{ ["--ac" as any]: theme.accent, ["--acl" as any]: theme.accentLight, animationDelay: `${i * 0.1}s` }}
              >
                <span className="pk-shine" aria-hidden="true"/>
                {current && <span className="pk-ribbon">Current plan</span>}

                <div className="pk-card-top">
                  <div className="pk-badge">{theme.badgeFn}</div>
                  <div>
                    <span className="pk-tier">{theme.label} Shop</span>
                    <p className="pk-tag">
                      {tier === "silver" ? "Perfect for getting started." : tier === "gold" ? "Best for growing sellers." : "For advanced high-volume sellers."}
                    </p>
                  </div>
                </div>

                <div className="pk-price">
                  <strong>{price === 0 ? "Free" : `$${price.toLocaleString()}`}</strong>
                </div>

                <div className="pk-highlights">
                  <div><b>{p.productLimit}</b><small>Product limit</small></div>
                  <div><b>{p.commission}%</b><small>Max profit</small></div>
                </div>

                <ul className="pk-features">
                  {features.slice(2).map(f=>(
                    <li key={f}><i>✓</i>{f}</li>
                  ))}
                </ul>

                <div className="pk-cta">
                  {current ? (
                    <div className="pk-btn current">✓ Current Active Plan</div>
                  ) : (
                    <button type="button" className="pk-btn" disabled={requesting===p.id} onClick={()=>requestPlan(p.id)}>
                      {requesting===p.id ? "Sending…" : "Request This Plan →"}
                    </button>
                  )}
                </div>
              </section>
            );
          })}
        </div>

        {/* ---------- comparison ---------- */}
        {sorted.length > 0 && (
          <section className="pk-compare">
            <div className="pk-compare-head">
              <span className="eyebrow">Compare plans</span>
              <h2>Everything side by side</h2>
            </div>
            <div className="pk-table-wrap">
              <table className="pk-table">
                <thead>
                  <tr>
                    <th>Feature</th>
                    {sorted.map((p:any)=>(
                      <th key={p.id} className={`${rankTheme(String(p.name)).label.toLowerCase()} ${isCurrent(p.name) ? "current" : ""}`}>
                        {p.name}{isCurrent(p.name) && <em>Current</em>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {compareRows.map(([label,fn])=>(
                    <tr key={label}>
                      <td>{label}</td>
                      {sorted.map((p:any)=>{
                        const v = fn(p);
                        return <td key={p.id} className={v === "✓" ? "yes" : ""}>{v}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ---------- info strip ---------- */}
        <div className="pk-info">
          {[
            ["🛡","Secure & Safe","Protected seller account"],
            ["✓","Admin Controlled","Plans require approval"],
            ["◉","Priority Support","Seller support access"],
            ["🔒","Account Protection","Freeze/closure protection"],
            ["$","Guarantee Money","Admin-controlled security"]
          ].map(item=>(
            <div key={item[1]}>
              <span>{item[0]}</span>
              <div>
                <b>{item[1]}</b>
                <small>{item[2]}</small>
              </div>
            </div>
          ))}
        </div>

        <p className="pk-note">🔒 All package requests are subject to admin approval.</p>
      </div>
    </UserShell>
  );
}
