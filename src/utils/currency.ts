export type CurrencyCode =
  | "IDR"
  | "USD"
  | "EUR"
  | "SGD"
  | "MYR"
  | "JPY"
  | "GBP"
  | "AUD";

export type ExchangeRatesMap = Partial<Record<CurrencyCode, number>>;

export interface CurrencyMeta {
  code: CurrencyCode;
  symbol: string;
  name: string;
  locale: string;
  fractionDigits: number;
  defaultRateInIdr: number;
  quickCashSteps: number[];
}

export const DEFAULT_CURRENCY: CurrencyCode = "IDR";

export const SUPPORTED_CURRENCIES: CurrencyMeta[] = [
  {
    code: "IDR",
    symbol: "Rp",
    name: "Indonesian Rupiah",
    locale: "id-ID",
    fractionDigits: 0,
    defaultRateInIdr: 1,
    quickCashSteps: [5000, 10000, 20000, 50000, 100000],
  },
  {
    code: "USD",
    symbol: "$",
    name: "US Dollar",
    locale: "en-US",
    fractionDigits: 2,
    defaultRateInIdr: 16000,
    quickCashSteps: [5, 10, 20, 50, 100],
  },
  {
    code: "EUR",
    symbol: "€",
    name: "Euro",
    locale: "de-DE",
    fractionDigits: 2,
    defaultRateInIdr: 17500,
    quickCashSteps: [5, 10, 20, 50, 100],
  },
  {
    code: "SGD",
    symbol: "S$",
    name: "Singapore Dollar",
    locale: "en-SG",
    fractionDigits: 2,
    defaultRateInIdr: 12000,
    quickCashSteps: [5, 10, 20, 50, 100],
  },
  {
    code: "MYR",
    symbol: "RM",
    name: "Malaysian Ringgit",
    locale: "ms-MY",
    fractionDigits: 2,
    defaultRateInIdr: 3600,
    quickCashSteps: [5, 10, 20, 50, 100],
  },
  {
    code: "JPY",
    symbol: "¥",
    name: "Japanese Yen",
    locale: "ja-JP",
    fractionDigits: 0,
    defaultRateInIdr: 105,
    quickCashSteps: [500, 1000, 2000, 5000, 10000],
  },
  {
    code: "GBP",
    symbol: "£",
    name: "British Pound",
    locale: "en-GB",
    fractionDigits: 2,
    defaultRateInIdr: 20500,
    quickCashSteps: [5, 10, 20, 50, 100],
  },
  {
    code: "AUD",
    symbol: "A$",
    name: "Australian Dollar",
    locale: "en-AU",
    fractionDigits: 2,
    defaultRateInIdr: 10500,
    quickCashSteps: [5, 10, 20, 50, 100],
  },
];

export const DEFAULT_EXCHANGE_RATES: Record<CurrencyCode, number> = {
  IDR: 1,
  USD: 16000,
  EUR: 17500,
  SGD: 12000,
  MYR: 3600,
  JPY: 105,
  GBP: 20500,
  AUD: 10500,
};

export const getCurrencyMeta = (code?: string | null): CurrencyMeta => {
  const upper = (code || DEFAULT_CURRENCY).toUpperCase();
  return (
    SUPPORTED_CURRENCIES.find((c) => c.code === upper) ||
    SUPPORTED_CURRENCIES[0]
  );
};

export const getExchangeRate = (
  code?: CurrencyCode | string | null,
  customRates?: ExchangeRatesMap | null,
): number => {
  const meta = getCurrencyMeta(code);
  if (meta.code === "IDR") return 1;
  const custom = customRates?.[meta.code];
  if (typeof custom === "number" && Number.isFinite(custom) && custom > 0) {
    return custom;
  }
  return meta.defaultRateInIdr;
};

/**
 * Convert an amount stored in base IDR to the target display currency.
 */
export const convertFromIdr = (
  amountIdr: number,
  code?: CurrencyCode | string | null,
  customRates?: ExchangeRatesMap | null,
): number => {
  const safeIdr = Number.isFinite(amountIdr) ? amountIdr : 0;
  const rate = getExchangeRate(code, customRates);
  return safeIdr / rate;
};

/**
 * Convert an amount entered in the active display currency back to base IDR.
 */
export const convertToIdr = (
  displayAmount: number,
  code?: CurrencyCode | string | null,
  customRates?: ExchangeRatesMap | null,
): number => {
  const safeDisplay = Number.isFinite(displayAmount) ? displayAmount : 0;
  const rate = getExchangeRate(code, customRates);
  return safeDisplay * rate;
};

/**
 * Format an amount already in the target display currency.
 */
export const formatDisplayAmount = (
  displayAmount: number,
  code?: CurrencyCode | string | null,
): string => {
  const meta = getCurrencyMeta(code);
  const safeAmount = Number.isFinite(displayAmount) ? displayAmount : 0;
  const factor = Math.pow(10, meta.fractionDigits);
  const rounded = Math.round(safeAmount * factor) / factor;

  try {
    return new Intl.NumberFormat(meta.locale, {
      style: "currency",
      currency: meta.code,
      minimumFractionDigits: meta.fractionDigits,
      maximumFractionDigits: meta.fractionDigits,
    }).format(rounded);
  } catch {
    return `${meta.symbol}${rounded.toFixed(meta.fractionDigits)}`;
  }
};

/**
 * Convert an amount from base IDR and format it in the target display currency.
 */
export const formatCurrency = (
  amountIdr: number,
  code?: CurrencyCode | string | null,
  customRates?: ExchangeRatesMap | null,
): string => {
  const converted = convertFromIdr(amountIdr, code, customRates);
  return formatDisplayAmount(converted, code);
};

/**
 * Format a base IDR amount as a plain number string in the active display currency
 * suitable for `<input type="number" />`.
 */
export const formatInputAmount = (
  amountIdr: number,
  code?: CurrencyCode | string | null,
  customRates?: ExchangeRatesMap | null,
): string => {
  const meta = getCurrencyMeta(code);
  const converted = convertFromIdr(amountIdr, code, customRates);
  const factor = Math.pow(10, meta.fractionDigits);
  const rounded = Math.round(converted * factor) / factor;
  return rounded.toFixed(meta.fractionDigits);
};

/**
 * Generate quick-tender cash button amounts in the active display currency.
 */
export const getQuickCashAmounts = (
  totalDisplayAmount: number,
  code?: CurrencyCode | string | null,
): number[] => {
  const meta = getCurrencyMeta(code);
  const factor = Math.pow(10, meta.fractionDigits);
  const exactTotal = Math.max(
    0,
    Math.round((Number.isFinite(totalDisplayAmount) ? totalDisplayAmount : 0) * factor) /
      factor,
  );

  const candidates: number[] = [exactTotal];
  for (const step of meta.quickCashSteps) {
    if (step > 0) {
      const roundedUp = Math.ceil(exactTotal / step) * step;
      if (roundedUp >= exactTotal) {
        candidates.push(roundedUp);
      }
      if (step >= exactTotal) {
        candidates.push(step);
      }
    }
  }

  return candidates
    .filter((val, idx, self) => val >= exactTotal && self.indexOf(val) === idx)
    .sort((a, b) => a - b)
    .slice(0, 6);
};

