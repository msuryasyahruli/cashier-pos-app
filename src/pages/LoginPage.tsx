// src/pages/login.tsx
import { Navigate } from "react-router-dom";
import { LoginForm } from "../components/auth/LoginForm";
import { useAuth } from "../components/auth/AuthProvider";

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
    <section className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="p-8 bg-white rounded-2xl shadow-lg max-w-md w-full border border-slate-200/60">
        <h1 className="text-2xl font-bold text-center mb-6 text-slate-900">Masuk ke Akun</h1>
        <LoginForm />
      </div>
    </section>
  );
};
