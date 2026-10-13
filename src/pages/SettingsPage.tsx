import React, { useState, useEffect } from "react";
import { Card, Button, Input } from "../components";
import {
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  User,
  Store,
} from "lucide-react";
import { useStoreSettings, useUserSettings } from "../configs/hooks";

export const SettingsPage: React.FC = () => {
  const { store, loading, saving, error, success, updateStore } =
    useStoreSettings();
  const {
    userSettings,
    loading: userLoading,
    saving: userSaving,
    error: userError,
    success: userSuccess,
    updateUser,
  } = useUserSettings();

  // Store form state
  const [name, setName] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [receiptFooterNote, setReceiptFooterNote] = useState("");
  const [defaultSalesTaxRate, setDefaultSalesTaxRate] = useState("");

  // User form state
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");

  // Sync store state
  useEffect(() => {
    if (store) {
      setName(store.name ?? "");
      setBranchCode(store.branch_code ?? "");
      setReceiptFooterNote(store.receipt_footer_note ?? "");
      setDefaultSalesTaxRate(
        store.default_sales_tax_rate != null
          ? String(store.default_sales_tax_rate)
          : "",
      );
    }
  }, [store]);

  // Sync user state
  useEffect(() => {
    if (userSettings) {
      setUsername(userSettings.username ?? "");
      setEmail(userSettings.email ?? "");
      setRole(userSettings.role ?? "");
    }
  }, [userSettings]);

  const handleSaveStore = async () => {
    await updateStore({
      name,
      branch_code: branchCode,
      receipt_footer_note: receiptFooterNote,
      default_sales_tax_rate: parseFloat(defaultSalesTaxRate) || 0,
    });
  };

  const handleSaveUser = async () => {
    await updateUser({
      username,
      email,
    });
  };

  const isLoading = loading || userLoading;

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="flex-1 p-8 bg-slate-50 overflow-y-auto flex items-center justify-center">
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 bg-slate-50 overflow-y-auto space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Terminal Settings
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Configure cashier terminal, receipts, and tax calculations
        </p>
      </div>

      {/* Store status messages */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* User status messages */}
      {userError && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle size={16} className="shrink-0" />
          <span>{userError}</span>
        </div>
      )}
      {userSuccess && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{userSuccess}</span>
        </div>
      )}

      {/* User Profile Section */}
      <Card className="space-y-4">
        <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
          <User size={14} className="text-indigo-500" />
          User Profile
        </h2>
        {userSettings ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. johndoe"
              />
              <Input
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. john@example.com"
                type="email"
              />
              <Input
                label="Role"
                value={userSettings.role ?? ""}
                disabled
                className="bg-slate-50 cursor-not-allowed"
              />
              <div className="w-full space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Status
                </label>
                <div className="flex items-center gap-2 px-3.5 py-2.5">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      userSettings.is_active ? "bg-emerald-500" : "bg-slate-400"
                    }`}
                  />
                  <span className="text-sm text-slate-700">
                    {userSettings.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                icon={
                  userSaving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Save size={16} />
                  )
                }
                onClick={handleSaveUser}
                disabled={userSaving}
                size="sm"
              >
                {userSaving ? "Saving..." : "Update Profile"}
              </Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-500">User profile data not found.</p>
        )}
      </Card>

      {/* Store Information Section */}
      {store ? (
        <>
          <Card className="space-y-4">
            <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
              <Store size={14} className="text-indigo-500" />
              Store Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Store Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. My Store"
                disabled={role !== "admin"}
              />
              <Input
                label="Store Branch Code"
                value={branchCode}
                onChange={(e) => setBranchCode(e.target.value)}
                placeholder="e.g. STR-01"
                disabled={role !== "admin"}
              />
              <Input
                label="Receipt Footer Note"
                value={receiptFooterNote}
                onChange={(e) => setReceiptFooterNote(e.target.value)}
                placeholder="e.g. Thank you for visiting!"
                disabled={role !== "admin"}
              />
              <Input
                label="Default Sales Tax Rate (%)"
                value={defaultSalesTaxRate}
                onChange={(e) => setDefaultSalesTaxRate(e.target.value)}
                type="number"
                placeholder="e.g. 5.0"
                disabled={role !== "admin"}
              />
            </div>
          </Card>

          <Card className="space-y-4">
            <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
              Hardware & Peripherals
            </h2>
            <div className="space-y-3 text-xs text-slate-700">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                  disabled={role !== "admin"}
                />
                <span>
                  Automatically trigger cash drawer open on cash checkout
                </span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                  disabled={role !== "admin"}
                />
                <span>
                  Auto-print paper receipt upon successful card transaction
                </span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                  disabled={role !== "admin"}
                />
                <span>Enable sound feedback on barcode scan</span>
              </label>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button
              icon={
                saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )
              }
              onClick={handleSaveStore}
              disabled={saving || role !== "admin"}
            >
              {saving ? "Saving..." : "Save Store Settings"}
            </Button>
          </div>
        </>
      ) : (
        <Card className="text-center space-y-3">
          <AlertCircle size={40} className="text-amber-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-800">No Store Found</h2>
          <p className="text-sm text-slate-500">
            There is no store associated with your account yet. Please contact
            your administrator to set up a store.
          </p>
        </Card>
      )}
    </div>
  );
};
