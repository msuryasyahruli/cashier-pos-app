// src/pages/login.tsx
import { Navigate } from "react-router-dom";
import { LoginForm } from "../components/auth/LoginForm";
import { useAuth } from "../context/AuthContext";
import { Logo } from "../components/Logo";

export const LoginPage = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-500 font-medium">
        Loading…
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <section className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 px-4 transition-colors">
      <div className="p-8 bg-slate-900 rounded-2xl shadow-xl max-w-md w-full border border-slate-200/60 dark:border-slate-800">
        <div className="flex flex-col items-center mb-6">
          <Logo size="lg" orientation="vertical" />
          <p className="text-xs text-slate-400 mt-2">
            Sign in to access your cashier POS terminal
          </p>
        </div>
        <LoginForm />
      </div>
    </section>
  );
};
