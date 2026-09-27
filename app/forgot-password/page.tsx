"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPassword() {

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    setMessage("");

    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    try {

      const r = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          newPassword
        }),
      });


      const data = await r.json();


      if (!r.ok) {
        throw new Error(data.error || "Unable to reset password");
      }


      setMessage("Password updated successfully. You can login now.");

    } catch (err) {

      setMessage(
        err instanceof Error
          ? err.message
          : "Something went wrong"
      );

    }

  };


  return (

    <main className="auth-page">

      <section className="auth-card">

        <h1>
          Forgot Password
        </h1>


        <p>
          Enter your email and create a new password.
        </p>



        <form
          className="auth-form"
          onSubmit={submit}
        >


          {message && (
            <div className="form-error">
              {message}
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
            New Password

            <input
              type="password"
              value={newPassword}
              onChange={(e)=>setNewPassword(e.target.value)}
              placeholder="At least 6 characters"
              minLength={6}
              required
            />

          </label>




          <label>
            Confirm Password

            <input
              type="password"
              value={confirmPassword}
              onChange={(e)=>setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              required
            />

          </label>




          <button
            className="btn full"
            type="submit"
          >
            Reset Password
          </button>



        </form>




        <p className="switch">

          Remember password?{" "}

          <Link href="/login">
            Login
          </Link>

        </p>



      </section>

    </main>

  );
}