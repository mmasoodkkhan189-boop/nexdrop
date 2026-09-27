"use client";

const money = (n:any) => "$" + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function AdminCharts({ stats }:{ stats:any }){

  const stages = [
    { key:"pending",   icon:"⏳", title:"Pending",    value:Number(stats.pendingOrders||0),   color:"#F59E0B", soft:"#FEF3C7" },
    { key:"onway",     icon:"🚚", title:"On The Way", value:Number(stats.onWayOrders||0),     color:"#0EA5E9", soft:"#E0F2FE" },
    { key:"delivered", icon:"📬", title:"Delivered",  value:Number(stats.deliveredOrders||0), color:"#8B5CF6", soft:"#EDE9FE" },
    { key:"completed", icon:"✅", title:"Completed",  value:Number(stats.completedOrders||0), color:"#10B981", soft:"#D1FAE5" }
  ];
  const stageTotal = Math.max(stages.reduce((s,x)=>s+x.value,0), 1);

  const totalProducts = Math.max(Number(stats.totalProducts||0), 1);
  const inventory = [
    { title:"Active",       value:Number(stats.activeProducts||0),     color:"#10B981", note:"Live in catalogue" },
    { title:"Low Stock",    value:Number(stats.lowStockProducts||0),   color:"#F59E0B", note:"Needs restock soon" },
    { title:"Out of Stock", value:Number(stats.outOfStockProducts||0), color:"#E11D48", note:"Unavailable" }
  ];

  const completed = Number(stats.completedOrders||0);
  const totalOrders = Number(stats.totalOrders||0);
  const completionRate = totalOrders > 0 ? (completed / totalOrders) * 100 : 0;
  const avgOrder = completed > 0 ? Number(stats.totalSales||0) / completed : 0;

  return (
    <>
      {/* ---------- Order pipeline ---------- */}
      <section className="ovx-card">
        <div className="ovx-card-head">
          <div>
            <span className="eyebrow">Analytics</span>
            <h2>Order Pipeline</h2>
          </div>
          <span className="ovx-pill">{stages.reduce((s,x)=>s+x.value,0)} orders in flow</span>
        </div>

        {/* stacked share bar */}
        <div className="ovx-stack" role="img" aria-label="Share of orders per stage">
          {stages.map(s=>(
            <i key={s.key} style={{ flexGrow:s.value, background:s.color }} title={`${s.title}: ${s.value}`}/>
          ))}
        </div>

        <div className="ovx-stages">
          {stages.map((s,i)=>(
            <div className="ovx-stage tilt-3d" key={s.key} style={{ ["--c" as any]:s.color, ["--soft" as any]:s.soft }}>
              <span className="ovx-stage-ico">{s.icon}</span>
              <div className="ovx-stage-top">
                <span className="dx-label">{s.title}</span>
                <em>{Math.round((s.value/stageTotal)*100)}%</em>
              </div>
              <strong>{s.value}</strong>
              <div className="ovx-bar"><i style={{ width:`${(s.value/stageTotal)*100}%` }}/></div>
              {i < stages.length - 1 && <span className="ovx-arrow" aria-hidden="true">›</span>}
            </div>
          ))}
        </div>
      </section>

      <div className="ovx-duo">

        {/* ---------- Inventory gauges ---------- */}
        <section className="ovx-card">
          <div className="ovx-card-head">
            <div>
              <span className="eyebrow">Inventory</span>
              <h2>Product Health</h2>
            </div>
            <span className="ovx-pill">{Number(stats.totalProducts||0)} products</span>
          </div>
          <div className="ovx-gauges">
            {inventory.map(g=>{
              const pct = Math.round((g.value/totalProducts)*100);
              return (
                <div className="ovx-gauge tilt-3d" key={g.title} style={{ ["--c" as any]:g.color, ["--p" as any]:pct }}>
                  <div className="ovx-ring"><span><b>{g.value}</b><small>{pct}%</small></span></div>
                  <b>{g.title}</b>
                  <small>{g.note}</small>
                </div>
              );
            })}
          </div>
        </section>

        {/* ---------- Revenue ---------- */}
        <section className="ovx-card">
          <div className="ovx-card-head">
            <div>
              <span className="eyebrow">Business</span>
              <h2>Revenue Analytics</h2>
            </div>
          </div>
          <div className="ovx-revenue">
            <div className="ovx-rate tilt-3d" style={{ ["--p" as any]:completionRate }}>
              <div className="ovx-ring big"><span><b>{completionRate.toFixed(0)}%</b><small>completed</small></span></div>
              <small>{completed} of {totalOrders} orders</small>
            </div>
            <div className="ovx-rev-list">
              <div className="ovx-rev tilt-3d"><span className="dx-ico c4">💰</span><div><span className="dx-label">Total Sales</span><strong>{money(stats.totalSales)}</strong></div></div>
              <div className="ovx-rev tilt-3d"><span className="dx-ico c6">💎</span><div><span className="dx-label">Commission</span><strong>{money(stats.totalCommission)}</strong></div></div>
              <div className="ovx-rev tilt-3d"><span className="dx-ico c2">🧾</span><div><span className="dx-label">Avg. Order</span><strong>{money(avgOrder)}</strong></div></div>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}
