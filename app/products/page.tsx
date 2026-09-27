"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { UserShell } from "../components";
import { apiFetch, apiMe } from "../lib";


export default function Products() {

  const [products,setProducts] = useState<any[]>([]);
  const [q,setQ] = useState("");



  const loadProducts = async()=>{

   const productsRes = await apiFetch(
  "/api/products",
  {
    cache:"no-store"
  }
);


const productsData = await productsRes.json();



    setProducts(
      productsData.products || []
    );



  
  };




 useEffect(()=>{

  

  loadProducts();


},[]);








  const list = products.filter(p =>

    (p.status === "Active" || !p.status)

    &&

    (
      p.name +
      (p.category || "")
    )
    .toLowerCase()
    .includes(
      q.toLowerCase()
    )

  );




  return (

    <UserShell>


      <div className="topbar">

        <div>

          <span className="eyebrow">
            Marketplace
          </span>


          <h1>
            Products Store
          </h1>

        </div>



        <input
          className="search"
          value={q}
          onChange={e=>setQ(e.target.value)}
          placeholder="Search products..."
        />


      </div>





      <div className="product-grid">


        {list.map(p=>(


          <div
            className="product-card"
            key={p.id}
          >



            <Link href={`/products/${p.id}`}>

              {p.image && (

                <img
                  src={p.image}
                  alt={p.name}
                />

              )}



              <div className="product-body">


                <h3>
                  {p.name}
                </h3>



                <small>
                  {p.category || "General"}
                </small>



                <div style={{marginTop:"10px"}}>

                  <strong>
                    ${Number(p.price).toLocaleString()}
                  </strong>

                </div>



                <small>
                  {p.stock > 0
                    ? `Stock Available: ${p.stock}`
                    : "Out of Stock"
                  }
                </small>



              </div>


            </Link>




           


          </div>


        ))}


      </div>



    </UserShell>

  );

}