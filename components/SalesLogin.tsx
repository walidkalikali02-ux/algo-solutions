"use client";
import { useState } from "react";
export default function SalesLogin({ ar }: { ar: boolean }) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="formWrap"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const key = String(new FormData(e.currentTarget).get("key") || "");
        try {
          const r = await fetch("/api/sales/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key }),
          });
          if (r.ok) location.reload();
          else
            setError(
              ar
                ? "تعذر الدخول. تحقق من مفتاح الدخول وإعدادات النظام."
                : "Unable to sign in. Check the access key and system configuration.",
            );
        } catch {
          setError(ar ? "تعذر الاتصال" : "Connection failed");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h1>{ar ? "إدارة المبيعات" : "Sales management"}</h1>
      <label>
        {ar ? "مفتاح الدخول" : "Access key"}
        <input
          name="key"
          type="password"
          className="field"
          required
          autoComplete="current-password"
        />
      </label>
      <p role="alert">{error}</p>
      <button disabled={busy} className="btn primary">
        {busy ? (ar ? "جارٍ التحقق…" : "Signing in…") : ar ? "دخول" : "Sign in"}
      </button>
    </form>
  );
}
