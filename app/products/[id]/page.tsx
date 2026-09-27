"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { UserShell } from "../../components";
import { apiFetch } from "../../lib";


export default function ProductDetail(){

  const params = useParams<{id:string}>();

  const [p,setP] = useState<any>(null);



  useEffect(()=>{

    apiFetch("/api/products",{
      cache:"no-store"
    })
    .then(r=>r.json())
    .then(d=>

      setP(
        (d.products || [])
        .find((x:any)=>
          String(x.id) === String(params.id)
        )
      )

    );

  },[params.id]);




  if(!p){

    return (

      <UserShell>

        <div className="loading-screen">
          Loading product…
        </div>

      </UserShell>

    );

  }




  return (

    <UserShell>


      <Link
        href="/products"
        className="back-link"
      >
        ← Back to products
      </Link>





      <div className="product-detail">



        {p.image && (

          <div className="product-detail-media">

            <img
              src={p.image}
              alt={p.name}
            />

          </div>

        )}






        <section className="product-detail-info">


          <span className="eyebrow">
            Product details
          </span>



          <h1>
            {p.name}
          </h1>




          <div className="detail-price">

            ${Number(p.price).toLocaleString()}

          </div>





          <div className="detail-grid">


            <div className="detail-box">

              <span>
                SKU
              </span>

              <strong>
                {p.sku || "-"}
              </strong>

            </div>



            <div className="detail-box">

              <span>
                Category
              </span>

              <strong>
                {p.category || "-"}
              </strong>

            </div>




            <div className="detail-box">

              <span>
                Stock
              </span>

              <strong>
                {p.stock > 0
                  ? `${p.stock} Available`
                  : "Out of Stock"
                }
              </strong>

            </div>




            <div className="detail-box">

              <span>
                Status
              </span>

              <strong>
                {p.status || "Active"}
              </strong>

            </div>


          </div>





          <div className="detail-note">

            <b>
              Description
            </b>

            <br/>

            {p.description ||
              "No description available."
            }


          </div>





          <button
            className="btn full"
            disabled={!p.stock || p.status==="Inactive"}
          >

            {p.stock && p.status==="Active"
              ? "Place Order"
              : "Out of Stock"
            }

          </button>




        </section>



      </div>



    </UserShell>

  );

}