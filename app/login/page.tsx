"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { saveSession } from "../lib";
import { AuthShell } from "../auth-shell";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          remember,
        }),
      });

      const data = await r.json();

      if (!r.ok) {
        throw new Error(data.error || "Unable to sign in");
      }

      saveSession(
        data.user.role,
        data.user,
        data.token
      );

     if(data.user.role === "admin"){

  router.push("/admin");

}
else{

  if(data.user.kycStatus !== "Approved"){

    router.push("/kyc-pending");

  }
  else{

    router.push("/dashboard");

  }

}

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign in"
      );

    } finally {
      setLoading(false);
    }
  };


  return (
    <AuthShell
      eyebrow="Seller workspace"
      title={<>Welcome back to <span className="nx-shine">Nexdrop.</span></>}
      text="Your store, orders, balance and support — all waiting right where you left them."
      points={["Real-time orders & profit", "Instant withdrawals", "24/7 dedicated support"]}
    >

      <section className="auth-card">

        <div className="auth-icon">
          N
        </div>


        <h1>
          Welcome back
        </h1>


        <p>
          Sign in to your Nexdrop workspace.
        </p>



        <form className="auth-form" onSubmit={submit}>


          {error && (
            <div className="form-error">
              {error}
            </div>
          )}



          <label>
            Email

            <input
              type="email"
              value={email}
              onChange={(e)=>setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />

          </label>




          <label>
            Password

            <div style={{
              display:"flex",
              gap:"8px"
            }}>

              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e)=>setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  flex:1
                }}
              />


              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
                style={{
                  padding: "0 10px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "transparent",
                  border: "none",
                  boxShadow: "none",
                  color: "#64748B",
                  transition: "color .15s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#0F766E"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#64748B"; }}
              >
                {showPassword ? (
                  /* eye-off */
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M3.98 8.22C2.76 9.4 2 10.9 2 12c0 0 3.5 7 10 7 1.52 0 2.9-.3 4.12-.82" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
                    <path d="M20.02 15.78C21.24 14.6 22 13.1 22 12c0 0-3.5-7-10-7-1.2 0-2.3.18-3.3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
                    <path d="M9.9 9.9a3.2 3.2 0 0 0 4.2 4.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
                    <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
                    <circle cx="12" cy="12" r="1.2" fill="currentColor" opacity="0.35"/>
                  </svg>
                ) : (
                  /* eye */
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
                    <circle cx="12" cy="12" r="3.1" stroke="currentColor" strokeWidth="1.7"/>
                    <circle cx="12" cy="12" r="1.15" fill="currentColor"/>
                  </svg>
                )}
              </button>


            </div>

          </label>





          <label className="remember-row">

            <input
              type="checkbox"
              checked={remember}
              onChange={(e)=>setRemember(e.target.checked)}
            />

            <span>
              Remember me
            </span>

          </label>




          <button
            className="btn full"
            disabled={loading}
            type="submit"
          >

            {loading
              ? "Signing in…"
              : "Sign in"
            }

          </button>


        </form>




        <p className="switch">

          New to Nexdrop?{" "}

          <Link href="/register">
            Create an account
          </Link>

        </p>



      </section>

    </AuthShell>
  );
}