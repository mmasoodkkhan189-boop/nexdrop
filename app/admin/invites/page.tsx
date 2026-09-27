"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { apiFetch, useRealtimeStream } from "../../lib";
import { AdminShell } from "../../components";
import { useTilt } from "../useTilt";

type Status = "available" | "used" | "revoked" | "expired";
type Tab = "all" | Status;

const DURATIONS = [1, 3, 7, 14, 30];

const linkFor = (token: string) =>
  typeof window === "undefined" ? "" : `${window.location.origin}/register?invite=${token}`;

function timeLeft(expiresAt: number){
  const ms = Number(expiresAt) - Date.now();
  if(ms <= 0) return "Expired";
  const h = Math.floor(ms / 3600000);
  if(h < 1) return `${Math.max(1, Math.floor(ms / 60000))} min left`;
  if(h < 48) return `${h} h left`;
  return `${Math.floor(h / 24)} days left`;
}

// Clipboard API needs a secure context; fall back to a hidden textarea
async function copyText(text: string){
  try{
    await navigator.clipboard.writeText(text);
    return true;
  }catch{
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  }
}

export default function AdminInvites(){

  const [invites,setInvites] = useState<any[]>([]);
  const [loading,setLoading] = useState(true);
  const [days,setDays] = useState(7);
  const [creating,setCreating] = useState(false);
  const [newInvite,setNewInvite] = useState<any>(null);
  const [error,setError] = useState("");
  const [copied,setCopied] = useState("");
  const [busy,setBusy] = useState("");
  const [tab,setTab] = useState<Tab>("all");
  const [search,setSearch] = useState("");

  const load = useCallback(()=>{
    apiFetch("/api/admin/invites",{ cache:"no-store" })
      .then(r=>r.json())
      .then(d=>setInvites(d.invites || []))
      .catch(()=>{})
      .finally(()=>setLoading(false));
  },[]);

  useEffect(()=>{ load(); },[load]);
  useRealtimeStream(()=>{ load(); });
  useTilt();

  const counts = useMemo(()=>({
    all: invites.length,
    available: invites.filter(i => i.status === "available").length,
    used: invites.filter(i => i.status === "used").length,
    revoked: invites.filter(i => i.status === "revoked").length,
    expired: invites.filter(i => i.status === "expired").length
  }),[invites]);

  const conversion = counts.all ? Math.round((counts.used / counts.all) * 100) : 0;

  const list = useMemo(()=>{
    const q = search.trim().toLowerCase();
    return invites
      .filter(i => tab === "all" || i.status === tab)
      .filter(i => !q || [i.token, i.usedByUser?.name, i.usedByUser?.email].some(v => String(v || "").toLowerCase().includes(q)));
  },[invites, tab, search]);

  const flashCopied = (key: string)=>{
    setCopied(key);
    setTimeout(()=>setCopied(c => c === key ? "" : c), 2000);
  };

  const createInvite = async()=>{
    setError("");
    setCreating(true);
    try{
      const r = await apiFetch("/api/admin/invites",{
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({ days })
      });
      const d = await r.json();
      if(!r.ok){ setError(d.error || "Invite creation failed"); return; }
      setNewInvite({ ...d.invite, days });
      load();
    }catch{
      setError("Invite creation failed");
    }finally{
      setCreating(false);
    }
  };

  const revokeInvite = async(token: string)=>{
    if(!window.confirm("Revoke this invite? The link will stop working.")) return;
    setBusy(token);
    try{
      const r = await apiFetch(`/api/admin/invites/${encodeURIComponent(token)}`,{ method:"DELETE" });
      if(!r.ok){
        const d = await r.json().catch(()=>({}));
        setError(d.error || "Could not revoke invite");
      }
      if(newInvite?.token === token) setNewInvite(null);
      load();
    }finally{
      setBusy("");
    }
  };

  const tabs: { id: Tab; label: string; n: number }[] = [
    { id: "all",       label: "All",       n: counts.all },
    { id: "available", label: "Available", n: counts.available },
    { id: "used",      label: "Used",      n: counts.used },
    { id: "expired",   label: "Expired",   n: counts.expired },
    { id: "revoked",   label: "Revoked",   n: counts.revoked }
  ];

  return (
    <AdminShell>
    <div className="ov3d inv-v">

      <div className="topbar">
        <div>
          <span className="eyebrow">Access Control</span>
          <h1>Customer Invitations</h1>
        </div>
        <span className="admin-chip live-chip"><i/> {counts.available} active links</span>
      </div>

      {/* ---------- Hero ---------- */}
      <section className="ovx-hero iv-hero">
        <div className="ovx-hero-copy">
          <span className="ovx-hero-badge iv-badge" aria-hidden="true">✉️</span>
          <span className="eyebrow">Invite-only sign up</span>
          <h2>Bring new customers in</h2>
          <p>Create a one-time registration link, share it, and see who joined with it.</p>
        </div>

        <div className="iv-art" aria-hidden="true">
          <span className="iv-env">
            <i className="iv-flap"/>
            <i className="iv-letter"><b/><b/><b/></i>
          </span>
          <span className="iv-plane">➤</span>
          <span className="iv-trail"/>
        </div>

        <div className="ovx-hero-stats">
          <div><small>Created</small><strong>{counts.all}</strong></div>
          <div><small>Joined</small><strong>{counts.used}</strong></div>
          <div><small>Conversion</small><strong>{conversion}%</strong></div>
        </div>
      </section>

      {/* ---------- KPI tiles ---------- */}
      <div className="ovx-stats">
        <div className="dx-stat ovx-stat iv-tile tilt-3d"><span className="dx-ico iv-i1">🔗</span><span className="dx-label">Available</span><strong>{counts.available}</strong><small>Ready to share</small></div>
        <div className="dx-stat ovx-stat iv-tile tilt-3d"><span className="dx-ico iv-i2">🎉</span><span className="dx-label">Used</span><strong>{counts.used}</strong><small>Customers joined</small></div>
        <div className="dx-stat ovx-stat iv-tile tilt-3d"><span className="dx-ico iv-i3">⌛</span><span className="dx-label">Expired</span><strong>{counts.expired}</strong><small>Never used in time</small></div>
        <div className="dx-stat ovx-stat iv-tile tilt-3d"><span className="dx-ico iv-i4">🚫</span><span className="dx-label">Revoked</span><strong>{counts.revoked}</strong><small>Turned off by admin</small></div>
      </div>

      {/* ---------- Create ---------- */}
      <section className="ovx-card iv-create">
        <div className="ovx-card-head">
          <div>
            <span className="eyebrow">Generate access</span>
            <h2>New invitation</h2>
          </div>
        </div>

        <div className="iv-create-row">
          <div>
            <span className="iv-label">Link valid for</span>
            <div className="iv-days" role="radiogroup" aria-label="Invite duration">
              {DURATIONS.map(d=>(
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={days === d}
                  className={days === d ? "on" : ""}
                  onClick={()=>setDays(d)}
                >
                  {d} {d === 1 ? "day" : "days"}
                </button>
              ))}
            </div>
          </div>
          <button type="button" className="iv-create-btn" onClick={createInvite} disabled={creating}>
            {creating ? "Creating…" : "✨ Create invite link"}
          </button>
        </div>

        {error && <div className="form-error" style={{ marginTop: 14 }}>{error}</div>}

        {newInvite && (
          <div className="iv-new">
            <div className="iv-new-top">
              <span className="iv-new-ico">🎟️</span>
              <div>
                <b>Invite ready</b>
                <small>One-time link · expires in {newInvite.days} {newInvite.days === 1 ? "day" : "days"}</small>
              </div>
              <button type="button" className="iv-x" onClick={()=>setNewInvite(null)} aria-label="Dismiss">✕</button>
            </div>
            <div className="iv-linkbox">
              <input value={newInvite.url} readOnly onFocus={e=>e.currentTarget.select()} aria-label="Invite link"/>
              <button
                type="button"
                className={`iv-copy ${copied === "new" ? "done" : ""}`}
                onClick={async()=>{ if(await copyText(newInvite.url)) flashCopied("new"); }}
              >
                {copied === "new" ? "✓ Copied" : "Copy link"}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ---------- History ---------- */}
      <section className="ovx-card">
        <div className="ovx-card-head ux-head">
          <div>
            <span className="eyebrow">{list.length} of {invites.length}</span>
            <h2>Invitation history</h2>
          </div>
          <label className="ux-search">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search token, name or email…"/>
          </label>
        </div>

        <div className="iv-tabs" role="tablist" aria-label="Invite status">
          {tabs.map(t=>(
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`iv-tab ${t.id} ${tab === t.id ? "on" : ""}`}
              onClick={()=>setTab(t.id)}
            >
              {t.label}<em>{t.n}</em>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="ovx-empty">Loading invitations…</div>
        ) : list.length === 0 ? (
          <div className="ovx-empty">{invites.length === 0 ? "No invites yet. Create your first link above." : "No invites match."}</div>
        ) : (
          <div className="iv-list">
            {list.map((i:any)=>{
              const st: Status = i.status;
              return (
                <article className={`iv-ticket ${st}`} key={i.id}>
                  <div className="iv-stub">
                    <span className="iv-stub-ico">{st === "available" ? "🔗" : st === "used" ? "✅" : st === "expired" ? "⌛" : "🚫"}</span>
                    <span className={`iv-status ${st}`}>{st}</span>
                  </div>

                  <div className="iv-main">
                    <code className="iv-token" title={i.token}>{i.token}</code>
                    <div className="iv-dates">
                      <span>🗓️ Created {i.createdAt ? new Date(i.createdAt).toLocaleDateString() : "—"}</span>
                      {st === "available" && <span className="iv-left">⏳ {timeLeft(i.expiresAt)}</span>}
                      {st === "expired" && <span>⌛ Expired {new Date(i.expiresAt).toLocaleDateString()}</span>}
                      {st === "used" && i.usedAt && <span>🎉 Used {new Date(i.usedAt).toLocaleDateString()}</span>}
                      {st === "revoked" && i.revokedAt && <span>🚫 Revoked {new Date(i.revokedAt).toLocaleDateString()}</span>}
                    </div>
                  </div>

                  <div className="iv-side">
                    {st === "used" && i.usedByUser ? (
                      <div className="iv-who">
                        <span className={`iv-avatar ${i.usedByUser.profileImage ? "has-photo" : ""}`}>
                          {i.usedByUser.profileImage ? <img src={i.usedByUser.profileImage} alt=""/> : (i.usedByUser.name?.[0] || "U")}
                        </span>
                        <div><b>{i.usedByUser.name}</b><small>{i.usedByUser.email}</small></div>
                      </div>
                    ) : st === "available" ? (
                      <div className="iv-actions">
                        <button
                          type="button"
                          className={`iv-copy ${copied === i.token ? "done" : ""}`}
                          onClick={async()=>{ if(await copyText(linkFor(i.token))) flashCopied(i.token); }}
                        >
                          {copied === i.token ? "✓ Copied" : "Copy link"}
                        </button>
                        <button type="button" className="iv-revoke" onClick={()=>revokeInvite(i.token)} disabled={busy === i.token}>
                          {busy === i.token ? "…" : "Revoke"}
                        </button>
                      </div>
                    ) : (
                      <span className="iv-dead">{st === "used" ? "Customer account deleted" : "Link no longer works"}</span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

    </div>
    </AdminShell>
  );
}
