import React, { useEffect, useState } from "react";
import { Card, Button, Input } from "../components";
import { AlertCircle, CheckCircle2, Loader2, Save, User } from "lucide-react";
import { useUserSettings } from "../hooks";

export const ProfilePage: React.FC = () => {
  const { userSettings, loading, saving, error, success, updateUser } =
    useUserSettings();
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
      <div className="flex flex-1 items-center justify-center bg-canvas p-8">
        <div className="flex items-center gap-2 text-sm text-ink-secondary">
          <Loader2 size={20} className="animate-spin text-brand" /> Loading profile...
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-canvas p-4 sm:p-6">
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-primary">
            Profile Settings
          </h1>
          <p className="mt-1 text-xs text-ink-secondary">
            Manage your cashier profile and account details.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-status-dangerText/20 bg-status-dangerBg px-4 py-3 text-sm text-status-dangerText">
            <AlertCircle size={16} /> {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 rounded-xl border border-status-successText/20 bg-status-successBg px-4 py-3 text-sm text-status-successText">
            <CheckCircle2 size={16} /> {success}
          </div>
        )}

        <Card className="space-y-4">
          <h2 className="flex items-center gap-2 border-b border-divider pb-2 text-sm font-bold text-ink-primary">
            <User size={14} className="text-brand" /> Account Details
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
                  disabled
                />
                <Input label="Role" value={userSettings.role ?? ""} disabled />
                <div className="space-y-1.5">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-ink-secondary">
                    Status
                  </span>
                  <div className="flex items-center gap-2 px-3.5 py-2.5 text-sm text-ink-primary">
                    <span
                      className={`h-2 w-2 rounded-full ${userSettings.is_active ? "bg-brand" : "bg-ink-secondary"}`}
                    />
                    {userSettings.is_active ? "Active" : "Inactive"}
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  disabled={saving}
                  icon={
                    saving ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Save size={16} />
                    )
                  }
                  onClick={() => void updateUser({ username, email })}
                >
                  {saving ? "Saving..." : "Save Profile"}
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-ink-secondary">
              User profile data not found.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
};
