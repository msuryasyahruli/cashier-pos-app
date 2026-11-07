import React, { useEffect, useState } from "react";
import { Card, Button, Input } from "../components";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Save,
  User,
} from "lucide-react";
import { useUserSettings } from "../hooks";

export const ProfilePage: React.FC = () => {
  const {
    userSettings,
    loading,
    saving,
    error,
    success,
    updateUser,
  } = useUserSettings();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (userSettings) {
      setUsername(userSettings.username ?? "");
      setEmail(userSettings.email ?? "");
    }
  }, [userSettings]);

  if (loading && !userSettings) {
    return (
      <div className="flex flex-1 items-center justify-center bg-slate-50 p-8">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 size={20} className="animate-spin" /> Loading profile...
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6">
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Profile Settings
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Manage your cashier profile and account details.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle size={16} /> {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 size={16} /> {success}
          </div>
        )}

        <Card className="space-y-4">
          <h2 className="flex items-center gap-2 border-b border-slate-100 pb-2 text-sm font-bold text-slate-800">
            <User size={14} className="text-indigo-500" /> Account Details
          </h2>
          {userSettings ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="e.g. johndoe"
                />
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="e.g. john@example.com"
                />
                <Input label="Role" value={userSettings.role ?? ""} disabled />
                <div className="space-y-1.5">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Status
                  </span>
                  <div className="flex items-center gap-2 px-3.5 py-2.5 text-sm text-slate-700">
                    <span className={`h-2 w-2 rounded-full ${userSettings.is_active ? "bg-emerald-500" : "bg-slate-400"}`} />
                    {userSettings.is_active ? "Active" : "Inactive"}
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  disabled={saving}
                  icon={saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  onClick={() => void updateUser({ username, email })}
                >
                  {saving ? "Saving..." : "Save Profile"}
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">User profile data not found.</p>
          )}
        </Card>
      </div>
    </div>
  );
};
