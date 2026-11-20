"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState("email");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);

  async function handleSend(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to dispatch code.");

      setMessage(data.message || "Code sent! Check your inbox.");
      setStep("otp");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed.");

      setUser(data.email);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (user) {
    return (
      <main style={{ maxWidth: 400, margin: "80px auto", padding: 24, border: "1px solid #e5e7eb", borderRadius: 8 }}>
        <h2>Signed In Successfully!</h2>
        <p>Logged in as: <strong>{user}</strong></p>
        <button
          onClick={() => { setUser(null); setStep("email"); setEmail(""); setCode(""); }}
          style={{ marginTop: 16, padding: "8px 16px", background: "#ef4444", color: "white", border: "none", borderRadius: 4 }}
        >
          Sign Out
        </button>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 400, margin: "80px auto", padding: 24, border: "1px solid #e5e7eb", borderRadius: 8 }}>
      <h2>Next.js OTP Authentication</h2>
      <p style={{ color: "#6b7280", fontSize: 14 }}>Powered by email-auth-kit</p>

      {message && <div style={{ color: "green", margin: "12px 0", fontSize: 14 }}>{message}</div>}
      {error && <div style={{ color: "red", margin: "12px 0", fontSize: 14 }}>{error}</div>}

      {step === "email" ? (
        <form onSubmit={handleSend}>
          <div style={{ margin: "16px 0" }}>
            <label style={{ display: "block", fontSize: 14, marginBottom: 4 }}>Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{ width: "100%", padding: 10, background: "#2563eb", color: "white", border: "none", borderRadius: 4 }}
          >
            {loading ? "Sending..." : "Send Verification Code"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerify}>
          <div style={{ margin: "16px 0" }}>
            <label style={{ display: "block", fontSize: 14, marginBottom: 4 }}>Enter 6-digit Code</label>
            <input
              type="text"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4, letterSpacing: 4, textAlign: "center", fontSize: 18 }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{ width: "100%", padding: 10, background: "#2563eb", color: "white", border: "none", borderRadius: 4 }}
          >
            {loading ? "Verifying..." : "Verify Code"}
          </button>
          <button
            type="button"
            onClick={() => setStep("email")}
            style={{ marginTop: 12, background: "none", border: "none", color: "#2563eb", textDecoration: "underline", cursor: "pointer", fontSize: 13 }}
          >
            Back to email
          </button>
        </form>
      )}
    </main>
  );
}

