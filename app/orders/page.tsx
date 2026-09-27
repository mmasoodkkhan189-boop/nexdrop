"use client";

import { useEffect, useState, useCallback } from "react";
import { UserShell } from "../components";
import { apiFetch, useRealtimeStream } from "../lib";

export default function Orders(){

  const [orders,setOrders] = useState<any[]>([]);
  const [balance,setBalance] = useState(0);
  const [error,setError] = useState("");
  const [confirming,setConfirming] = useState<any>(null);
  const [grabbing,setGrabbing] = useState(false);

  const load = useCallback(() => {
    apiFetch("/api/orders", { cache:"no-store" })
      .then(r => r.json())
      .then(d => {
        setOrders(d.orders || []);
        setBalance(Number(d.balance || 0));
      })
      .catch(()=>{});
  }, []);

  useEffect(()=>{
    load();
  },[load]);

  useRealtimeStream(()=>{
    load();
  });


  const grab = async(id:string)=>{
    setError("");
    setGrabbing(true);

    const r = await apiFetch(
      "/api/orders",
      {
        method:"POST",

        headers:{
          "Content-Type":
            "application/json"
        },

        body:JSON.stringify({
          orderId:id
        })

      }
    );


    const d = await r.json();


    setGrabbing(false);
    setConfirming(null);
    if(!r.ok){
      setError(
        d.error ||
        "Unable to grab order"
      );
      return;
    }
    load();
  };


  const pending =
    orders.filter(
      o => o.status === "sent"
    );


  return (

    <UserShell>

      <div className="topbar">

        <div>

          <span className="eyebrow">
            Orders
          </span>

          <h1>
            Available Orders
          </h1>

        </div>


        <span className="balance-chip">
          Total Balance $
          {balance.toFixed(2)}
        </span>

      </div>


      {error && (

        <div className="form-error">
          {error}
        </div>

      )}


      {pending.length === 0 ? (

        <section className="panel empty-state">

          No new orders right now.
          Your admin will send orders here.

        </section>

      ) : (

        <div className="order-grid">

          {pending.map(o => (

            <article
              className="order-card"
              key={o.id}
            >

              <img
                src={o.image}
                alt={o.productName}
              />


              <div className="order-content">

                <span className="status sent">
                  New Order
                </span>


                <h2>
                  {o.productName}
                </h2>


                <div className="amount-row">

                  <span>
                    Order Amount
                  </span>

                  <b>
                    ${Number(
                      o.orderAmount || 0
                    ).toFixed(2)}
                  </b>

                </div>


                <div className="amount-row">

                  <span>
                    Commission ({o.commissionPercent}%)
                  </span>

                  <b>
                    ${Number(
                      o.commission || 0
                    ).toFixed(2)}
                  </b>

                </div>


                <div className="amount-row total">

                  <span>
                    Total Amount
                  </span>

                  <b>
                    ${Number(
                      o.totalAmount || 0
                    ).toFixed(2)}
                  </b>

                </div>


                <div className="order-actions">

                  <button
                    className="btn"
                    onClick={() => setConfirming(o)}
                  >
                    Grab Order
                  </button>

                </div>


                <small className="hint">
                  Once you grab this order,
                  it will move to Pending.
                  Orders cannot be cancelled
                  by the seller.
                </small>

              </div>

            </article>

          ))}

        </div>

      )}

    {confirming && (() => {
        const amount = Number(confirming.orderAmount || 0);
        const after = balance - amount;
        const enough = after >= 0;
        return (
          <div className="grab-backdrop" onClick={() => !grabbing && setConfirming(null)}>
            <div
              className="grab-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="grab-title"
              onClick={e => e.stopPropagation()}
            >
              <div className="grab-head">
                <img src={confirming.image} alt={confirming.productName}/>
                <div>
                  <span className="eyebrow">Confirm order</span>
                  <h2 id="grab-title">{confirming.productName}</h2>
                </div>
              </div>

              <div className="grab-rows">
                <div className="grab-row">
                  <span>Current balance</span>
                  <b>${balance.toFixed(2)}</b>
                </div>
                <div className="grab-row deduct">
                  <span>Deducted now</span>
                  <b>− ${amount.toFixed(2)}</b>
                </div>
                <div className={`grab-row after ${enough ? "" : "short"}`}>
                  <span>Balance after</span>
                  <b>${after.toFixed(2)}</b>
                </div>
              </div>

              <div className="grab-warning">
                <strong>Please note</strong>
                The order amount is deducted from your balance immediately, and a grabbed order cannot be cancelled.
              </div>

              {!enough && (
                <div className="grab-short">
                  Your balance is not enough for this order.
                </div>
              )}

              <div className="grab-actions">
                <button
                  type="button"
                  className="grab-cancel"
                  onClick={() => setConfirming(null)}
                  disabled={grabbing}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => grab(confirming.id)}
                  disabled={grabbing || !enough}
                >
                  {grabbing ? "Processing…" : `Confirm & deduct $${amount.toFixed(2)}`}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </UserShell>
  );
}