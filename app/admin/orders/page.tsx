"use client";

import {useEffect,useState,useCallback} from "react";
import {AdminShell} from "../../components";
import {apiFetch,useRealtimeStream} from "../../lib";
import {orderStatusLabel, ALL_ORDER_STATUSES, ORDER_STATUS_CONFIG, getOrderStatusConfig} from "../../order-statuses";


export default function AdminOrders(){


const [users,setUsers]=useState<any[]>([]);
const [orders,setOrders]=useState<any[]>([]);
const [products,setProducts]=useState<any[]>([]);


const [selectedUser,setSelectedUser]=useState("");
const [selectedProduct,setSelectedProduct]=useState("");
const [customerSearch,setCustomerSearch]=useState("");
const [productSearch,setProductSearch]=useState("");
const [isBrowsingProducts, setIsBrowsingProducts] = useState(false);

const [amount,setAmount]=useState("");

const [statusSelection, setStatusSelection] = useState<Record<string, string>>({});
const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);
const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
const [queueFilter, setQueueFilter] = useState<string>("all");
const [queueSearch, setQueueSearch] = useState("");
// The status menu is position:fixed so the table's scroll box can't clip it.
const [menuPos, setMenuPos] = useState<{ top?: number; bottom?: number; left: number } | null>(null);

const [adjust,setAdjust]=useState("");
const [adjusting,setAdjusting]=useState(false);
const [message,setMessage]=useState("");

useEffect(() => {
  const handleOutsideClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target?.closest(".status-action-custom")) {
      setOpenDropdownId(null);
    }
    if (!target?.closest(".custom-product-picker-container")) {
      setIsBrowsingProducts(false);
    }
  };
  document.addEventListener("mousedown", handleOutsideClick);
  return () => document.removeEventListener("mousedown", handleOutsideClick);
}, []);

// A fixed menu would drift away from its row on scroll, so just close it.
useEffect(() => {
  if (!openDropdownId) return;
  const close = () => setOpenDropdownId(null);
  window.addEventListener("scroll", close, true);
  window.addEventListener("resize", close);
  return () => {
    window.removeEventListener("scroll", close, true);
    window.removeEventListener("resize", close);
  };
}, [openDropdownId]);

// Status/result messages fade out on their own
useEffect(() => {
  if (!message) return;
  const t = setTimeout(() => setMessage(""), 6000);
  return () => clearTimeout(t);
}, [message]);






const load = useCallback(async()=>{
  try {
    const r=await apiFetch("/api/admin/orders",{ cache:"no-store" });
    const d=await r.json();
    setUsers(d.users||[]);
    setOrders(d.orders||[]);
  } catch {}
}, []);


useEffect(()=>{
  load();
  apiFetch("/api/products")
    .then(r=>r.json())
    .then(d=>setProducts(d.products||[]))
    .catch(()=>{});
},[load]);

useRealtimeStream(()=>{
  load();
});






const pickProduct=(id:string)=>{


setSelectedProduct(id);


const p=products.find(
x=>String(x.id)===id
);


setAmount(
p ? String(p.price) : ""
);


};







const send=async()=>{

setMessage("");

let targetCustomerId = selectedUser;
if (!targetCustomerId && customerSearch.trim()) {
  const match = users.find(u =>
    u.role !== "admin" && (
      (u.email || "").toLowerCase() === customerSearch.trim().toLowerCase() ||
      (u.name || "").toLowerCase() === customerSearch.trim().toLowerCase() ||
      String(u.id).toLowerCase() === customerSearch.trim().toLowerCase()
    )
  );
  if (match) {
    targetCustomerId = match.id;
    setSelectedUser(match.id);
  } else {
    targetCustomerId = customerSearch.trim();
  }
}

if (!targetCustomerId) {
  setMessage("Please select or enter a valid customer first.");
  return;
}

if (!selectedProduct) {
  setMessage("Please select a product.");
  return;
}

const r=await apiFetch(
"/api/admin/orders",
{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

customerId:targetCustomerId,

productId:selectedProduct

})

}
);



const d=await r.json();



if(!r.ok){

setMessage(
d.error || "Could not create order"
);


return;

}



setMessage(
"Order sent successfully."
);

setSelectedProduct("");
setProductSearch("");
setAmount("");

load();


};








const updateStatus=async(
id:string,
status:string
)=>{


setMessage("");



const r=await apiFetch(

`/api/admin/orders/${id}`,

{

method:"PATCH",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({
status
})

}

);



const d=await r.json();



if(!r.ok){

setMessage(
d.error || "Could not update order"
);


return;

}



setMessage(
`Order status changed to ${orderStatusLabel(status)}`
);



load();


};







const withdrawOrder=async(o:any)=>{
  if(!window.confirm(`Withdraw "${o.productName}"? The customer will no longer see this order.`)) return;
  setMessage("");
  setUpdatingOrder(o.id);
  try{
    const r=await apiFetch(`/api/admin/orders/${o.id}`,{method:"DELETE"});
    const d=await r.json().catch(()=>({}));
    setMessage(r.ok ? `Order "${o.productName}" withdrawn.` : (d.error || "Could not withdraw order"));
    if(r.ok) load();
  }finally{
    setUpdatingOrder(null);
  }
};

const balanceAdjust=async(
mode:"add"|"deduct"
)=>{


if(!selectedUser||!adjust||adjusting)
return;

const num = Math.round(Number(adjust) * 100) / 100;
if (!Number.isFinite(num) || num <= 0) {
  setMessage("Please enter a valid positive amount.");
  return;
}

setAdjusting(true);
setMessage("");
setAdjust("");


try {
  const r=await apiFetch(
  "/api/admin/balance",
  {
  method:"PATCH",
  headers:{
  "Content-Type":"application/json"
  },
  body:JSON.stringify({
  userId:selectedUser,
  amount:num,
  mode
  })
  }
  );

  const d=await r.json();

  if (r.ok && d.user) {
    setMessage(`Balance updated $${Number(d.user.balance).toFixed(2)}`);
    setUsers(prev => prev.map(u => u.id === selectedUser ? { ...u, balance: d.user.balance } : u));
  } else {
    setMessage(d.error || "Balance update failed");
  }
} catch {
  setMessage("Balance update failed");
} finally {
  setAdjusting(false);
}

};







const chosen=users.find(
  u=>u.id===selectedUser || (customerSearch.trim() !== "" && (u.email?.toLowerCase() === customerSearch.trim().toLowerCase() || u.name?.toLowerCase() === customerSearch.trim().toLowerCase()))
);

const effectiveProductLimit = chosen
  ? Number(
      chosen.productLimit ||
      (chosen.currentPackage?.toLowerCase().includes("diamond") ? 300 : chosen.currentPackage?.toLowerCase().includes("bronze") ? 200 : 100)
    )
  : 300;

const availableProducts = products.slice(0, effectiveProductLimit);

const filteredProducts = availableProducts.filter(p => {
  if (!productSearch.trim()) return true;
  const term = productSearch.toLowerCase().trim();
  return (
    (p.name || "").toLowerCase().includes(term) ||
    (p.sku || "").toLowerCase().includes(term) ||
    String(p.price || "").includes(term) ||
    (p.category || "").toLowerCase().includes(term)
  );
});

const chosenProduct=products.find(
  p=>String(p.id)===selectedProduct
);


const selectCustomer=(u:any)=>{
  if(!u)return;
  setSelectedUser(String(u.id));
  setCustomerSearch(u.email || u.name || "");
};

const handleCustomerSearch=(val:string)=>{
  setCustomerSearch(val);
  const trimmed=val.trim().toLowerCase();
  if(trimmed){
    const exact=users.find(u=>
      u.role!=="admin" && (
        (u.email||"").toLowerCase()===trimmed ||
        String(u.id).toLowerCase()===trimmed
      )
    );
    if(exact){
      setSelectedUser(String(exact.id));
    }
  }
};





const nextStatus=(status:string)=>{


if(status==="pending")
return "handed_over";


if(status==="handed_over")
return "on_the_way";


if(status==="on_the_way")
return "delivered";


if(status==="delivered")
return "completed";


return "";

};





const queueQuery = queueSearch.trim().toLowerCase();
const visibleOrders = orders.filter(o => {
  if (queueFilter !== "all" && o.status !== queueFilter) return false;
  if (!queueQuery) return true;
  const cu = users.find(u => u.id === o.customerId);
  return [o.productName, o.id, cu?.name, cu?.email].some(v => String(v || "").toLowerCase().includes(queueQuery));
});

const customerRates = users
  .filter(u => u.role !== "admin" && Number(u.commissionRate) > 0)
  .map(u => Number(u.commissionRate));
const commissionChip = customerRates.length === 0
  ? "No commission plans yet"
  : Math.min(...customerRates) === Math.max(...customerRates)
    ? `${Math.min(...customerRates)}% Commission`
    : `${Math.min(...customerRates)}–${Math.max(...customerRates)}% Commission`;

return (

<AdminShell>
<div className="orders-3d">


<div className="topbar">


<div>

<span className="eyebrow">
Order Management
</span>


<h1>
Orders & Customer Funds
</h1>


</div>



<span className="admin-chip live-chip">

<i/>
{commissionChip}

</span>


</div>



{message&&

<div className="info-banner">

{message}

</div>

}
<section className="admin-order-grid">


<section className="panel">


<div className="panel-head">

<div>

<span className="eyebrow">
Create Order
</span>


<h2>
Send Order To Customer
</h2>


</div>

</div>





<div className="form-grid admin-form">

<div className="form-field">
  <div style={{fontWeight: 700, color: "#334155", fontSize: "13px", marginBottom: "8px", display: "flex", justifyContent: "space-between"}}>
    <span>Customer</span>
    {selectedUser && chosen && (
      <span style={{color: "#0D9488", fontSize: "12px", fontWeight: 700}}>✓ Selected: {chosen.name}</span>
    )}
  </div>
  {selectedUser && chosen ? (
    <div className="selected-card customer-selected">
      <div className="avatar" style={{width: 42, height: 42, fontSize: 16}}>
        {chosen.name ? chosen.name.slice(0, 2).toUpperCase() : "CU"}
      </div>
      <div className="selected-card-info">
        <div className="selected-card-title">{chosen.name}</div>
        <div className="selected-card-sub">
          <span>{chosen.email}</span>
          <span>Shop: <b>{chosen.shopName || "N/A"}</b></span>
        </div>
      </div>
      <button
        type="button"
        className="btn-change"
        onClick={() => {
          setSelectedUser("");
          setCustomerSearch("");
        }}
      >
        Change Customer
      </button>
    </div>
  ) : (
    <div className="customer-search-box">
      <div className="product-search-field">
      <svg className="search-icon-inside" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        className="search with-icon"
        placeholder="Search customer by name, email, or shop..."
        value={customerSearch}
        onChange={e => handleCustomerSearch(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") {
            e.preventDefault();
            const exact = users.find(u =>
              u.role !== "admin" && (
                (u.email || "").toLowerCase() === customerSearch.trim().toLowerCase() ||
                (u.name || "").toLowerCase() === customerSearch.trim().toLowerCase() ||
                (u.shopName || "").toLowerCase() === customerSearch.trim().toLowerCase()
              )
            );
            const first = exact || users.find(u =>
              u.role !== "admin" && (
                (u.email || "").toLowerCase().includes(customerSearch.trim().toLowerCase()) ||
                (u.name || "").toLowerCase().includes(customerSearch.trim().toLowerCase()) ||
                (u.shopName || "").toLowerCase().includes(customerSearch.trim().toLowerCase())
              )
            );
            if (first) selectCustomer(first);
          }
        }}
        onBlur={() => {
          if (customerSearch.trim() && !selectedUser) {
            const match = users.find(u =>
              u.role !== "admin" && (
                (u.email || "").toLowerCase() === customerSearch.trim().toLowerCase() ||
                (u.name || "").toLowerCase() === customerSearch.trim().toLowerCase()
              )
            );
            if (match) selectCustomer(match);
          }
        }}
      />
      </div>
      {customerSearch && !selectedUser && (
        <div className="customer-results" style={{ zIndex: 120 }}>
          {users
            .filter(u =>
              u.role !== "admin" &&
              (
                (u.email || "").toLowerCase().includes(customerSearch.trim().toLowerCase()) ||
                (u.name || "").toLowerCase().includes(customerSearch.trim().toLowerCase()) ||
                (u.shopName || "").toLowerCase().includes(customerSearch.trim().toLowerCase())
              )
            )
            .map(u => (
              <div
                key={u.id}
                className="customer-option"
                style={{ cursor: "pointer" }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  selectCustomer(u);
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  selectCustomer(u);
                }}
              >
                <b>{u.name}</b>
                <br />
                <small>{u.email}</small>
                <br />
                <small>Shop: {u.shopName || "N/A"} • Plan: {u.currentPackage || "None"}</small>
              </div>
            ))}
          {users.filter(u =>
            u.role !== "admin" &&
            (
              (u.email || "").toLowerCase().includes(customerSearch.trim().toLowerCase()) ||
              (u.name || "").toLowerCase().includes(customerSearch.trim().toLowerCase()) ||
              (u.shopName || "").toLowerCase().includes(customerSearch.trim().toLowerCase())
            )
          ).length === 0 && (
            <div style={{padding: "12px 14px", color: "#64748B", fontSize: "13px"}}>
              No customer found matching "{customerSearch}"
            </div>
          )}
        </div>
      )}

      <select
        value={selectedUser}
        onChange={(e) => {
          const u = users.find(x => String(x.id) === e.target.value);
          if (u) {
            selectCustomer(u);
          } else {
            setSelectedUser(e.target.value);
          }
        }}
        style={{ marginTop: "8px" }}
      >
        <option value="">-- Or select customer from list ({users.filter(u => u.role !== "admin").length} available) --</option>
        {users.filter(u => u.role !== "admin").map(u => (
          <option key={u.id} value={u.id}>
            {u.name} ({u.email})
          </option>
        ))}
      </select>
    </div>
  )}
</div>

<div className="form-field product-field">
  <div style={{fontWeight: 700, color: "#334155", fontSize: "13px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px"}}>
    <span>Product</span>
    {chosen ? (
      <span className="plan-tag-badge">
        ★ {chosen.currentPackageName || chosen.currentPackage || "Customer"} Plan: {availableProducts.length} of {products.length} Products
      </span>
    ) : (
      <span className="plan-tag-badge neutral">
        {products.length} Total Products Available
      </span>
    )}
  </div>

  {selectedProduct && chosenProduct ? (
    <div className="selected-card product-selected">
      <img
        src={chosenProduct.image || "/products/1-25-carat-designer-halo-channel-set-round-2201.jpg"}
        alt={chosenProduct.name}
      />
      <div className="selected-card-info">
        <div className="selected-card-title">{chosenProduct.name}</div>
        <div className="selected-card-sub">
          {chosenProduct.sku && <span className="sku-chip">SKU: {chosenProduct.sku}</span>}
          {chosenProduct.category && <span className="product-selected-cat">{chosenProduct.category}</span>}
          <span className="selected-card-price">${Number(chosenProduct.price || 0).toFixed(2)}</span>
        </div>
      </div>
      <button
        type="button"
        className="btn-change"
        onClick={() => {
          setSelectedProduct("");
          setAmount("");
          setProductSearch("");
        }}
      >
        Change Product
      </button>
    </div>
  ) : (
    <div className="custom-product-picker-container">
      <div className="product-search-bar-wrap">
        <div className="product-search-field">
          <svg className="search-icon-inside" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            className="search-input-modern"
            placeholder={
              chosen
                ? `Search among ${availableProducts.length} ${chosen.currentPackageName || chosen.currentPackage || ""} plan products...`
                : `Search products by name, SKU or price...`
            }
            value={productSearch}
            onChange={(e) => {
              setProductSearch(e.target.value);
              setIsBrowsingProducts(true);
            }}
            onFocus={() => setIsBrowsingProducts(true)}
          />
          {productSearch && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setProductSearch("")}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
        <button
          type="button"
          className={`btn-browse-catalog ${isBrowsingProducts ? "active" : ""}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsBrowsingProducts(!isBrowsingProducts);
          }}
        >
          <span>{isBrowsingProducts ? "Close List" : `Browse All (${availableProducts.length})`}</span>
          <svg
            className={`browse-chevron ${isBrowsingProducts ? "open" : ""}`}
            width="12"
            height="12"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {isBrowsingProducts && (
        <div className="product-results-modern" onClick={(e) => e.stopPropagation()}>
          <div className="product-results-bar">
            <div className="results-count-title">
              {productSearch ? (
                <span>Found <strong>{filteredProducts.length}</strong> matching products</span>
              ) : (
                <span>
                  <strong>{chosen ? `${chosen.name}'s ${chosen.currentPackageName || chosen.currentPackage || ""} Plan` : 'Product Catalog'}</strong> ({availableProducts.length} available items)
                </span>
              )}
            </div>
            <button
              type="button"
              className="close-picker-link"
              onClick={() => setIsBrowsingProducts(false)}
            >
              ✕ Close
            </button>
          </div>

          <div className="product-scroll-list">
            {filteredProducts.map((p, idx) => (
              <div
                key={p.id}
                className="product-picker-row"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  pickProduct(String(p.id));
                  setIsBrowsingProducts(false);
                  setProductSearch("");
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  pickProduct(String(p.id));
                  setIsBrowsingProducts(false);
                  setProductSearch("");
                }}
              >
                <span className="product-index-pill">#{idx + 1}</span>
                <img
                  src={p.image || "/products/1-25-carat-designer-halo-channel-set-round-2201.jpg"}
                  alt={p.name}
                  className="product-thumb-sm"
                />
                <div className="product-picker-row-info">
                  <div className="product-picker-row-title">{p.name}</div>
                  <div className="product-picker-row-meta">
                    {p.sku && <span className="sku-chip">SKU: {p.sku}</span>}
                    {p.category && <span>• {p.category}</span>}
                  </div>
                </div>
                <div className="product-picker-row-price">
                  ${Number(p.price || 0).toFixed(2)}
                </div>
              </div>
            ))}

            {filteredProducts.length === 0 && (
              <div className="empty-products-notice">
                No products found matching "{productSearch}" within customer's {effectiveProductLimit} plan limit.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )}

  <div className="order-amount-sub">
    <div className="order-amount-label">Order Amount ($)</div>
    <input
      value={amount ? `$${Number(amount).toFixed(2)}` : ""}
      readOnly
      placeholder="Select product to auto-fill price"
    />
  </div>
</div>

<div className="form-field">
  <div style={{fontWeight: 700, color: "#334155", fontSize: "13px", marginBottom: "8px"}}>
    Customer Active Plan & Commission
  </div>
  <div className="selected-card" style={{marginTop: "0", minHeight: "48px"}}>
    <div className="selected-card-info">
      <div className="selected-card-title" style={{fontSize: "13px"}}>
        {chosen?.currentPackage || "No Active Plan"}
      </div>
      <div className="selected-card-sub">
        <span>Commission Rate: <b>{chosen?.commissionRate || 0}%</b></span>
      </div>
    </div>
  </div>
</div>

</div>

<div className="formula-card">
  <div className="formula-breakdown">
    <div className="formula-item">
      <span className="formula-label">Product Price</span>
      <span className="formula-val">${Number(amount || 0).toFixed(2)}</span>
    </div>
    <span className="formula-op">+</span>
    <div className="formula-item">
      <span className="formula-label">Commission ({chosen?.commissionRate || 0}%)</span>
      <span className="formula-val">
        ${(Number(amount || 0) * Number(chosen?.commissionRate || 0) / 100).toFixed(2)}
      </span>
    </div>
    <span className="formula-op">=</span>
    <div className="formula-item">
      <span className="formula-label">Total Customer Charge</span>
      <span className="formula-val total">
        ${(Number(amount || 0) * (1 + Number(chosen?.commissionRate || 0) / 100)).toFixed(2)}
      </span>
    </div>
  </div>
</div>

<button
  className="btn"
  disabled={(!selectedUser && !customerSearch.trim()) || !selectedProduct}
  onClick={send}
>
  Send Order
</button>




</section>



<section className="panel">

<div className="panel-head">
<div>
<span className="eyebrow">Funds</span>
<h2>Total Balance & Total Profit</h2>
</div>
</div>

<div className="fund-cards orders-funds">

<div className="balance-box">
<div className="fund-title">Total Balance</div>
<strong>${Number(chosen?.balance || 0).toFixed(2)}</strong>
</div>

<div className="profit-box">
<div className="fund-title">Total Profit</div>
<strong>${Number(chosen?.profit || 0).toFixed(2)}</strong>
</div>

</div>

<label>
Amount
<div className="adjust-row">

<input
type="number"
step="0.01"
min="0.01"
placeholder="Amount"
value={adjust}
disabled={adjusting}
onChange={e=>setAdjust(e.target.value)}
/>

<button
  className="btn btn-small"
  disabled={adjusting || !selectedUser || !adjust}
  onClick={()=>balanceAdjust("add")}
>
  {adjusting ? "Processing..." : "+ Add"}
</button>

<button
  className="btn btn-small danger-btn"
  disabled={adjusting || !selectedUser || !adjust}
  onClick={()=>balanceAdjust("deduct")}
>
  {adjusting ? "Processing..." : "− Deduct"}
</button>

</div>
</label>

<small className="hint">
Add/Deduct changes Total Balance. Grabbed orders deduct the Order Amount. Completed orders return the Order Amount + Commission to Total Balance and add the Commission to Total Profit.
</small>

</section>



</section><section className="panel">


<div className="panel-head">

<div>

<span className="eyebrow">
Order Queue
</span>


<h2>
All Orders <span className="queue-total">{orders.length}</span>
</h2>


</div>


</div>






<div className="queue-toolbar">
  <div className="queue-chips" role="tablist" aria-label="Filter orders by status">
    <button
      type="button"
      role="tab"
      aria-selected={queueFilter === "all"}
      className={`queue-chip ${queueFilter === "all" ? "on" : ""}`}
      onClick={() => setQueueFilter("all")}
    >
      All <em>{orders.length}</em>
    </button>
    {ORDER_STATUS_CONFIG.map(opt => {
      const count = orders.filter(o => o.status === opt.value).length;
      return (
        <button
          type="button"
          role="tab"
          key={opt.value}
          aria-selected={queueFilter === opt.value}
          className={`queue-chip ${queueFilter === opt.value ? "on" : ""}`}
          style={queueFilter === opt.value ? { background: opt.bg, color: opt.color, borderColor: opt.dot } : undefined}
          onClick={() => setQueueFilter(opt.value)}
        >
          <i style={{ background: opt.dot }} />
          {opt.label}
          <em>{count}</em>
        </button>
      );
    })}
  </div>
  <label className="queue-search">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
    <input
      value={queueSearch}
      onChange={e => setQueueSearch(e.target.value)}
      placeholder="Search product, customer or order #"
    />
  </label>
</div>

<div className="table-wrap orders-table-wrap">


<table>


<thead>


<tr>

<th>
Product
</th>


<th>
Customer
</th>


<th>
Amount
</th>


<th>
Commission
</th>


<th>
Status
</th>


<th>
Change Status
</th>


</tr>


</thead>






<tbody>



{visibleOrders.length === 0 && (
<tr>
  <td colSpan={6} className="queue-empty">
    No orders match this filter.
  </td>
</tr>
)}
{
visibleOrders.map((o, idx)=>{



const next=nextStatus(o.status);



return (

<tr key={o.id}>


<td>


<div className="order-product-cell">


<img

className="table-thumb"

src={o.image}

alt={o.productName}

/>



<div>

<b>

{o.productName}

</b>


<small>

#{o.id.slice(0,8).toUpperCase()}

</small>


</div>



</div>



</td>







<td>
{(() => {
  const cu = users.find(u => u.id === o.customerId);
  return (
    <div className="queue-customer">
      <span className={`avatar ${cu?.profileImage ? "has-photo" : ""}`}>
        {cu?.profileImage ? <img src={cu.profileImage} alt={cu?.name || "Customer"} /> : (cu?.name?.[0] || "C")}
      </span>
      <div>
        <b>{cu?.name || "Customer"}</b>
        <small>{cu?.email || ""}</small>
      </div>
    </div>
  );
})()}
</td>






<td>


<strong>

${Number(o.orderAmount||0).toFixed(2)}

</strong>


</td>






<td>


${Number(o.commission||0).toFixed(2)}

<br/>


<small>

{o.commissionPercent}%

</small>


</td>







<td>


<span

className={`status order-status ${o.status}`}

>

{orderStatusLabel(o.status)}

</span>


</td>








<td>
  {(() => {
    const selectedVal = statusSelection[o.id] || o.status;
    const currentOpt = getOrderStatusConfig(selectedVal);
    const isDifferent = selectedVal !== o.status;
    const isBusy = updatingOrder === o.id;
    const isOpen = openDropdownId === o.id;
    

    if (o.status === "sent" && !o.grabbedAt) {
      const sentOpt = getOrderStatusConfig("sent");
      return (
        <div className="status-action-custom locked">
          <span
            className="status-badge-inline locked-badge"
            style={{ background: sentOpt.bg, color: sentOpt.color }}
          >
            <span className="status-dot-pulse" style={{ background: sentOpt.dot }} />
            <span className="status-badge-text">Awaiting customer</span>
          </span>
          <div className="status-sub">
            <span className="locked-note" title="The customer must grab this order before its status can change">
              ⏳ Waiting for customer
            </span>
            <button
              type="button"
              className="withdraw-btn"
              onClick={() => withdrawOrder(o)}
              disabled={updatingOrder === o.id}
              title="Withdraw this order (only before the customer grabs it)"
            >
              {updatingOrder === o.id ? "Withdrawing…" : "Withdraw"}
            </button>
          </div>
        </div>
      );
    }
    if (o.status === "completed") {
      const doneOpt = getOrderStatusConfig("completed");
      return (
        <div className="status-action-custom locked">
          <span
            className="status-badge-inline locked-badge"
            style={{ background: doneOpt.bg, color: doneOpt.color }}
          >
            <span className="status-dot-pulse" style={{ background: doneOpt.dot }} />
            <span className="status-badge-text">{doneOpt.label}</span>
          </span>
          <div className="status-sub">
            <span className="locked-note" title="Completed orders can no longer be changed">
              🔒 Locked · paid out
            </span>
          </div>
        </div>
      );
    }

    return (
      <div className="status-action-custom">
        <button
          type="button"
          className={`custom-status-trigger ${isOpen ? "open" : ""}`}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (openDropdownId === o.id) {
              setOpenDropdownId(null);
              return;
            }
            const r = e.currentTarget.getBoundingClientRect();
            const menuW = 300, menuH = 380;
            const left = Math.max(12, Math.min(r.left, window.innerWidth - menuW - 12));
            const upward = r.bottom + menuH > window.innerHeight && r.top > menuH;
            setMenuPos(upward ? { bottom: window.innerHeight - r.top + 6, left } : { top: r.bottom + 6, left });
            setOpenDropdownId(o.id);
          }}
          disabled={isBusy}
          title="Click to select status"
        >
          <span
            className="status-badge-inline"
            style={{ background: currentOpt.bg, color: currentOpt.color }}
          >
            <span
              className="status-dot-pulse"
              style={{ background: currentOpt.dot }}
            />
            <span className="status-badge-text">{currentOpt.label}</span>
          </span>

          <svg
            className={`chevron-icon ${isOpen ? "rotate" : ""}`}
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

        {isOpen && (
          <div
            className="custom-status-menu is-fixed"
            style={menuPos ? { position: "fixed", top: menuPos.top, bottom: menuPos.bottom, left: menuPos.left, right: "auto" } : undefined}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="custom-status-menu-header">
              <span>Select Order Status</span>
            </div>
            <div className="custom-status-menu-list">
              {ORDER_STATUS_CONFIG.map((opt) => {
                const isSelected = selectedVal === opt.value;
                const isDatabaseStatus = o.status === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={`custom-status-option ${isSelected ? "selected" : ""}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setStatusSelection((prev) => ({ ...prev, [o.id]: opt.value }));
                      setOpenDropdownId(null);
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setStatusSelection((prev) => ({ ...prev, [o.id]: opt.value }));
                      setOpenDropdownId(null);
                    }}
                  >
                    <div className="option-left">
                      <span
                        className="option-dot"
                        style={{ background: opt.dot }}
                      />
                      <div className="option-texts">
                        <span
                          className="option-label"
                          style={isSelected ? { color: opt.color, fontWeight: 700 } : undefined}
                        >
                          {opt.label}
                          {isDatabaseStatus && (
                            <span className="current-indicator">Current</span>
                          )}
                        </span>
                        <span className="option-desc">{opt.desc}</span>
                      </div>
                    </div>
                    {isSelected && (
                      <svg
                        className="option-check"
                        width="16"
                        height="16"
                        viewBox="0 0 20 20"
                        fill={opt.color}
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <button
          type="button"
          className={`custom-update-btn ${isDifferent ? "has-changes" : ""}`}
          disabled={isBusy}
          onClick={async () => {
            setUpdatingOrder(o.id);
            await updateStatus(o.id, selectedVal);
            setUpdatingOrder(null);
          }}
          title={isDifferent ? "Click to save changes" : "Status is up to date"}
        >
          {isBusy ? (
            <>
              <span className="spinner-sm" />
              <span>Updating...</span>
            </>
          ) : isDifferent ? (
            <>
              <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Update</span>
            </>
          ) : (
            <span>Update</span>
          )}
        </button>
      </div>
    );
  })()}
</td>






</tr>

)

})


}



</tbody>



</table>


</div>



</section>





</div>
</AdminShell>

);

}