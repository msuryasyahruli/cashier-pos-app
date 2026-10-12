import React from "react";
import { Card, Button, Input } from "../components";
import { Save } from "lucide-react";

export const SettingsPage: React.FC = () => {
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

      <Card className="space-y-4">
        <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
          Store Information
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Store Name" defaultValue="DODOKO Cafe & Bakery" />
          <Input label="Store Branch Code" defaultValue="DDK-46" />
          <Input
            label="Receipt Footer Note"
            defaultValue="Thank you for visiting us! Have a great day."
          />
          <Input
            label="Default Sales Tax Rate (%)"
            defaultValue="5.0"
            type="number"
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
            />
            <span>Automatically trigger cash drawer open on cash checkout</span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span>
              Auto-print paper receipt upon successful card transaction
            </span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span>Enable sound feedback on barcode scan</span>
          </label>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button icon={<Save size={16} />}>Save Settings</Button>
      </div>
    </div>
  );
};
