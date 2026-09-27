"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiMe, clearSession } from "../lib";

export default function KycPending(){

  const router = useRouter();
  const [shopName,setShopName] = useState("");

  useEffect(()=>{
    apiMe()
      .then((d:any)=>{
        setShopName(d.user.shopName || "");
      })
      .catch(()=>{
        clearSession();
        router.replace("/login");
      });
  },[router]);

  return (
    <main className="kp-page">

      <section className="kp-card">

        <div className="kp-brand">
          <span className="kp-brand-mark">N</span>
          <span>NEX<b>DROP</b></span>
        </div>

        {/* Pending icon: amber hourglass with a soft pulse */}
        <div className="kp-icon" aria-hidden="true">
          <span className="kp-icon-ring"/>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2h12M6 22h12"/>
            <path d="M7 2v3.5a5 5 0 0 0 2.2 4.1L12 12l-2.8 2.4A5 5 0 0 0 7 18.5V22"/>
            <path d="M17 2v3.5a5 5 0 0 1-2.2 4.1L12 12l2.8 2.4a5 5 0 0 1 2.2 4.1V22"/>
            <path d="M9.5 19h5" />
          </svg>
        </div>

        <span className="kp-badge">
          <i/> Pending verification
        </span>

        <h1>
          <small>Seller Application</small>
          Under Review
        </h1>

        <p className="kp-text">
          Your seller application has been submitted successfully.
          Our team will review your KYC documents before activating
          your seller account.
        </p>

        {/* Progress */}
        <ol className="kp-steps" aria-label="Application progress">
          <li className="done">
            <span className="kp-dot">
              <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M4 10.5l3.6 3.6L16 5.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <small>Submitted</small>
          </li>
          <li className="active">
            <span className="kp-dot"><i/></span>
            <small>Under review</small>
          </li>
          <li>
            <span className="kp-dot">3</span>
            <small>Approved</small>
          </li>
        </ol>

        {shopName && (
          <div className="kp-shop">
            <span className="kp-shop-icon">🏪</span>
            <div>
              <small>Shop name</small>
              <strong>{shopName}</strong>
            </div>
          </div>
        )}

        <div className="kp-info">
          <div>
            <span>Status</span>
            <b className="kp-pill">Pending Approval</b>
          </div>
          <div>
            <span>Access</span>
            <b>Waiting for Admin Review</b>
          </div>
        </div>

        <div className="kp-actions">
          <button
            onClick={()=>router.push("/")}
            className="kp-btn primary"
          >
            Back to Home
          </button>

          <button
            onClick={()=>{
              clearSession();
              router.replace("/login");
            }}
            className="kp-btn ghost"
          >
            Logout
          </button>
        </div>

        <p className="kp-support">
          Taking longer than expected? <a href="/support">Contact support</a>
        </p>

      </section>

    </main>
  );
}
