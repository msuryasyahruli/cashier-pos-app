import { useCallback, useMemo } from "react";
import { useStore } from "../context/StoreContext";
import {
  DEFAULT_CURRENCY,
  DEFAULT_EXCHANGE_RATES,
  convertFromIdr,
  convertToIdr,
  formatCurrency,
  formatDisplayAmount,
  formatInputAmount,
  getCurrencyMeta,
  getExchangeRate,
  type CurrencyCode,
  type CurrencyMeta,
  type ExchangeRatesMap,
} from "../utils/currency";

export interface UseCurrencyReturn {
  currency: CurrencyCode;
  currencyMeta: CurrencyMeta;
  exchangeRate: number;
  exchangeRates: Record<CurrencyCode, number>;
  /** Convert from base IDR and format with active currency symbol */
  format: (amountIdr: number) => string;
  /** Format an amount that is already in the active display currency */
  formatDisplay: (displayAmount: number) => string;
  /** Convert from base IDR to active display currency number */
  toDisplay: (amountIdr: number) => number;
  /** Convert from active display currency number to base IDR */
  fromDisplay: (displayAmount: number) => number;
  /** Convert from base IDR to plain numeric string for <input type="number"> */
  formatInput: (amountIdr: number) => string;
}

export const useCurrency = (): UseCurrencyReturn => {
  const { currentStore } = useStore();

  const currency: CurrencyCode = useMemo(
    () => getCurrencyMeta(currentStore?.currency || DEFAULT_CURRENCY).code,
    [currentStore?.currency],
  );

  const currencyMeta: CurrencyMeta = useMemo(
    () => getCurrencyMeta(currency),
    [currency],
  );

  const exchangeRates: Record<CurrencyCode, number> = useMemo(() => {
    const custom: ExchangeRatesMap = currentStore?.exchange_rates || {};
    return {
      ...DEFAULT_EXCHANGE_RATES,
      ...custom,
      IDR: 1,
    };
  }, [currentStore?.exchange_rates]);

  const exchangeRate: number = useMemo(
    () => getExchangeRate(currency, exchangeRates),
    [currency, exchangeRates],
  );

  const format = useCallback(
    (amountIdr: number) => formatCurrency(amountIdr, currency, exchangeRates),
    [currency, exchangeRates],
  );

  const formatDisplay = useCallback(
    (displayAmount: number) => formatDisplayAmount(displayAmount, currency),
    [currency],
  );

  const toDisplay = useCallback(
    (amountIdr: number) => convertFromIdr(amountIdr, currency, exchangeRates),
    [currency, exchangeRates],
  );

  const fromDisplay = useCallback(
    (displayAmount: number) =>
      convertToIdr(displayAmount, currency, exchangeRates),
    [currency, exchangeRates],
  );

  const formatInput = useCallback(
    (amountIdr: number) =>
      formatInputAmount(amountIdr, currency, exchangeRates),
    [currency, exchangeRates],
  );

  return {
    currency,
    currencyMeta,
    exchangeRate,
    exchangeRates,
    format,
    formatDisplay,
    toDisplay,
    fromDisplay,
    formatInput,
  };
};

