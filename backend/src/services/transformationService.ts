export function normalizeCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): number {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  // Simple static FX rates simulation
  const rates: Record<string, number> = {
    USD: 1,
    EUR: 1.1,
    GBP: 1.3,
  };

  const fromRate = rates[fromCurrency] ?? 1;
  const toRate = rates[toCurrency] ?? 1;

  const amountInUsd = amount / fromRate;
  const converted = amountInUsd * toRate;
  return Math.round(converted * 100) / 100;
}

export function standardizeDate(input: string | Date): Date {
  if (input instanceof Date) {
    return input;
  }
  return new Date(input);
}

export function removeDuplicatesBy<T, K extends keyof any>(
  items: T[],
  keySelector: (item: T) => K
): T[] {
  const seen = new Set<K>();
  const result: T[] = [];
  for (const item of items) {
    const key = keySelector(item);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

