"use client";

import { AdminShell } from "../../components";

export default function AdminPackages(){

  return (

    <AdminShell>

      <div className="topbar">

        <div>

          <span className="eyebrow">
            Package Management
          </span>

          <h1>
            Packages
          </h1>

        </div>

      </div>


      <section className="panel">

        <span className="eyebrow">
          Seller Plans
        </span>

        <h2>
          Package Management
        </h2>

        <p>
          Package management will be available here.
        </p>

      </section>

    </AdminShell>

  );

}