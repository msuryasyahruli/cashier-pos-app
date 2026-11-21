// src/pages/login.tsx
import { Navigate } from "react-router-dom";
import { LoginForm } from "../components/auth/LoginForm";
import { useAuth } from "../context/AuthContext";
import { Logo } from "../components/Logo";

export const LoginPage = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas text-ink-secondary font-medium">
        Loading…
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <section className="min-h-screen flex items-center justify-center bg-canvas px-4 transition-colors">
      <div className="p-8 bg-surface rounded-2xl shadow-xl max-w-md w-full border border-divider">
        <div className="flex flex-col items-center mb-6">
          <Logo size="lg" orientation="vertical" />
          <p className="text-xs text-ink-secondary mt-2">
            Sign in to access your cashier POS terminal
          </p>
        </div>
        <LoginForm />
      </div>
    </section>
  );
};
