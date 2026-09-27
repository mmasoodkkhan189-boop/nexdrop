"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiMe, clearSession } from "../lib";

export default function KycPending(){

  const router = useRouter();
  const [shopName,setShopName] = useState("");

  useEffect(()=>{

    apiMe()
    .then((d:any)=>{
      setShopName(d.user.shopName || "");
    })
    .catch(()=>{
      clearSession();
      router.replace("/login");
    });

  },[router]);


  return (

    <main className="kyc-pending-page">

      <section className="kyc-pending-card">


        <div className="kyc-status-icon">
          !
        </div>


        <div className="verify-badge">
          NON-VERIFIED
        </div>


        <h1>
          Seller Application
          <span>
            Under Review
          </span>
        </h1>


        <p className="kyc-text">
          Your seller application has been submitted successfully.
          Our team will review your KYC documents before activating
          your seller account.
        </p>


        {shopName && (

          <div className="shop-box">

            <small>
              SHOP NAME
            </small>

            <strong>
              {shopName}
            </strong>

          </div>

        )}



        <div className="kyc-info">

          <div>
            <span>Status</span>
            <b>Pending Approval</b>
          </div>


          <div>
            <span>Access</span>
            <b>Waiting for Admin Review</b>
          </div>

        </div>



        <button
          onClick={()=>router.push("/")}
          className="btn full"
        >
          Back to Home
        </button>



        <button
          onClick={()=>{
            clearSession();
            router.replace("/login");
          }}
          className="btn btn-danger full"
        >
          Logout
        </button>


      </section>


    </main>

  );
}