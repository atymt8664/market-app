import { useState } from "react";

const API_BASE =
  "https://796954c8-8650-4692-8c58-ccaa3bfea85b-00-2ptjcbj5jjblu.kirk.replit.dev:3002";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!password.trim()) {
      setError("اكتب كلمة مرور الأدمن");
      return;
    }

    try {
      setError("");
      setLoading(true);

      const res = await fetch(`${API_BASE}/api/admin-login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ password: password.trim() }),
      });

      if (res.ok) {
        window.location.href = "/admin";
        return;
      }

      setError("كلمة المرور غير صحيحة");
    } catch {
      setError("تعذر الاتصال بالسيرفر");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="w-full max-w-sm border rounded-2xl p-6 space-y-5 shadow-sm">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">دخول الأدمن</h1>
          <p className="text-sm text-muted-foreground">
            أدخل كلمة المرور للوصول إلى لوحة التحكم
          </p>
        </div>

        <input
          type="password"
          placeholder="كلمة مرور الأدمن"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleLogin();
          }}
          className="w-full border rounded-xl p-3 bg-background text-right outline-none focus:ring-2 focus:ring-primary"
        />

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <button
          type="button"
          onClick={handleLogin}
          disabled={loading}
          className="w-full rounded-xl p-3 bg-primary text-primary-foreground font-medium disabled:opacity-60"
        >
          {loading ? "جاري الدخول..." : "دخول"}
        </button>
      </div>
    </div>
  );
}
