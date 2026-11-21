import { useLocation, Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isPasswordRecovery } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-canvas text-ink-secondary">Loading…</div>
    );
  }

  if (isPasswordRecovery) {
    return <Navigate to="/reset-password" replace />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
