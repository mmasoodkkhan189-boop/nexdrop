"use client";

import {useEffect,useState,useCallback} from "react";
import Link from "next/link";
import {UserShell} from "../components";
import {apiFetch,useRealtimeStream} from "../lib";


export default function Withdrawal(){

  const [balance,setBalance]=useState(0);
  const [pendingBalance,setPendingBalance]=useState(0);
  const [guaranteeMoney,setGuaranteeMoney]=useState(0);
  const [requests,setRequests]=useState<any[]>([]);

  const [showModal,setShowModal]=useState(false);

  const [amount,setAmount]=useState("");
  const [withdrawType,setWithdrawType]=useState("Wallet Balance");
  const [accountDetails,setAccountDetails]=useState("");
  const [message,setMessage]=useState("");
  const [transactionPassword,setTransactionPassword]=useState("");

  const [error,setError]=useState("");
  const [success,setSuccess]=useState("");
  const [sending,setSending]=useState(false);


  const load = useCallback(async()=>{
    try{
      const r = await apiFetch("/api/withdrawals", { cache:"no-store" });
      const d = await r.json();

      if(!r.ok){
        setError(d.error || "Unable to load withdrawal data.");
        return;
      }

      setBalance(Number(d.balance || 0));
      setPendingBalance(Number(d.pendingBalance || 0));
      setGuaranteeMoney(Number(d.guaranteeMoney || 0));
      setRequests(d.requests || []);
    }catch{
      setError("Unable to load withdrawal data.");
    }
  }, []);

  useEffect(()=>{
    load();
  },[load]);

  useRealtimeStream(()=>{
    load();
  });


  const selectedBalance =
    withdrawType === "Guarantee Money"
      ? guaranteeMoney
      : balance;


  const sendRequest=async()=>{

    setError("");
    setSuccess("");

    const value=Number(amount);


    if(!value || value<=0){

      setError(
        "Please enter a valid withdrawal amount."
      );

      return;

    }


    if(value>selectedBalance){

      setError(
        `Insufficient ${withdrawType.toLowerCase()}.`
      );

      return;

    }


    if(!accountDetails.trim()){

      setError(
        "Please enter your account details."
      );

      return;

    }


    if(!transactionPassword.trim()){

      setError(
        "Please enter your transaction password."
      );

      return;

    }


    setSending(true);


    try{

      const r=await apiFetch(
        "/api/withdrawals",
        {

          method:"POST",

          headers:{
            "Content-Type":
              "application/json"
          },

          body:JSON.stringify({

            amount:value,

            withdrawType,

            accountDetails:
              accountDetails.trim(),

            message:
              message.trim(),

            transactionPassword:
              transactionPassword.trim()

          })

        }
      );


      const d=await r.json();


      if(!r.ok){

        setError(
          d.error ||
          "Unable to send withdrawal request."
        );

        setSending(false);

        return;

      }


      setSuccess(
        "Withdrawal request sent successfully."
      );


      setShowModal(false);

      setAmount("");
      setAccountDetails("");
      setMessage("");
      setTransactionPassword("");

      await load();

    }catch{

      setError(
        "Unable to send withdrawal request."
      );

    }


    setSending(false);

  };


  const money=(n:number)=>"$"+Number(n||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
  const [showPass,setShowPass]=useState(false);
  const pendingCount=requests.filter((r:any)=>String(r.status||"").toLowerCase()==="pending").length;

  const openModal=()=>{
    setError("");
    setSuccess("");
    setAmount("");
    setAccountDetails("");
    setMessage("");
    setTransactionPassword("");
    setWithdrawType("Wallet Balance");
    setShowPass(false);
    setShowModal(true);
  };

  return(
    <UserShell>
      <div className="wd">

        {/* ---------- wallet hero ---------- */}
        <section className="wd-hero">
          <div className="wd-hero-main">
            <span className="wd-kicker">Seller Wallet</span>
            <small>Wallet balance</small>
            <strong className="wd-big">{money(balance)}</strong>
            <p>Available working balance you can request to withdraw.</p>
            <button type="button" className="wd-cta" onClick={openModal}>
              <span>↗</span> Withdraw funds
            </button>
          </div>
          <div className="wd-card-visual" aria-hidden="true">
            <div className="wd-cc">
              <span className="wd-cc-chip"/>
              <span className="wd-cc-brand">NEXDROP</span>
              <span className="wd-cc-num">•••• •••• •••• 2048</span>
              <span className="wd-cc-foot"><em>Seller wallet</em><b>{money(balance)}</b></span>
            </div>
          </div>
        </section>

        {error && !showModal && <div className="wd-alert bad"><span>!</span>{error}</div>}
        {success && (
          <div className="wd-alert ok">
            <span>✓</span>
            <p>{success} Please contact <Link href="/support">Customer Support</Link> if you have any questions.</p>
          </div>
        )}

        {/* ---------- balances ---------- */}
        <div className="wd-balances">
          <div className="wd-bal main">
            <i>💼</i>
            <span>Wallet Balance</span>
            <strong title={money(balance)}>{money(balance)}</strong>
            <small>Available working balance</small>
          </div>
          <div className="wd-bal">
            <i>⏳</i>
            <span>Pending Balance</span>
            <strong title={money(pendingBalance)}>{money(pendingBalance)}</strong>
            <small>Orders still in progress</small>
          </div>
          <div className="wd-bal">
            <i>🛡️</i>
            <span>Guarantee Money</span>
            <strong title={money(guaranteeMoney)}>{money(guaranteeMoney)}</strong>
            <small>Account security amount</small>
          </div>
        </div>

        {/* ---------- how it works ---------- */}
        <section className="wd-steps">
          {[
            ["1","Send request","Choose the amount and add your account details."],
            ["2","Review","Your request shows as Pending while it is reviewed."],
            ["3","Update","The status in your history updates when it is processed."]
          ].map(([n,t,d])=>(
            <div key={n}><b>{n}</b><div><strong>{t}</strong><small>{d}</small></div></div>
          ))}
        </section>

        {/* ---------- history ---------- */}
        <section className="wd-history">
          <div className="wd-history-head">
            <div>
              <span className="eyebrow">Transaction History</span>
              <h2>Withdrawal Request History</h2>
            </div>
            <div className="wd-chips">
              <span>{requests.length} requests</span>
              {pendingCount > 0 && <span className="wait">{pendingCount} pending</span>}
            </div>
          </div>

          {requests.length===0 ? (
            <div className="wd-empty">
              <span>🧾</span>
              <b>No withdrawal requests yet</b>
              <small>Your requests and their status will appear here.</small>
              <button type="button" className="wd-btn ghost" onClick={openModal}>Make your first request</button>
            </div>
          ) : (
            <div className="wd-list">
              {requests.map((item:any)=>{
                const st=String(item.status||"").toLowerCase();
                return (
                  <div className="wd-row" key={item.id}>
                    <span className={`wd-row-ico ${st}`}>{st==="approved"||st==="completed"||st==="paid" ? "✓" : st==="rejected" ? "✕" : "⏳"}</span>
                    <div className="wd-row-main">
                      <b>{money(Number(item.amount||0))}</b>
                      <small>{item.withdrawType} · {item.createdAt ? new Date(item.createdAt).toLocaleDateString([], { day:"numeric", month:"short", year:"numeric" }) : "-"}</small>
                      {item.message && <em>{item.message}</em>}
                    </div>
                    <span className={`status ${st}`}>{item.status}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ---------- request modal ---------- */}
        {showModal && (
          <div className="wd-backdrop" onClick={()=>!sending && setShowModal(false)}>
            <div className="wd-modal" role="dialog" aria-modal="true" aria-label="Send a withdrawal request" onClick={e=>e.stopPropagation()}>
              <div className="wd-modal-head">
                <div>
                  <span className="eyebrow">Seller Wallet</span>
                  <h2>Send a Withdrawal Request</h2>
                </div>
                <button type="button" className="wd-x" onClick={()=>setShowModal(false)} aria-label="Close">✕</button>
              </div>

              <div className="wd-seg" role="tablist" aria-label="Withdrawal type">
                {["Wallet Balance","Guarantee Money"].map(t=>(
                  <button type="button" key={t} role="tab" aria-selected={withdrawType===t} className={withdrawType===t ? "on" : ""} onClick={()=>{ setWithdrawType(t); setAmount(""); }}>
                    <span>{t}</span>
                    <small>{money(t==="Guarantee Money" ? guaranteeMoney : balance)}</small>
                  </button>
                ))}
              </div>

              {error && <div className="wd-alert bad small"><span>!</span>{error}</div>}

              <label className="wd-field">
                <span>Amount</span>
                <div className="wd-amount">
                  <em>$</em>
                  <input type="number" min="0" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00"/>
                  <button type="button" onClick={()=>setAmount(String(selectedBalance.toFixed(2)))}>Max</button>
                </div>
                <small>Available {withdrawType.toLowerCase()}: <b>{money(selectedBalance)}</b></small>
              </label>

              <div className="wd-two">
                <label className="wd-field">
                  <span>Account Details</span>
                  <textarea value={accountDetails} onChange={e=>setAccountDetails(e.target.value)} placeholder="Bank / account details" rows={3}/>
                </label>
                <label className="wd-field">
                  <span>Message <i>(optional)</i></span>
                  <textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder="Optional message" rows={3}/>
                </label>
              </div>

              <label className="wd-field">
                <span>Transaction Password</span>
                <div className="wd-pass">
                  <input type={showPass ? "text" : "password"} value={transactionPassword} onChange={e=>setTransactionPassword(e.target.value)} placeholder="Enter transaction password" autoComplete="off"/>
                  <button type="button" onClick={()=>setShowPass(v=>!v)}>{showPass ? "Hide" : "Show"}</button>
                </div>
              </label>

              <div className="wd-summary">
                <span>You are requesting</span>
                <b>{amount && Number(amount) > 0 ? money(Number(amount)) : "$0.00"}</b>
                <small>from {withdrawType}</small>
              </div>

              <div className="wd-actions">
                <button type="button" className="wd-btn ghost" onClick={()=>setShowModal(false)} disabled={sending}>Close</button>
                <button type="button" className="wd-btn primary" onClick={sendRequest} disabled={sending}>
                  {sending ? "Sending…" : "Send Request"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </UserShell>
  );
}
