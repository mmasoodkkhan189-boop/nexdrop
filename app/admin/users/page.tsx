"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { AdminShell } from "../../components";
import { apiFetch, useRealtimeStream } from "../../lib";
import { useTilt } from "../useTilt";

type Filter = "all" | "active" | "suspended" | "kyc-pending" | "admins";

const kycOf = (u:any) => String(u.kycStatus || "pending").toLowerCase();

export default function Users() {

  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    apiFetch("/api/admin/users", { cache: "no-store" })
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setUsers(d.users || []);
      })
      .catch(e => setError(e.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeStream(() => {
    load();
  });

  useTilt();

  const toggle = async (u:any) => {
    const status = u.status === "Active" ? "Suspended" : "Active";
    setBusy(u.id);
    const r = await apiFetch(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    setBusy(null);
    if (r.ok) {
      load();
    } else {
      const d = await r.json();
      setError(d.error || "Could not update user");
    }
  };

  const remove = async (u:any) => {
    if (!confirm(`Delete ${u.name}? This removes the customer account.`)) return;
    setBusy(u.id);
    const r = await apiFetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
    setBusy(null);
    if (r.ok) {
      load();
    } else {
      const d = await r.json();
      setError(d.error || "Could not delete user");
    }
  };

  const customers = users.filter(u => u.role !== "admin");
  const counts = {
    all: users.length,
    active: customers.filter(u => u.status === "Active").length,
    suspended: customers.filter(u => u.status === "Suspended").length,
    kycPending: customers.filter(u => kycOf(u) === "pending").length,
    kycApproved: customers.filter(u => kycOf(u) === "approved").length,
    admins: users.filter(u => u.role === "admin").length
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users
      .filter(u => {
        if (filter === "active") return u.role !== "admin" && u.status === "Active";
        if (filter === "suspended") return u.role !== "admin" && u.status === "Suspended";
        if (filter === "kyc-pending") return u.role !== "admin" && kycOf(u) === "pending";
        if (filter === "admins") return u.role === "admin";
        return true;
      })
      .filter(u => !q || [u.name, u.email, u.username, u.shopName, u.country].some(v => String(v || "").toLowerCase().includes(q)))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [users, filter, search]);

  const chips: { id: Filter; label: string; n: number; dot?: string }[] = [
    { id: "all",         label: "All",         n: counts.all },
    { id: "active",      label: "Active",      n: counts.active,     dot: "#10B981" },
    { id: "suspended",   label: "Suspended",   n: counts.suspended,  dot: "#E11D48" },
    { id: "kyc-pending", label: "KYC pending", n: counts.kycPending, dot: "#F59E0B" },
    { id: "admins",      label: "Admins",      n: counts.admins,     dot: "#0F766E" }
  ];

  return (
    <AdminShell>
    <div className="ov3d">

      <div className="topbar">
        <div>
          <span className="eyebrow">Management</span>
          <h1>Users</h1>
        </div>
        <span className="admin-chip live-chip"><i/> Live</span>
      </div>

      {/* ---------- Hero ---------- */}
      <section className="ovx-hero ux-hero tilt-3d" data-tilt="2">
        <div className="ovx-hero-copy">
          <span className="ovx-hero-badge" aria-hidden="true">👥</span>
          <span className="eyebrow">Customer accounts</span>
          <h2>Everyone on your platform</h2>
          <p>Search, review and manage seller accounts. Open any profile for the full details.</p>
        </div>
        <div className="ux-hero-orbit" aria-hidden="true">
          {customers.slice(0, 5).map((u, i) => (
            <span key={u.id} className={`ux-orbit-av a${i + 1} ${u.profileImage ? "has-photo" : ""}`}>
              {u.profileImage ? <img src={u.profileImage} alt=""/> : (u.name?.[0] || "U")}
            </span>
          ))}
          <span className="ux-orbit-core">{customers.length}</span>
        </div>
        <div className="ovx-hero-stats">
          <div><small>Customers</small><strong>{customers.length}</strong></div>
          <div><small>Active</small><strong>{counts.active}</strong></div>
          <div><small>KYC approved</small><strong>{counts.kycApproved}</strong></div>
        </div>
      </section>

      {/* ---------- KPI tiles ---------- */}
      <div className="ovx-stats">
        <div className="dx-stat ovx-stat tilt-3d"><span className="dx-ico c1">👥</span><span className="dx-label">Customers</span><strong>{customers.length}</strong><small>Registered sellers</small></div>
        <div className="dx-stat ovx-stat tilt-3d"><span className="dx-ico c3">🟢</span><span className="dx-label">Active</span><strong>{counts.active}</strong><small>Can sign in</small></div>
        <div className="dx-stat ovx-stat tilt-3d"><span className="dx-ico c5">🪪</span><span className="dx-label">KYC Pending</span><strong>{counts.kycPending}</strong><small>Awaiting review</small></div>
        <div className="dx-stat ovx-stat tilt-3d"><span className="dx-ico c6">⛔</span><span className="dx-label">Suspended</span><strong>{counts.suspended}</strong><small>Blocked accounts</small></div>
      </div>

      {error && <div className="form-error">{error}</div>}

      {/* ---------- Directory ---------- */}
      <section className="ovx-card">
        <div className="ovx-card-head ux-head">
          <div>
            <span className="eyebrow">{filtered.length} shown</span>
            <h2>Customer Directory</h2>
          </div>
          <label className="ux-search">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, shop, country…"/>
          </label>
        </div>

        <div className="ux-chips" role="tablist" aria-label="Filter users">
          {chips.map(c => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={filter === c.id}
              className={`ux-chip ${filter === c.id ? "on" : ""}`}
              onClick={() => setFilter(c.id)}
            >
              {c.dot && <i style={{ background: c.dot }}/>}
              {c.label}
              <em>{c.n}</em>
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="ovx-empty">No users match.</div>
        ) : (
          <div className="ux-grid">
            {filtered.map(u => {
              const isAdmin = u.role === "admin";
              const kyc = kycOf(u);
              const suspended = u.status === "Suspended";
              return (
                <article className={`ux-card tilt-3d ${suspended ? "is-suspended" : ""} ${isAdmin ? "is-admin" : ""}`} data-tilt="6" key={u.id}>
                  <div className="ux-cover" aria-hidden="true"/>

                  <div className="ux-top">
                    <span className={`ux-avatar ${u.profileImage ? "has-photo" : ""}`}>
                      {u.profileImage ? <img src={u.profileImage} alt={u.name || "Profile photo"}/> : (u.name?.[0] || "U")}
                      <i className={`ux-dot ${suspended ? "off" : "on"}`}/>
                    </span>
                    <span className={`ux-role ${isAdmin ? "admin" : ""}`}>{isAdmin ? "Admin" : "Customer"}</span>
                  </div>

                  <div className="ux-id">
                    <Link href={`/admin/users/${u.id}`} className="ux-name">{u.name}</Link>
                    <small>{u.email}</small>
                    {u.username && <small className="ux-handle">@{u.username}</small>}
                  </div>

                  <div className="ux-badges">
                    <span className={`ux-badge ${suspended ? "red" : "green"}`}>{u.status}</span>
                    {!isAdmin && <span className={`ux-badge ${kyc === "approved" ? "green" : kyc === "rejected" ? "red" : "amber"}`}>KYC {kyc}</span>}
                    {!isAdmin && (u.currentPackageName || u.currentPackage) && <span className="ux-badge teal">⭐ {u.currentPackageName || u.currentPackage}</span>}
                  </div>

                  <div className="ux-facts">
                    <div><span>🏪 Shop</span><b>{u.shopName || "—"}</b></div>
                    <div><span>🌍 Country</span><b>{u.country || "—"}</b></div>
                    <div><span>📞 Phone</span><b>{u.phone ? `${u.countryCode || ""} ${u.phone}` : "—"}</b></div>
                    <div><span>📅 Joined</span><b>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}</b></div>
                  </div>

                  {isAdmin ? (
                    <div className="ux-actions"><span className="ux-admin-note">🛡️ Administrator account</span></div>
                  ) : (
                    <div className="ux-actions">
                      <Link href={`/admin/users/${u.id}`} className="ux-btn primary">Manage</Link>
                      <button type="button" className={`ux-btn ${suspended ? "" : "warn"}`} onClick={() => toggle(u)} disabled={busy === u.id}>
                        {suspended ? "Activate" : "Suspend"}
                      </button>
                      <button type="button" className="ux-btn danger" onClick={() => remove(u)} disabled={busy === u.id} aria-label={`Delete ${u.name}`} title="Delete account">
                        🗑
                      </button>
                    </div>
                  )}
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
