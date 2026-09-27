"use client";

import { useEffect, useState, useCallback } from "react";
import { AdminShell } from "../../components";
import { apiFetch, useRealtimeStream } from "../../lib";


export default function AdminWithdrawals(){

  const [requests,setRequests] =
    useState<any[]>([]);

  const [loading,setLoading] =
    useState(true);

  const [error,setError] =
    useState("");


  const loadRequests = useCallback(async()=>{
    try{
      setError("");
      const r = await apiFetch("/api/withdrawals", { cache:"no-store" });
      const d = await r.json();

      if(!r.ok){
        setError(d.error || "Unable to load withdrawal requests.");
        return;
      }

      setRequests(Array.isArray(d.requests) ? d.requests : []);
    }catch{
      setError("Unable to load withdrawal requests.");
    }finally{
      setLoading(false);
    }
  }, []);


  useEffect(()=>{
    loadRequests();
  },[loadRequests]);

  useRealtimeStream(()=>{
    loadRequests();
  });


  const handleAction = async(
    id:string,
    action:"approved" | "rejected"
  )=>{

    

    try{

      setError("");


      const r = await apiFetch(
        "/api/withdrawals",
        {

          method:"PATCH",

          headers:{
            "Content-Type":
              "application/json"
          },

          body:JSON.stringify({
            id,
            action
          })

        }
      );


      const d = await r.json();


      if(!r.ok){

        setError(
          d.error ||
          "Unable to process withdrawal request."
        );

        return;

      }


      await loadRequests();


    }catch{

      setError(
        "Something went wrong while processing the request."
      );

    }

  };


  return(

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


      {error && (

        <div className="info-banner">
          {error}
        </div>

      )}


      <section className="panel">


        <div className="panel-head">

          <div>

            <span className="eyebrow">
              Seller Withdrawals
            </span>

            <h2>
              Withdrawal Requests
            </h2>

          </div>


          <strong>
            {requests.length} Requests
          </strong>

        </div>


        {loading ? (

          <div className="empty-state">
            Loading withdrawal requests...
          </div>

        ) : requests.length === 0 ? (

          <div className="empty-state">
            No withdrawal requests yet.
          </div>

        ) : (

          <div className="table-wrap">

            <table>

              <thead>

                <tr>

                  <th>
                    Customer
                  </th>

                  <th>
                    Amount
                  </th>

                  <th>
                    Type
                  </th>

                  <th>
                    Account Details
                  </th>

                  <th>
                    Message
                  </th>

                  <th>
                    Requested
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Action
                  </th>

                </tr>

              </thead>


              <tbody>

                {requests.map(
                  (request:any)=>(

                    <tr key={request.id}>


                      <td>

                        <strong>
                          {request.customerName || "-"}
                        </strong>

                        <br />

                        <small>
                          {request.email || "-"}
                        </small>

                      </td>


                      <td>

                        <strong>
                          ${Number(
                            request.amount || 0
                          ).toLocaleString(
                            undefined,
                            {
                              minimumFractionDigits:2
                            }
                          )}
                        </strong>

                      </td>


                      <td>
                        {request.withdrawType || "-"}
                      </td>


                      <td>
                        {request.accountDetails || "-"}
                      </td>


                      <td>
                        {request.message || "-"}
                      </td>


                      <td>

                        {request.createdAt
                          ? new Date(
                              request.createdAt
                            ).toLocaleDateString()
                          : "-"
                        }

                      </td>


                      <td>

                        <span
                          className={`status ${
                            String(
                              request.status || "Pending"
                            ).toLowerCase()
                          }`}
                        >
                          {request.status || "Pending"}
                        </span>

                      </td>


                      <td>

                        {request.status === "Pending" ? (

                          <div
                            style={{
                              display:"flex",
                              gap:"8px"
                            }}
                          >

                            <button
                              type="button"
                              className="btn"
                              onClick={()=>
                                handleAction(
                                  request.id,
                                  "approved"
                                )
                              }
                            >
                              Approve
                            </button>


                            <button
                              type="button"
                              className="table-btn danger-btn"
                              onClick={()=>
                                handleAction(
                                  request.id,
                                  "rejected"
                                )
                              }
                            >
                              Reject
                            </button>

                          </div>

                        ) : (

                          <span className="hint">
                            Processed
                          </span>

                        )}

                      </td>


                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </section>

    </AdminShell>

  );

}