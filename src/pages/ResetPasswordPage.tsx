import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { supabase } from "../services/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { Logo } from "../components/Logo";

const hasRecoveryParamsInUrl = (): boolean => {
  const hash = window.location.hash || "";
  const search = window.location.search || "";
  return (
    hash.includes("type=recovery") ||
    search.includes("type=recovery") ||
    search.includes("code=")
  );
};

export const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const {
    user,
    loading: authLoading,
    isPasswordRecovery,
    clearPasswordRecovery,
  } = useAuth();
  const [urlRecoveryDetected, setUrlRecoveryDetected] = useState<boolean>(() =>
    hasRecoveryParamsInUrl(),
  );
  const isRecoveryMode = isPasswordRecovery || urlRecoveryDetected;
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setUrlRecoveryDetected(true);
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas text-ink-secondary font-medium">
        Loading…
      </div>
    );
  }

  if (user && !isRecoveryMode) {
    return <Navigate to="/" replace />;
  }

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);

    if (error) {
      setErrorMsg(error.message || "Failed to send password reset email.");
      return;
    }

    setSuccessMsg(
      "If an account exists for this email, a password reset link has been sent.",
    );
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!newPassword || newPassword.length < 6) {
      setErrorMsg("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    setLoading(false);

    if (error) {
      setErrorMsg(error.message || "Failed to update password.");
      return;
    }

    clearPasswordRecovery();
    setSuccessMsg("Password updated successfully. Redirecting...");
    setTimeout(() => {
      navigate("/", { replace: true });
    }, 1500);
  };

  return (
    <section className="min-h-screen flex items-center justify-center bg-canvas px-4 transition-colors">
      <div className="p-8 bg-surface rounded-2xl shadow-xl max-w-md w-full border border-divider">
        <div className="flex flex-col items-center mb-6">
          <Logo size="lg" orientation="vertical" />
          <p className="text-xs text-ink-secondary mt-2">
            {isRecoveryMode
              ? "Enter your new password below"
              : "Enter your email to receive a password reset link"}
          </p>
        </div>

        {isRecoveryMode ? (
          <form onSubmit={handleUpdatePassword} className="flex flex-col gap-5">
            {errorMsg && (
              <div className="flex items-start gap-2.5 p-3 bg-status-dangerBg border border-status-dangerText/20 rounded-xl text-sm text-status-dangerText">
                <AlertCircle
                  size={16}
                  className="mt-0.5 shrink-0 text-status-dangerText"
                />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="flex items-start gap-2.5 p-3 bg-status-successBg border border-status-successText/20 rounded-xl text-sm text-status-successText">
                <CheckCircle2
                  size={16}
                  className="mt-0.5 shrink-0 text-status-successText"
                />
                <span>{successMsg}</span>
              </div>
            )}

            <div>
              <label
                htmlFor="new-password"
                className="block text-xs font-semibold text-ink-secondary mb-1.5 uppercase tracking-wider"
              >
                New Password
              </label>
              <div className="flex items-center gap-2.5 border border-divider rounded-xl px-3.5 py-2.5 bg-surface focus-within:border-brand focus-within:ring-2 focus-within:ring-brand-ring transition-all">
                <Lock size={16} className="text-ink-secondary shrink-0" />
                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimum 6 characters"
                  className="flex-1 outline-none text-sm text-ink-primary placeholder-ink-secondary bg-transparent"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="text-ink-secondary hover:text-ink-primary transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="block text-xs font-semibold text-ink-secondary mb-1.5 uppercase tracking-wider"
              >
                Confirm Password
              </label>
              <div className="flex items-center gap-2.5 border border-divider rounded-xl px-3.5 py-2.5 bg-surface focus-within:border-brand focus-within:ring-2 focus-within:ring-brand-ring transition-all">
                <Lock size={16} className="text-ink-secondary shrink-0" />
                <input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Re-enter new password"
                  className="flex-1 outline-none text-sm text-ink-primary placeholder-ink-secondary bg-transparent"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-brand text-ink-onPrimary rounded-xl font-semibold text-sm hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand-ring disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand/25 transition-all duration-200 active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Updating...
                </>
              ) : (
                "Update Password"
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRequestReset} className="flex flex-col gap-5">
            {errorMsg && (
              <div className="flex items-start gap-2.5 p-3 bg-status-dangerBg border border-status-dangerText/20 rounded-xl text-sm text-status-dangerText">
                <AlertCircle
                  size={16}
                  className="mt-0.5 shrink-0 text-status-dangerText"
                />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="flex items-start gap-2.5 p-3 bg-status-successBg border border-status-successText/20 rounded-xl text-sm text-status-successText">
                <CheckCircle2
                  size={16}
                  className="mt-0.5 shrink-0 text-status-successText"
                />
                <span>{successMsg}</span>
              </div>
            )}

            <div>
              <label
                htmlFor="reset-email"
                className="block text-xs font-semibold text-ink-secondary mb-1.5 uppercase tracking-wider"
              >
                Email
              </label>
              <div className="flex items-center gap-2.5 border border-divider rounded-xl px-3.5 py-2.5 bg-surface focus-within:border-brand focus-within:ring-2 focus-within:ring-brand-ring transition-all">
                <Mail size={16} className="text-ink-secondary shrink-0" />
                <input
                  id="reset-email"
                  type="email"
                  placeholder="name@email.com"
                  className="flex-1 outline-none text-sm text-ink-primary placeholder-ink-secondary bg-transparent"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-brand text-ink-onPrimary rounded-xl font-semibold text-sm hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand-ring disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand/25 transition-all duration-200 active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Sending...
                </>
              ) : (
                "Send Reset Link"
              )}
            </button>

            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-1.5 text-xs text-ink-secondary hover:text-ink-primary transition-colors"
            >
              <ArrowLeft size={14} />
              Back to Sign In
            </Link>
          </form>
        )}
      </div>
    </section>
  );
};
