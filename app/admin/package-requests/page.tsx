"use client";

import { useEffect, useState, useCallback } from "react";
import { AdminShell } from "../../components";
import { apiFetch, useRealtimeStream } from "../../lib";

export default function AdminPackageRequests(){

  const [requests,setRequests] = useState<any[]>([]);
  const [loading,setLoading] = useState(true);
  const [message,setMessage] = useState("");

  const load = useCallback(async()=>{
    try{
      const r = await apiFetch("/api/package-request", { cache:"no-store" });
      const d = await r.json();
      setRequests(Array.isArray(d.requests) ? d.requests : []);
    }catch{
      setMessage("Unable to load package requests.");
    }finally{
      setLoading(false);
    }
  }, []);

  useEffect(()=>{
    load();
  },[load]);

  useRealtimeStream(()=>{
    load();
  });


  const updateRequest = async(
    id:string,
    status:"approved"|"rejected"
  )=>{

    setMessage("");

    const r = await apiFetch(
      "/api/package-request",
      {
        method:"PATCH",

        headers:{
          "Content-Type":"application/json"
        },

        body:JSON.stringify({
          id,
          status
        })
      }
    );


    const d = await r.json();


    if(!r.ok){

      setMessage(
        d.error || "Unable to update request."
      );

      return;

    }


    setMessage(
      status === "approved"
        ? "Package approved successfully."
        : "Package request rejected."
    );


    load();

  };


  return (

    <AdminShell>

      <div className="topbar">

        <div>

          <span className="eyebrow">
            Package Management
          </span>

          <h1>
            Package Requests
          </h1>

        </div>

      </div>


      {message && (

        <div className="info-banner">
          {message}
        </div>

      )}


      <section className="panel">

        <div className="panel-head">

          <div>

            <span className="eyebrow">
              Customer Applications
            </span>

            <h2>
              Pending Requests
            </h2>

          </div>

          <span className="eyebrow">
            {requests.length} Requests
          </span>

        </div>


        {loading ? (

          <div className="empty-state">
            Loading requests...
          </div>

        ) : requests.length === 0 ? (

          <div className="empty-state">
            No package requests available.
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
                    Package
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Requested
                  </th>

                  <th>
                    Action
                  </th>

                </tr>

              </thead>


              <tbody>

                {requests.map((request:any)=>(

                  <tr key={request.id}>

                   <td>
  <b>
    {request.user?.name || "Customer"}
  </b>

  <br/>

  <small>
    {request.user?.email || ""}
  </small>
</td>

                    <td>
                      {request.package?.name ||
                       request.packageId}
                    </td>

                    <td>

                      <span className="status">

                        {request.status}

                      </span>

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

                      {request.status === "pending" && (

                        <div
                          style={{
                            display:"flex",
                            gap:"8px"
                          }}
                        >

                          <button
                            className="table-btn"
                            onClick={()=>
                              updateRequest(
                                request.id,
                                "approved"
                              )
                            }
                          >
                            Approve
                          </button>


                          <button
                            className="table-btn danger-btn"
                            onClick={()=>
                              updateRequest(
                                request.id,
                                "rejected"
                              )
                            }
                          >
                            Reject
                          </button>

                        </div>

                      )}

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </section>

    </AdminShell>

  );

}