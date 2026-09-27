"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { apiFetch, useRealtimeStream } from "../../lib";
import { AdminShell } from "../../components";
import { useTilt } from "../useTilt";

type Tab = "pending" | "approved" | "rejected";
type Doc = { label: string; src: string };

const statusOf = (a:any): Tab => {
  const s = String(a.kycStatus || "").toLowerCase();
  return s === "approved" ? "approved" : s === "rejected" ? "rejected" : "pending";
};

// Flatten an applicant's documents into viewable images
function docsOf(a:any): Doc[] {
  const out: Doc[] = [];
  for (const d of a.documents || []) {
    const type = d.certificateType || "ID";
    if (d.certificateFront) out.push({ label: `${type} · Front`, src: d.certificateFront });
    if (d.certificateBack)  out.push({ label: `${type} · Back`,  src: d.certificateBack });
    if (d.selfie)           out.push({ label: "Selfie", src: d.selfie });
  }
  return out;
}

export default function AdminKyc(){

  const [applications,setApplications] = useState<any[]>([]);
  const [loading,setLoading] = useState(true);
  const [tab,setTab] = useState<Tab>("pending");
  const [search,setSearch] = useState("");
  const [busy,setBusy] = useState<string | null>(null);
  const [message,setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [viewer,setViewer] = useState<{ docs: Doc[]; index: number; name: string } | null>(null);

  const load = useCallback(async()=>{
    try {
      const r = await apiFetch(`/api/admin/kyc?status=all`, { cache:"no-store" });
      const d = await r.json();
      setApplications(d.applications || []);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(()=>{ load(); },[load]);
  useRealtimeStream(()=>{ load(); });
  useTilt();

  useEffect(()=>{
    if(!message) return;
    const t = setTimeout(()=>setMessage(null), 5000);
    return ()=>clearTimeout(t);
  },[message]);

  // Keyboard control for the document viewer
  useEffect(()=>{
    if(!viewer) return;
    const onKey = (e: KeyboardEvent)=>{
      if(e.key === "Escape") setViewer(null);
      if(e.key === "ArrowRight") setViewer(v => v && { ...v, index: (v.index + 1) % v.docs.length });
      if(e.key === "ArrowLeft")  setViewer(v => v && { ...v, index: (v.index - 1 + v.docs.length) % v.docs.length });
    };
    window.addEventListener("keydown", onKey);
    return ()=>window.removeEventListener("keydown", onKey);
  },[viewer]);

  const updateKyc = async(a:any, action:"approve" | "reject")=>{
    if(busy) return;
    if(action === "reject" && !confirm(`Reject KYC for ${a.name}? They will need to submit their documents again.`)) return;
    setBusy(a.id);
    try{
      const r = await apiFetch("/api/admin/kyc",{
        method:"PATCH",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({ userId:a.id, action })
      });
      const d = await r.json().catch(()=>({}));
      if(r.ok){
        setMessage({ ok: true, text: action === "approve" ? `${a.name}'s KYC approved.` : `${a.name}'s KYC rejected.` });
        await load();
      }else{
        setMessage({ ok: false, text: d.error || "Could not update KYC" });
      }
    }finally{
      setBusy(null);
    }
  };

  const counts = useMemo(()=>({
    pending: applications.filter(a => statusOf(a) === "pending").length,
    approved: applications.filter(a => statusOf(a) === "approved").length,
    rejected: applications.filter(a => statusOf(a) === "rejected").length,
    withDocs: applications.filter(a => docsOf(a).length > 0).length
  }),[applications]);

  const list = useMemo(()=>{
    const q = search.trim().toLowerCase();
    return applications
      .filter(a => statusOf(a) === tab)
      .filter(a => !q || [a.name, a.email, a.shopName, a.country].some(v => String(v || "").toLowerCase().includes(q)))
      // Applicants who actually uploaded documents come first
      .sort((x, y) => docsOf(y).length - docsOf(x).length);
  },[applications, tab, search]);

  const tabs: { id: Tab; label: string; n: number }[] = [
    { id: "pending",  label: "Pending review", n: counts.pending },
    { id: "approved", label: "Approved",       n: counts.approved },
    { id: "rejected", label: "Rejected",       n: counts.rejected }
  ];

  return (
    <AdminShell>
    <div className="ov3d kyc-v">

      <div className="topbar">
        <div>
          <span className="eyebrow">Compliance</span>
          <h1>KYC Verification</h1>
        </div>
        <span className="admin-chip live-chip"><i/> {counts.pending} awaiting review</span>
      </div>

      {/* ---------- Hero ---------- */}
      <section className="ovx-hero kv-hero tilt-3d" data-tilt="2">
        <div className="ovx-hero-copy">
          <span className="ovx-hero-badge kv-badge" aria-hidden="true">🪪</span>
          <span className="eyebrow">Identity check</span>
          <h2>Review seller documents</h2>
          <p>Check each ID and selfie carefully, then approve or reject. Approved sellers get their account activated.</p>
          <div className="ovx-hero-actions">
            <button type="button" className="ovx-btn primary" onClick={()=>setTab("pending")}>⏳ Review pending ({counts.pending})</button>
          </div>
        </div>

        {/* animated ID card being scanned */}
        <div className="kv-scan" aria-hidden="true">
          <div className="kv-idcard">
            <span className="kv-photo"/>
            <span className="kv-lines"><i/><i/><i/></span>
            <span className="kv-chip"/>
            <span className="kv-beam"/>
          </div>
          <span className="kv-tick">✓</span>
        </div>

        <div className="ovx-hero-stats">
          <div><small>Pending</small><strong>{counts.pending}</strong></div>
          <div><small>Approved</small><strong>{counts.approved}</strong></div>
          <div><small>Rejected</small><strong>{counts.rejected}</strong></div>
        </div>
      </section>

      {/* ---------- KPI tiles ---------- */}
      <div className="ovx-stats">
        <div className="dx-stat ovx-stat kv-tile tilt-3d"><span className="dx-ico kv-i1">⏳</span><span className="dx-label">Pending</span><strong>{counts.pending}</strong><small>Waiting for review</small></div>
        <div className="dx-stat ovx-stat kv-tile tilt-3d"><span className="dx-ico kv-i2">✅</span><span className="dx-label">Approved</span><strong>{counts.approved}</strong><small>Verified sellers</small></div>
        <div className="dx-stat ovx-stat kv-tile tilt-3d"><span className="dx-ico kv-i3">✕</span><span className="dx-label">Rejected</span><strong>{counts.rejected}</strong><small>Must resubmit</small></div>
        <div className="dx-stat ovx-stat kv-tile tilt-3d"><span className="dx-ico kv-i4">📄</span><span className="dx-label">With documents</span><strong>{counts.withDocs}</strong><small>Uploaded ID files</small></div>
      </div>

      {message && <div className={`kv-msg ${message.ok ? "ok" : "err"}`}>{message.ok ? "✓" : "!"} {message.text}</div>}

      {/* ---------- Applications ---------- */}
      <section className="ovx-card kv-panel">
        <div className="ovx-card-head ux-head">
          <div>
            <span className="eyebrow">{list.length} shown</span>
            <h2>Applications</h2>
          </div>
          <label className="ux-search">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, email, shop…"/>
          </label>
        </div>

        <div className="kv-tabs" role="tablist" aria-label="KYC status">
          {tabs.map(t=>(
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`kv-tab ${t.id} ${tab === t.id ? "on" : ""}`}
              onClick={()=>setTab(t.id)}
            >
              {t.label}<em>{t.n}</em>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="ovx-empty">Loading applications…</div>
        ) : list.length === 0 ? (
          <div className="kv-empty">
            <span>{tab === "pending" ? "🎉" : tab === "approved" ? "🗂️" : "📭"}</span>
            <b>{tab === "pending" ? "All caught up" : `No ${tab} applications`}</b>
            <small>{tab === "pending" ? "There are no KYC applications waiting for review." : "Nothing to show in this tab yet."}</small>
          </div>
        ) : (
          <div className="kv-list">
            {list.map(a=>{
              const docs = docsOf(a);
              const st = statusOf(a);
              return (
                <article className={`kv-app ${st}`} key={a.id}>
                  <header className="kv-app-head">
                    <span className={`kv-avatar ${a.profileImage ? "has-photo" : ""}`}>
                      {a.profileImage ? <img src={a.profileImage} alt=""/> : (a.name?.[0] || "U")}
                    </span>
                    <div className="kv-who">
                      <b>{a.name}</b>
                      <small>{a.email}</small>
                      <div className="kv-tags">
                        <span>🏪 {a.shopName || "No shop name"}</span>
                        {a.country && <span>🌍 {a.country}</span>}
                        {a.createdAt && <span>📅 Joined {new Date(a.createdAt).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <span className={`kv-status ${st}`}>{st === "pending" ? "Pending review" : st === "approved" ? "Approved" : "Rejected"}</span>
                  </header>

                  {docs.length === 0 ? (
                    <div className="kv-nodocs">📄 No documents uploaded yet</div>
                  ) : (
                    <div className="kv-docs">
                      {docs.map((d, i)=>(
                        <button
                          type="button"
                          key={i}
                          className="kv-doc"
                          onClick={()=>setViewer({ docs, index: i, name: a.name })}
                          aria-label={`View ${d.label}`}
                        >
                          <img src={d.src} alt={d.label} loading="lazy"/>
                          <span>{d.label}</span>
                          <i aria-hidden="true">🔍</i>
                        </button>
                      ))}
                    </div>
                  )}

                  {st === "pending" && (
                    <div className="kv-actions">
                      <button type="button" className="kv-btn approve" disabled={busy === a.id} onClick={()=>updateKyc(a, "approve")}>
                        {busy === a.id ? "Working…" : "✓ Approve"}
                      </button>
                      <button type="button" className="kv-btn reject" disabled={busy === a.id} onClick={()=>updateKyc(a, "reject")}>
                        ✕ Reject
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ---------- Document viewer ---------- */}
      {viewer && (
        <div className="kv-viewer" role="dialog" aria-modal="true" aria-label="Document viewer" onClick={()=>setViewer(null)}>
          <div className="kv-viewer-top" onClick={e=>e.stopPropagation()}>
            <div>
              <b>{viewer.name}</b>
              <small>{viewer.docs[viewer.index].label} · {viewer.index + 1} of {viewer.docs.length}</small>
            </div>
            <button type="button" onClick={()=>setViewer(null)} aria-label="Close">✕</button>
          </div>
          <img
            src={viewer.docs[viewer.index].src}
            alt={viewer.docs[viewer.index].label}
            onClick={e=>e.stopPropagation()}
          />
          {viewer.docs.length > 1 && (
            <>
              <button type="button" className="kv-nav prev" aria-label="Previous document"
                onClick={e=>{ e.stopPropagation(); setViewer(v => v && { ...v, index: (v.index - 1 + v.docs.length) % v.docs.length }); }}>‹</button>
              <button type="button" className="kv-nav next" aria-label="Next document"
                onClick={e=>{ e.stopPropagation(); setViewer(v => v && { ...v, index: (v.index + 1) % v.docs.length }); }}>›</button>
              <div className="kv-thumbs" onClick={e=>e.stopPropagation()}>
                {viewer.docs.map((d, i)=>(
                  <button type="button" key={i} className={i === viewer.index ? "on" : ""} onClick={()=>setViewer(v => v && { ...v, index: i })} aria-label={d.label}>
                    <img src={d.src} alt=""/>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

    </div>
    </AdminShell>
  );
}
