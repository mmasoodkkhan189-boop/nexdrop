"use client";

import Link from "next/link";
import { useRef } from "react";
import "./landing.css";
import "./auth.css";

type Props = {
  eyebrow: string;
  title: React.ReactNode;
  text: string;
  points: string[];
  children: React.ReactNode;
};

// Shared premium 3D layout for the login / register pages
export function AuthShell({ eyebrow, title, text, points, children }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = stageRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--ry", `${((e.clientX - r.left) / r.width - 0.5) * 20}deg`);
    el.style.setProperty("--rx", `${-((e.clientY - r.top) / r.height - 0.5) * 16}deg`);
  };
  const onLeave = () => {
    stageRef.current?.style.setProperty("--ry", "0deg");
    stageRef.current?.style.setProperty("--rx", "0deg");
  };

  return (
    <main className="nx nx-auth">
      <div className="nx-bg" aria-hidden>
        <span className="nx-blob b1" /><span className="nx-blob b2" />
        <div className="nx-grid" />
      </div>

      <div className="nx-auth-wrap">
        <aside className="nx-auth-side">
          <Link href="/" className="nx-brand"><span className="nx-mark">N</span><span>NEX<b>DROP</b></span></Link>

          <div className="nx-auth-stage" ref={stageRef} onMouseMove={onMove} onMouseLeave={onLeave} aria-hidden>
            <div className="nx-auth-scene">
              <div className="nx-orbit o1"><i /></div>
              <div className="nx-orbit o2"><i /></div>
              <div className="nx-auth-cube">
                <div className="nx-cube">
                  <span className="f1">N</span><span className="f2" /><span className="f3">N</span>
                  <span className="f4" /><span className="f5" /><span className="f6" />
                </div>
              </div>
              <div className="nx-float a1"><span className="nx-ico ok">✓</span><div><small>Account</small><b>Secured</b></div></div>
              <div className="nx-float a2"><span className="nx-ico">$</span><div><small>Balance</small><b>+$2,480</b></div></div>
            </div>
          </div>

          <div className="nx-auth-copy">
            <span className="nx-eyebrow"><span className="nx-dot" /> {eyebrow}</span>
            <h2>{title}</h2>
            <p>{text}</p>
            <ul>{points.map((p) => <li key={p}>{p}</li>)}</ul>
          </div>
        </aside>

        <div className="nx-auth-main">{children}</div>
      </div>
    </main>
  );
}
