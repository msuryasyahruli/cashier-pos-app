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
      <div className="flex items-center gap-2 px-3 py-1.5 bg-canvas rounded-xl animate-pulse text-xs text-ink-secondary">
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
          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-tint hover:bg-brand-ring/50 text-brand-tintText border border-brand-ring rounded-xl text-xs font-semibold transition-all shadow-xs"
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
        className="flex items-center gap-2 px-2.5 py-1.5 bg-surface-hover hover:bg-canvas border border-divider rounded-xl text-xs font-medium text-ink-primary transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-ring"
        title="Switch or manage active store"
      >
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse shrink-0" />
          <Store size={14} className="text-brand shrink-0" />
          <span className="font-semibold text-ink-primary max-w-[130px] sm:max-w-[180px] truncate">
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
          className={`text-ink-secondary transition-transform duration-200 ${
            dropdownOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Floating Store Dropdown */}
      {dropdownOpen && (
        <div className="absolute left-0 mt-1.5 w-64 bg-surface border border-divider rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 border-b border-divider">
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-secondary">
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
                      ? "bg-brand-tint text-brand-tintText font-semibold"
                      : "text-ink-primary hover:bg-surface-hover"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Store
                      size={14}
                      className={
                        isSelected ? "text-brand-tintText" : "text-ink-secondary"
                      }
                    />
                    <div className="truncate">
                      <p className="truncate">{s.name}</p>
                      {s.branch_code && (
                        <p className="text-[10px] text-ink-secondary">
                          Branch: {s.branch_code}
                        </p>
                      )}
                    </div>
                  </div>
                  {isSelected && (
                    <Check size={14} className="text-brand-tintText shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="pt-1 border-t border-divider px-1.5">
            <button
              type="button"
              onClick={() => {
                setDropdownOpen(false);
                setCreateModalOpen(true);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-brand hover:bg-brand-tint rounded-lg font-medium transition-colors"
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

