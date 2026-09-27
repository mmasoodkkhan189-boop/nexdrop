"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import "./landing.css";

const features = [
  { n: "01", icon: "◆", title: "Seller Accounts", text: "Secure login, customized shop profile and store dashboard for every seller." },
  { n: "02", icon: "▲", title: "Store & Orders", text: "Add products, pick up orders, earn commissions and track delivery status in real time." },
  { n: "03", icon: "●", title: "Dedicated Support", text: "Stay connected with real-time support and instant notifications." },
];

function useCountUp(target: number, duration = 1600) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

export default function Home() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [activeUsers, setActiveUsers] = useState(12500);
  const [openChats, setOpenChats] = useState(40);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const randomBetween = (min: number, max: number) =>
      Math.floor(Math.random() * (max - min + 1)) + min;
    setActiveUsers(randomBetween(10000, 15000));
    setOpenChats(randomBetween(20, 80));
  }, []);

  const sellers = useCountUp(activeUsers);
  const chats = useCountUp(openChats, 1200);

  // Mouse-driven 3D tilt for the hero stage
  const onStageMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = stageRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--ry", `${x * 18}deg`);
    el.style.setProperty("--rx", `${-y * 14}deg`);
  };
  const onStageLeave = () => {
    stageRef.current?.style.setProperty("--ry", "0deg");
    stageRef.current?.style.setProperty("--rx", "0deg");
  };

  // Per-card tilt for feature cards
  const onCardMove = (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--ry", `${x * 16}deg`);
    el.style.setProperty("--rx", `${-y * 16}deg`);
    el.style.setProperty("--mx", `${(x + 0.5) * 100}%`);
    el.style.setProperty("--my", `${(y + 0.5) * 100}%`);
  };
  const onCardLeave = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.setProperty("--ry", "0deg");
    e.currentTarget.style.setProperty("--rx", "0deg");
  };

  return (
    <main className="nx">
      <div className="nx-bg" aria-hidden>
        <span className="nx-blob b1" /><span className="nx-blob b2" /><span className="nx-blob b3" />
        <div className="nx-grid" />
      </div>

      <nav className="nx-nav nx-wrap">
        <div className="nx-brand"><span className="nx-mark">N</span><span>NEX<b>DROP</b></span></div>
        <div className="nx-links">
          <Link href="/login">Login</Link>
          <Link className="nx-btn nx-btn-sm" href="/register">Get Started</Link>
        </div>
      </nav>

      <section className="nx-hero nx-wrap">
        <div className="nx-copy">
          <div className="nx-eyebrow"><span className="nx-dot" /> Dropshipping workspace</div>
          <h1>
            Nexdrop Platform.<br />
            <span className="nx-shine">We handle it all.</span>
          </h1>
          <p>One clean workspace for your seller account, orders, balance, support and customer communication.</p>
          <div className="nx-actions">
            <Link className="nx-btn" href="/register">Create Account <i>→</i></Link>
            <Link className="nx-btn nx-btn-ghost" href="/login">Sign In</Link>
          </div>
          <div className="nx-trust"><span>✓ Seller accounts</span><span>✓ Admin controls</span><span>✓ 24/7 Support</span></div>
        </div>

        <div className="nx-stage" ref={stageRef} onMouseMove={onStageMove} onMouseLeave={onStageLeave}>
          <div className="nx-scene">
            <div className="nx-orbit o1"><i /></div>
            <div className="nx-orbit o2"><i /></div>
            <div className="nx-orbit o3"><i /></div>

            <div className="nx-cube-wrap">
              <div className="nx-cube">
                <span className="f1">N</span><span className="f2" /><span className="f3">N</span>
                <span className="f4" /><span className="f5" /><span className="f6" />
              </div>
            </div>
            <div className="nx-mini m1"><div className="nx-cube sm"><span className="f1" /><span className="f2" /><span className="f3" /><span className="f4" /><span className="f5" /><span className="f6" /></div></div>
            <div className="nx-mini m2"><div className="nx-cube sm"><span className="f1" /><span className="f2" /><span className="f3" /><span className="f4" /><span className="f5" /><span className="f6" /></div></div>

            <div className="nx-dash">
              <div className="nx-dash-top"><span>Nexdrop Platform</span><span className="nx-pill">● Live workspace</span></div>
              <div className="nx-stats">
                <div><small>Active sellers</small><strong>{sellers.toLocaleString()}</strong><em>▲ Live activity</em></div>
                <div><small>Open chats</small><strong>{chats}</strong><em>▲ Live support</em></div>
              </div>
              <div className="nx-chart">
                <svg viewBox="0 0 300 100" preserveAspectRatio="none" aria-hidden>
                  <defs>
                    <linearGradient id="nxArea" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0" stopColor="#2dd4bf" stopOpacity=".45" />
                      <stop offset="1" stopColor="#2dd4bf" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path className="nx-area" d="M0,80 C30,70 45,74 70,60 C95,46 110,58 140,44 C170,30 185,40 215,26 C245,12 265,20 300,8 L300,100 L0,100Z" fill="url(#nxArea)" />
                  <path className="nx-line" d="M0,80 C30,70 45,74 70,60 C95,46 110,58 140,44 C170,30 185,40 215,26 C245,12 265,20 300,8" />
                </svg>
                <div className="nx-bars"><i /><i /><i /><i /><i /><i /><i /></div>
              </div>
            </div>

            <div className="nx-float c1"><span className="nx-ico">$</span><div><small>Profit today</small><b>+$2,480</b></div></div>
            <div className="nx-float c2"><span className="nx-ico ok">✓</span><div><small>Order #NX-2291</small><b>Shipped</b></div></div>
            <div className="nx-float c3"><span className="nx-av">N</span><div><b>Nexdrop Support</b><small>Need help with your seller account?</small></div><span className="nx-badge">1</span></div>
          </div>
        </div>
      </section>

      <div className="nx-marquee" aria-hidden>
        <div>
          {Array.from({ length: 2 }).map((_, k) => (
            <span key={k}>Seller Dashboard ✦ Real-time Orders ✦ Instant Withdrawals ✦ KYC Verified ✦ Traffic Packages ✦ 24/7 Support ✦ </span>
          ))}
        </div>
      </div>

      <section className="nx-features nx-wrap">
        <div className="nx-head">
          <span className="nx-eyebrow">Everything in one place</span>
          <h2>Simple tools. <span className="nx-shine">Clear account control.</span></h2>
          <p>Manage your store, products, orders, profit and balance from one streamlined Nexdrop workspace.</p>
        </div>
        <div className="nx-cards">
          {features.map((f) => (
            <article key={f.n} className="nx-card" onMouseMove={onCardMove} onMouseLeave={onCardLeave}>
              <div className="nx-card-in">
                <div className="nx-card-icon"><span>{f.icon}</span></div>
                <span className="nx-num">{f.n}</span>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="nx-scale nx-wrap">
        <div className="nx-globe-stage" aria-hidden>
          <div className="nx-globe">
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={`m${i}`} className="mer" style={{ transform: `rotateY(${i * 22.5}deg)` }} />
            ))}
            {[-60, -30, 0, 30, 60].map((d) => (
              <span key={`p${d}`} className="par" style={{ "--lat": `${d}` } as React.CSSProperties} />
            ))}
            <span className="core" />
          </div>
          <div className="nx-ring-flat" />
        </div>
        <div className="nx-scale-copy">
          <span className="nx-eyebrow">Built for scale</span>
          <h2>One workspace. <span className="nx-shine">Sellers everywhere.</span></h2>
          <p>From your first product to thousands of orders, Nexdrop keeps every account, payout and conversation in sync.</p>
          <div className="nx-kpis">
            <div><b>{sellers.toLocaleString()}+</b><small>Active sellers</small></div>
            <div><b>99.9%</b><small>Uptime</small></div>
            <div><b>24/7</b><small>Live support</small></div>
          </div>
        </div>
      </section>

      <section className="nx-cta nx-wrap">
        <div className="nx-cta-in">
          <div><span className="nx-eyebrow">Stay connected</span><h2>Get Nexdrop updates.</h2></div>
          {sent ? (
            <div className="nx-success">✓ You’re on the update list.</div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); if (email.trim()) setSent(true); }}>
              <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <button className="nx-btn" type="submit">Notify me</button>
            </form>
          )}
        </div>
      </section>

      <footer className="nx-footer nx-wrap">
        <div className="nx-brand"><span className="nx-mark">N</span><span>NEX<b>DROP</b></span></div>
        <span>Nexdrop workspace © 2026</span>
      </footer>
    </main>
  );
}
