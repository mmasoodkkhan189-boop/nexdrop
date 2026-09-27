"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminShell } from "../../../components";
import { apiFetch } from "../../../lib";


export default function AdminProductDetail(){

  const params = useParams<{id:string}>();
  const router = useRouter();

  const [p,setP] = useState<any>(null);


  useEffect(()=>{

    apiFetch("/api/products",{
      cache:"no-store"
    })
    .then(r=>r.json())
    .then(d=>
      setP(
        (d.products || [])
        .find((x:any)=>String(x.id)===String(params.id))
      )
    );


  },[params.id]);



  const deleteProduct = async()=>{

    if(!confirm("Delete this product?")) return;


    const r = await apiFetch(
      `/api/products/${params.id}`,
      {
        method:"DELETE"
      }
    );


    if(r.ok){

      router.push("/admin/products");

    }

  };



  if(!p){

    return (
      <AdminShell>
        <div className="loading-screen">
          Loading product…
        </div>
      </AdminShell>
    );

  }



  return (

    <AdminShell>


      <Link
        href="/admin/products"
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
              <span>SKU</span>
              <strong>{p.sku || "-"}</strong>
            </div>



            <div className="detail-box">
              <span>Category</span>
              <strong>{p.category || "-"}</strong>
            </div>



            <div className="detail-box">
              <span>Stock</span>
              <strong>{p.stock || 0}</strong>
            </div>



            <div className="detail-box">
              <span>Status</span>
              <strong>{p.status || "Active"}</strong>
            </div>



          </div>





          <div className="detail-note">

            <b>
              Description
            </b>

            <br/>

            {p.description || "No description added."}

          </div>




          <div
            style={{
              display:"flex",
              gap:10,
              marginTop:20
            }}
          >


            <Link
              href="/admin/products"
              className="btn"
            >
              Edit from products
            </Link>



            <button
              className="btn danger-btn"
              onClick={deleteProduct}
            >
              Delete Product
            </button>


          </div>



        </section>


      </div>


    </AdminShell>

  );

}