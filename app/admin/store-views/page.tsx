"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { apiFetch, useRealtimeStream } from "../../lib";
import { AdminShell } from "../../components";


export default function AdminStoreViews(){

  const [users,setUsers] = useState<any[]>([]);
  const [loading,setLoading] = useState(true);

  const [svUser,setSvUser] = useState("");
  const [svMin,setSvMin] = useState("");
  const [svMax,setSvMax] = useState("");
  const [svMsg,setSvMsg] = useState("");
  const [svOk,setSvOk] = useState(false);
  const [svLoading,setSvLoading] = useState(false);

  const [customerOpen,setCustomerOpen] = useState(false);
  const [customerSearch,setCustomerSearch] = useState("");
  const customerBoxRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{
    const onDocClick = (e:MouseEvent)=>{
      if(customerBoxRef.current && !customerBoxRef.current.contains(e.target as Node)){
        setCustomerOpen(false);
        setCustomerSearch("");
      }
    };
    document.addEventListener("mousedown",onDocClick);
    return ()=>document.removeEventListener("mousedown",onDocClick);
  },[]);

  const load = useCallback(async()=>{
    try{
      const r = await apiFetch("/api/admin/users",{ cache:"no-store" });
      const d = await r.json();
      setUsers(d.users||[]);
    }catch{} finally{
      setLoading(false);
    }
  },[]);

  useEffect(()=>{
    load();
  },[load]);

  useRealtimeStream(()=>{
    load();
  });

  const customers = useMemo(
    ()=> users.filter((u:any)=>u.role!=="admin"),
    [users]
  );

  const activeCount = useMemo(
    ()=> customers.filter((u:any)=>Number(u.storeViewsMax||0)>0).length,
    [customers]
  );

  const avgMax = useMemo(()=>{
    const withRange = customers.filter((u:any)=>Number(u.storeViewsMax||0)>0);
    if(!withRange.length) return 0;
    const total = withRange.reduce((sum:number,u:any)=>sum+Number(u.storeViewsMax||0),0);
    return Math.round(total/withRange.length);
  },[customers]);

  const selectedUser = useMemo(
    ()=> customers.find((u:any)=>u.id===svUser),
    [customers,svUser]
  );

  const filteredCustomers = useMemo(()=>{
    const q = customerSearch.toLowerCase();
    if(!q) return customers;
    return customers.filter((u:any)=>
      (u.name||"").toLowerCase().includes(q) || (u.email||"").toLowerCase().includes(q)
    );
  },[customers,customerSearch]);

  const pickCustomer = (u:any)=>{
    setSvUser(u.id);
    setSvMin(String(u.storeViewsMin||""));
    setSvMax(String(u.storeViewsMax||""));
    setSvMsg("");
    setCustomerOpen(false);
    setCustomerSearch("");
  };

  const editUser = (u:any)=>{
    setSvUser(u.id);
    setSvMin(String(u.storeViewsMin||""));
    setSvMax(String(u.storeViewsMax||""));
    setSvMsg("");
    if(typeof window!=="undefined"){
      document.getElementById("store-views-form")?.scrollIntoView({behavior:"smooth",block:"start"});
    }
  };

  const setStoreViews = async()=>{
    setSvMsg("");
    setSvLoading(true);
    try{
      const r = await apiFetch("/api/admin/store-views",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({userId:svUser,min:Number(svMin)||0,max:Number(svMax)||0})
      });
      const d = await r.json();
      if(r.ok){
        setSvMsg("Store views range updated!");
        setSvOk(true);
        load();
      }
      else{setSvMsg(d.error||"Failed.");setSvOk(false);}
    }catch{setSvMsg("Error.");setSvOk(false);}
    finally{setSvLoading(false);}
  };

  if(loading){
    return <div className="loading-screen">
      Loading Store Views...
    </div>
  }

  return (
    <AdminShell>
    <main className="admin-page">

      <div className="topbar">
        <div>
          <span className="eyebrow">Store Activity</span>
          <h1>Store Views</h1>
        </div>
      </div>

      <div className="stat-grid admin-stats">

        <div className="stat">
          <span>Total Customers</span>
          <strong>{customers.length}</strong>
          <small>Registered accounts</small>
        </div>

        <div className="stat">
          <span>Live View Ranges</span>
          <strong>{activeCount}</strong>
          <small>Customers with views enabled</small>
        </div>

        <div className="stat">
          <span>Average Max Views</span>
          <strong>{avgMax.toLocaleString()}</strong>
          <small>Across active ranges</small>
        </div>

      </div>

      <section className="panel" id="store-views-form" style={{position:"relative",zIndex:customerOpen?5:1}}>
        <div className="panel-head">
          <div>
            <span className="eyebrow">Store Activity</span>
            <h2>Set Views Range</h2>
          </div>
        </div>

        <p style={{color:"var(--muted)",marginBottom:"20px",fontSize:"13px",lineHeight:1.6}}>
          Set a live views range for any customer. The dashboard will randomly fluctuate between min and max to show live activity. Set both to 0 to hide views from a customer.
        </p>

        <div className="admin-form form-grid" style={{margin:0}}>
          <div>
            <label>Select Customer</label>
            <div className="custom-select" ref={customerBoxRef}>
              <button
                type="button"
                className={`custom-select-trigger ${customerOpen ? "open" : ""}`}
                onClick={()=>setCustomerOpen(v=>!v)}
              >
                <span>{selectedUser ? `${selectedUser.name} (${selectedUser.email})` : "— choose customer —"}</span>
                <svg
                  className={`chevron-icon ${customerOpen ? "rotate" : ""}`}
                  width="12"
                  height="12"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {customerOpen && (
                <div className="custom-select-menu">
                  <input
                    autoFocus
                    className="custom-select-search"
                    placeholder="Search customer…"
                    value={customerSearch}
                    onChange={e=>setCustomerSearch(e.target.value)}
                  />
                  <div className="custom-select-list">
                    {filteredCustomers.length === 0 ? (
                      <div className="custom-select-empty">No matches found.</div>
                    ) : (
                      filteredCustomers.map((u:any)=>(
                        <button
                          type="button"
                          key={u.id}
                          className={`custom-select-option ${u.id === svUser ? "selected" : ""}`}
                          onClick={()=>pickCustomer(u)}
                        >
                          {u.name} ({u.email})
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{display:"flex",gap:"14px",flexWrap:"wrap"}}>
            <div style={{flex:"1 1 140px",minWidth:"140px"}}>
              <label>Min Views</label>
              <input
                type="number" min="0" placeholder="e.g. 800"
                value={svMin} onChange={e=>setSvMin(e.target.value)}
              />
            </div>
            <div style={{flex:"1 1 140px",minWidth:"140px"}}>
              <label>Max Views</label>
              <input
                type="number" min="0" placeholder="e.g. 3500"
                value={svMax} onChange={e=>setSvMax(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div style={{marginTop:"18px",display:"flex",alignItems:"center",gap:"16px",flexWrap:"wrap"}}>
          <button
            type="button"
            disabled={svLoading||!svUser}
            onClick={setStoreViews}
            className="btn"
            style={{opacity:svLoading||!svUser?0.6:1,cursor:svLoading||!svUser?"not-allowed":"pointer"}}
          >
            {svLoading?"Saving…":"Save Views Range"}
          </button>

          {svMsg && (
            <span className={svOk?"success-box":"form-error"} style={{margin:0,padding:"9px 14px"}}>
              {svMsg}
            </span>
          )}
        </div>

        {selectedUser && (
          <div className="balance-chip" style={{marginTop:"18px",display:"inline-flex",gap:"6px"}}>
            Current range for <b>{selectedUser.name}</b>:&nbsp;
            <b>{Number(selectedUser.storeViewsMin||0).toLocaleString()} – {Number(selectedUser.storeViewsMax||0).toLocaleString()}</b>
            &nbsp;views
            {Number(selectedUser.storeViewsMin||0)===0 && Number(selectedUser.storeViewsMax||0)===0 && (
              <span style={{color:"var(--muted)"}}>&nbsp;(hidden)</span>
            )}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">All Customers</span>
            <h2>Views by Customer</h2>
          </div>
          <strong>{customers.length} Customers</strong>
        </div>

        {customers.length === 0 ? (
          <div className="empty-state">
            No customers yet.
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Min Views</th>
                  <th>Max Views</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((u:any)=>{
                  const cMin = Number(u.storeViewsMin||0);
                  const cMax = Number(u.storeViewsMax||0);
                  const isActive = cMax>0;
                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="user-cell">
                          <span className="avatar">{u.name?.[0]||"U"}</span>
                          <div>
                            <b>{u.name}</b>
                            <small>{u.email}</small>
                          </div>
                        </div>
                      </td>
                      <td>{cMin.toLocaleString()}</td>
                      <td>{cMax.toLocaleString()}</td>
                      <td>
                        <span className={`status ${isActive?"active":"suspended"}`}>
                          {isActive?"Live":"Hidden"}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="table-btn"
                          onClick={()=>editUser(u)}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

    </main>
    </AdminShell>
  );
}
