"use client";
import {FormEvent,useEffect,useRef,useState} from "react";
import {UserShell} from "../components";
import {apiFetch,apiMe} from "../lib";
import {countryCodes,getCountry} from "../countries";

export default function Profile(){
const[name,setName]=useState(""); const[shopName,setShopName]=useState(""); const[email,setEmail]=useState(""); const[phone,setPhone]=useState(""); const[countryCode,setCountryCode]=useState("+1"); const[country,setCountry]=useState("United States");
 const[status,setStatus]=useState("Active"); const[image,setImage]=useState(""); const[saved,setSaved]=useState(false); const[error,setError]=useState("");
 const fileRef=useRef<HTMLInputElement>(null);
 useEffect(()=>{apiMe().then(d=>{setName(d.user.name||"");setShopName(d.user.shopName||"");setEmail(d.user.email||"");setPhone(d.user.phone||"");setCountryCode(d.user.countryCode||"+1");setCountry(d.user.country||"United States");setStatus(d.user.status||"Active");setImage(d.user.profileImage||"")}).catch(()=>{})},[]);
 const save=async(e:FormEvent)=>{e.preventDefault();setSaved(false);setError("");const r=await apiFetch("/api/profile",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({
name,
shopName,
profileImage:image
})});const d=await r.json();if(!r.ok){setError(d.error||"Could not save");return}setSaved(true);setTimeout(()=>setSaved(false),1800)};
 const chooseImage=(e:React.ChangeEvent<HTMLInputElement>)=>{const f=e.target.files?.[0];if(!f)return;if(!f.type.startsWith("image/")){setError("Please select an image file.");return}if(f.size>900000){setError("Please choose an image smaller than 900 KB.");return}const r=new FileReader();r.onload=()=>setImage(String(r.result||""));r.readAsDataURL(f)};
 const selected=getCountry(country);
 return <UserShell><section className="panel form-panel"><div className="profile-banner"><div className="profile-avatar big" style={image?{backgroundImage:`url(${image})`,backgroundSize:"cover",backgroundPosition:"center",color:"transparent"}:{}}>{!image&&(name[0]||"A")}</div><div><h2>Profile</h2><p>Manage your personal account details.</p><input ref={fileRef} type="file" accept="image/*" onChange={chooseImage} style={{display:"none"}}/><button type="button" className="btn btn-small btn-ghost" onClick={()=>fileRef.current?.click()}>{image?"Change profile picture":"Add profile picture"}</button></div></div>
 <form className="form-grid" onSubmit={save}>
  {error&&<div className="form-error" style={{gridColumn:"1/-1"}}>{error}</div>}
  <label>Full name<input value={name} onChange={e=>setName(e.target.value)} /></label>
  <label>Shop name<input value={shopName} onChange={e=>setShopName(e.target.value)} placeholder="Enter your store/shop name" /></label>
  <label>Email<input type="email" value={email} readOnly /></label>
  <label>Phone number<div style={{display:"flex",gap:8}}><select value={countryCode} disabled style={{width:110}}><option value={countryCode}>{countryCode}</option></select><input value={phone} readOnly placeholder="Phone number" style={{flex:1}} maxLength={selected?.digits||10}/></div></label>
  <label>Country<select value={country} disabled>{countryCodes.map(c=><option key={c.country}>{c.country}</option>)}</select></label>
  <label>Account status<input value={status} readOnly /></label>
  <div className="save-row" style={{gridColumn:"1/-1"}}><span>{saved?"✓ Changes saved":"Country, country code and phone number are fixed after registration."}</span><button className="btn" type="submit">Save changes</button></div>
 </form></section></UserShell>
}
