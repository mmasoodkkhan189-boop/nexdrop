"use client";

import { AdminShell } from "../../components";

export default function AdminWithdrawalRequests(){

  return (

    <AdminShell>

      <div className="topbar">

        <div>

          <span className="eyebrow">
            Finance Management
          </span>

          <h1>
            Withdrawal Requests
          </h1>

        </div>

      </div>


      <section className="panel">

        <span className="eyebrow">
          Seller Withdrawals
        </span>

        <h2>
          Withdrawal Requests
        </h2>

        <p>
          Customer withdrawal requests will appear here.
        </p>

      </section>

    </AdminShell>

  );

}