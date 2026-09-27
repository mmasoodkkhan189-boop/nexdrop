"use client";
import {FormEvent,useEffect,useRef,useState} from "react";
import {UserShell,ProfileAvatar} from "../components";
import {apiFetch,apiMe} from "../lib";
import {getCountry} from "../countries";

type Snapshot = { name:string; shopName:string; image:string };

const LockIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>
  </svg>
);

const CameraIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
  </svg>
);

function formatDate(d?:string){
  if(!d) return "—";
  return new Date(d).toLocaleDateString([], { day:"numeric", month:"short", year:"numeric" });
}

export default function Profile(){
  const[name,setName]=useState("");
  const[shopName,setShopName]=useState("");
  const[email,setEmail]=useState("");
  const[username,setUsername]=useState("");
  const[phone,setPhone]=useState("");
  const[countryCode,setCountryCode]=useState("+1");
  const[country,setCountry]=useState("United States");
  const[status,setStatus]=useState("Active");
  const[kycStatus,setKycStatus]=useState("Pending");
  const[plan,setPlan]=useState("");
  const[productLimit,setProductLimit]=useState(0);
  const[storeCount,setStoreCount]=useState<number|null>(null);
  const[createdAt,setCreatedAt]=useState("");
  const[image,setImage]=useState("");
  const[original,setOriginal]=useState<Snapshot>({name:"",shopName:"",image:""});
  const[loaded,setLoaded]=useState(false);
  const[saving,setSaving]=useState(false);
  const[toast,setToast]=useState("");
  const[error,setError]=useState("");
  const fileRef=useRef<HTMLInputElement>(null);

  useEffect(()=>{
    apiMe().then(d=>{
      const u=d.user;
      setName(u.name||"");
      setShopName(u.shopName||"");
      setEmail(u.email||"");
      setUsername(u.username||"");
      setPhone(u.phone||"");
      setCountryCode(u.countryCode||"+1");
      setCountry(u.country||"United States");
      setStatus(u.status||"Active");
      setKycStatus(u.kycStatus||"Pending");
      setPlan(u.currentPackageName||u.currentPackage||"");
      setProductLimit(Number(u.productLimit||0));
      setCreatedAt(u.createdAt||"");
      setImage(u.profileImage||"");
      setOriginal({name:u.name||"",shopName:u.shopName||"",image:u.profileImage||""});
      setLoaded(true);
    }).catch(()=>{});
    apiFetch("/api/seller-products",{cache:"no-store"})
      .then(r=>r.ok?r.json():null)
      .then(d=>{ if(d&&Array.isArray(d.products)) setStoreCount(d.products.length); })
      .catch(()=>{});
  },[]);

  const dirty = loaded && (name!==original.name || shopName!==original.shopName || image!==original.image);

  const save=async(e?:FormEvent)=>{
    e?.preventDefault();
    if(!name.trim()){ setError("Full name can't be empty."); return; }
    setSaving(true); setError("");
    try{
      const r=await apiFetch("/api/profile",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,shopName,profileImage:image})});
      const d=await r.json();
      if(!r.ok){ setError(d.error||"Could not save"); return; }
      setOriginal({name,shopName,image});
      setToast("Profile updated");
      setTimeout(()=>setToast(""),2200);
    }finally{
      setSaving(false);
    }
  };

  const discard=()=>{
    setName(original.name);
    setShopName(original.shopName);
    setImage(original.image);
    setError("");
    if(fileRef.current) fileRef.current.value="";
  };

  const chooseImage=(e:React.ChangeEvent<HTMLInputElement>)=>{
    const f=e.target.files?.[0];
    if(!f) return;
    if(!f.type.startsWith("image/")){ setError("Please select an image file."); return; }
    if(f.size>900000){ setError("Please choose an image smaller than 900 KB."); return; }
    setError("");
    const r=new FileReader();
    r.onload=()=>setImage(String(r.result||""));
    r.readAsDataURL(f);
  };

  const selected=getCountry(country);
  const kyc=kycStatus.toLowerCase();
  const kycTone = kyc==="approved"||kyc==="verified" ? "ok" : kyc==="rejected" ? "bad" : "wait";

  return (
    <UserShell>
      <div className="pf">

        {/* ---------- Header card ---------- */}
        <section className="pf-hero">
          <div className="pf-cover">
            <div className="pf-cover-deco" aria-hidden="true">
              <span className="d1">📦</span><span className="d2">🚚</span><span className="d3">🛒</span><span className="d4">📦</span>
            </div>
            <div className="pf-cover-left">
              <span className="pf-cover-kicker">Nexdrop Seller</span>
              <b className="pf-cover-shop">🏪 {shopName || "Your store"}</b>
            </div>
            <div className="pf-cover-stats">
              <div><small>Member since</small><b>{formatDate(createdAt)}</b></div>
              <div><small>Plan</small><b>{plan || "No plan"}</b></div>
              <div><small>Store</small><b>{storeCount === null ? "—" : `${storeCount}${productLimit ? ` / ${productLimit}` : ""} products`}</b></div>
            </div>
          </div>
          <div className="pf-hero-body">
            <div className="pf-avatar-wrap">
              <ProfileAvatar image={image} name={name||"A"} className="pf-avatar"/>
              <button type="button" className="pf-camera" onClick={()=>fileRef.current?.click()} aria-label="Change profile picture" title="Change profile picture">
                <CameraIcon/>
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={chooseImage} hidden/>
            </div>

            <div className="pf-identity">
              <h1>{name||"Your profile"}</h1>
              <p>{email}{username && <> · @{username}</>}</p>
              <div className="pf-chips">
                <span className={`pf-chip ${status==="Active"?"ok":"bad"}`}><i/>{status} account</span>
                <span className={`pf-chip ${kycTone}`}><i/>KYC {kycStatus}</span>
                {plan && <span className="pf-chip plan">★ {plan} plan</span>}
              </div>
            </div>

            <div className="pf-hero-actions">
              <button type="button" className="pf-btn ghost" onClick={()=>fileRef.current?.click()}>
                <CameraIcon/> {image?"Change photo":"Add photo"}
              </button>
              {image && (
                <button type="button" className="pf-btn text" onClick={()=>setImage("")}>Remove</button>
              )}
            </div>
          </div>
        </section>

        {error && <div className="pf-error">{error}</div>}

        <div className="pf-grid">

          {/* ---------- Editable details ---------- */}
          <form className="pf-card" onSubmit={save} id="profile-form">
            <div className="pf-card-head">
              <div>
                <span className="eyebrow">Personal information</span>
                <h2>Your details</h2>
              </div>
              <span className="pf-hint">These appear on your store and in support chats.</span>
            </div>

            <div className="pf-fields">
              <label className="pf-field">
                <span>Full name</span>
                <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name"/>
              </label>
              <label className="pf-field">
                <span>Shop name</span>
                <input value={shopName} onChange={e=>setShopName(e.target.value)} placeholder="Enter your store/shop name"/>
              </label>
            </div>

            <div className="pf-divider"><span>Contact details</span></div>

            <div className="pf-fields">
              <label className="pf-field locked">
                <span>Email <LockIcon/></span>
                <input type="email" value={email} readOnly/>
              </label>
              <label className="pf-field locked">
                <span>Phone number <LockIcon/></span>
                <div className="pf-phone">
                  <em>{countryCode}</em>
                  <input value={phone} readOnly placeholder="Phone number" maxLength={selected?.digits||10}/>
                </div>
              </label>
              <label className="pf-field locked">
                <span>Country <LockIcon/></span>
                <input value={country} readOnly/>
              </label>
              <label className="pf-field locked">
                <span>Account status <LockIcon/></span>
                <input value={status} readOnly/>
              </label>
            </div>

            <p className="pf-note">
              <LockIcon/> Email, country, country code and phone number are fixed after registration. Contact support if they need to change.
            </p>
          </form>

          {/* ---------- Overview ---------- */}
          <aside className="pf-side">
            <div className="pf-card">
              <span className="eyebrow">Account overview</span>
              <div className="pf-rows">
                <div><span>Member since</span><b>{formatDate(createdAt)}</b></div>
                <div><span>Account status</span><b className={`pf-tag ${status==="Active"?"ok":"bad"}`}>{status}</b></div>
                <div><span>KYC verification</span><b className={`pf-tag ${kycTone}`}>{kycStatus}</b></div>
                <div><span>Current plan</span><b>{plan||"No active plan"}</b></div>
                <div><span>Country</span><b>{country}</b></div>
              </div>
            </div>

            <div className="pf-card pf-tip">
              <span className="pf-tip-icon">🛡️</span>
              <div>
                <b>Keep your account safe</b>
                <p>Never share your password. Nexdrop support will never ask for it in chat.</p>
              </div>
            </div>
          </aside>
        </div>

        {/* ---------- Save bar (only when something changed) ---------- */}
        <div className={`pf-savebar ${dirty?"show":""}`} role="status">
          <span><i/> You have unsaved changes</span>
          <div>
            <button type="button" className="pf-btn text" onClick={discard} disabled={saving}>Discard</button>
            <button type="submit" form="profile-form" className="pf-btn primary" disabled={saving}>
              {saving?"Saving…":"Save changes"}
            </button>
          </div>
        </div>

        {toast && <div className="pf-toast">✓ {toast}</div>}
      </div>
    </UserShell>
  );
}
