import React from "react";
import { Badge, Card } from "../";
import { Plus, Check } from "lucide-react";
import type { Product } from "../../configs/hooks/useCart";

interface ProductCardProps {
  product: Product;
  inCartQuantity?: number;
  onAddToCart: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  inCartQuantity = 0,
  onAddToCart,
}) => {
  const isOutOfStock = product.stock <= 0;
  const isLowStock =
    product.stock > 0 && product.stock <= (product.low_stock_threshold || 5);

  return (
    <Card
      hoverable={!isOutOfStock}
      onClick={() => !isOutOfStock && onAddToCart(product)}
      className={`flex flex-col justify-between relative group transition-all ${
        isOutOfStock
          ? "opacity-60 grayscale cursor-not-allowed"
          : "cursor-pointer"
      } ${
        inCartQuantity > 0
          ? "ring-2 ring-indigo-500 border-transparent shadow-md"
          : ""
      }`}
    >
      {inCartQuantity > 0 && (
        <div className="absolute top-2.5 right-2.5 bg-indigo-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full z-10 flex items-center gap-1 shadow-sm">
          <Check size={12} /> {inCartQuantity}
        </div>
      )}

      <div>
        <div className="flex items-start justify-between gap-1.5 mb-2 flex-wrap">
          <Badge variant="neutral" size="sm" className="text-[10px]">
            {product.category}
          </Badge>
          {isOutOfStock ? (
            <Badge variant="danger" size="sm" className="text-[10px]">
              Sold Out
            </Badge>
          ) : isLowStock ? (
            <Badge variant="warning" size="sm" className="text-[10px]">
              Low ({product.stock})
            </Badge>
          ) : (
            <Badge variant="success" size="sm" className="text-[10px]">
              Stock: {product.stock}
            </Badge>
          )}
        </div>

        <h3 className="font-bold text-sm text-slate-800 line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors">
          {product.name}
        </h3>
        <p className="text-[11px] text-slate-400 font-mono mt-1 truncate">
          Bar: {product.barcode}
        </p>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="text-xs text-slate-400 font-medium">Price</span>
          <p className="text-sm sm:text-base font-extrabold text-slate-900 font-mono">
            ${product.price.toFixed(2)}
          </p>
        </div>

        <button
          type="button"
          disabled={isOutOfStock || inCartQuantity >= product.stock}
          className="shrink-0 p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white disabled:opacity-40 disabled:hover:bg-indigo-50 disabled:hover:text-indigo-600 transition-colors"
          title={isOutOfStock ? "Out of stock" : "Add to order"}
        >
          <Plus size={16} />
        </button>
      </div>
    </Card>
  );
};
