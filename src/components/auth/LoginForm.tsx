// src/components/auth/LoginForm.tsx
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { Lock, Eye, EyeOff, Mail, AlertCircle, Loader2 } from "lucide-react";

export const LoginForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from =
    (location.state as { from?: { pathname: string } })?.from?.pathname || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMsg("Masukkan email yang valid.");
      return;
    }
    if (!password || password.length < 6) {
      setErrorMsg("Password minimal 6 karakter.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (error) {
      if (error.message?.includes("Invalid login")) {
        setErrorMsg("Email atau password salah.");
      } else if (error.message?.includes("Email not confirmed")) {
        setErrorMsg("Email belum dikonfirmasi. Cek inbox Anda.");
      } else {
        setErrorMsg(error.message ?? "Login gagal. Coba lagi.");
      }
    } else {
      navigate(from, { replace: true });
    }
  };

  return (
    <form onSubmit={handleLogin} className="flex flex-col gap-5">
      {/* Error banner */}
      {errorMsg && (
        <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200/80 rounded-xl text-sm text-red-700 animate-in fade-in slide-in-from-top-1 duration-200">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Email */}
      <div>
        <label
          htmlFor="login-email"
          className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider"
        >
          Email
        </label>
        <div className="flex items-center gap-2.5 border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
          <Mail size={16} className="text-slate-400 shrink-0" />
          <input
            id="login-email"
            type="email"
            placeholder="nama@email.com"
            className="flex-1 outline-none text-sm text-slate-800 placeholder-slate-400 bg-transparent"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            autoComplete="email"
          />
        </div>
      </div>

      {/* Password */}
      <div>
        <label
          htmlFor="login-password"
          className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider"
        >
          Password
        </label>
        <div className="flex items-center gap-2.5 border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
          <Lock size={16} className="text-slate-400 shrink-0" />
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            className="flex-1 outline-none text-sm text-slate-800 placeholder-slate-400 bg-transparent"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {/* Forgot password link */}
      <div className="flex justify-end -mt-1">
        <button
          type="button"
          onClick={() => navigate("/reset-password")}
          className="text-xs text-indigo-500 hover:text-indigo-700 hover:underline font-medium transition-colors"
        >
          Lupa Password?
        </button>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-semibold text-sm hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25 transition-all duration-200 active:scale-[0.98]"
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" size={16} />
            Memproses...
          </>
        ) : (
          "Masuk"
        )}
      </button>
    </form>
  );
};
