export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  low_stock_threshold: number;
  barcode: number;
}

export interface InventoryFormState {
  sku: string;
  name: string;
  category: string;
  price: string;
  stock: string;
  low_stock_threshold: string;
  barcode: string;
}

export const CATEGORIES = ["Coffee", "Tea", "Bakery", "Food", "Beverage"];

export const EMPTY_FORM: InventoryFormState = {
  sku: "",
  name: "",
  category: "",
  price: "",
  stock: "",
  low_stock_threshold: "",
  barcode: "",
};
