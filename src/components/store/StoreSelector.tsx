import React, { useState, useRef, useEffect } from "react";
import { Store, ChevronDown, Check, Plus } from "lucide-react";
import { useStore } from "../../context/StoreContext";
import { Badge } from "../Badge";
import { CreateStoreModal } from "./CreateStoreModal";

export const StoreSelector: React.FC = () => {
  const { currentStore, stores, selectStore, loading } = useStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  if (loading && !currentStore) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-xl animate-pulse text-xs text-slate-400">
        <Store size={14} />
        <span>Loading store...</span>
      </div>
    );
  }

  if (!currentStore && stores.length === 0) {
    return (
      <>
        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 rounded-xl text-xs font-semibold transition-all shadow-xs"
        >
          <Plus size={14} />
          <span>Set Up Store</span>
        </button>
        <CreateStoreModal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
        />
      </>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setDropdownOpen((prev) => !prev)}
        className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-800 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-100"
        title="Switch or manage active store"
      >
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <Store size={14} className="text-indigo-600 shrink-0" />
          <span className="font-semibold text-slate-900 max-w-[130px] sm:max-w-[180px] truncate">
            {currentStore?.name || "Select Store"}
          </span>
          {currentStore?.branch_code && (
            <Badge variant="neutral" size="sm" className="hidden sm:inline-flex py-0 px-1.5 text-[10px]">
              {currentStore.branch_code}
            </Badge>
          )}
        </div>
        <ChevronDown
          size={13}
          className={`text-slate-400 transition-transform duration-200 ${
            dropdownOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Floating Store Dropdown */}
      {dropdownOpen && (
        <div className="absolute left-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 border-b border-slate-100">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Active Store
            </p>
          </div>

          <div className="max-h-56 overflow-y-auto py-1">
            {stores.map((s) => {
              const isSelected = s.id === currentStore?.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    selectStore(s.id);
                    setDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-colors ${
                    isSelected
                      ? "bg-indigo-50/70 text-indigo-900 font-semibold"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Store
                      size={14}
                      className={
                        isSelected ? "text-indigo-600" : "text-slate-400"
                      }
                    />
                    <div className="truncate">
                      <p className="truncate">{s.name}</p>
                      {s.branch_code && (
                        <p className="text-[10px] text-slate-400">
                          Branch: {s.branch_code}
                        </p>
                      )}
                    </div>
                  </div>
                  {isSelected && (
                    <Check size={14} className="text-indigo-600 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="pt-1 border-t border-slate-100 px-1.5">
            <button
              type="button"
              onClick={() => {
                setDropdownOpen(false);
                setCreateModalOpen(true);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-indigo-600 hover:bg-indigo-50/60 rounded-lg font-medium transition-colors"
            >
              <Plus size={14} />
              <span>Create New Store</span>
            </button>
          </div>
        </div>
      )}

      <CreateStoreModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </div>
  );
};

