/**
 * Formatting utilities for numbers, prices, and percentages
 */

interface FormatOptions {
  compact?: boolean;
  decimals?: number;
  currency?: string;
  showSign?: boolean;
}

/**
 * Format a price with appropriate decimal places
 */
export const formatPrice = (
  price: number | null | undefined,
  options: FormatOptions = {}
): string => {
  if (price === null || price === undefined || isNaN(price)) {
    return '-';
  }
  
  const {
    decimals,
    currency = '',
    compact = false,
  } = options;
  
  let formattedPrice: string;
  
  if (compact && Math.abs(price) >= 1000) {
    return formatNumber(price, { compact: true });
  }
  
  // Determine appropriate decimal places
  let decimalPlaces: number;
  if (decimals !== undefined) {
    decimalPlaces = decimals;
  } else if (price >= 1000) {
    decimalPlaces = 0;
  } else if (price >= 100) {
    decimalPlaces = 1;
  } else if (price >= 1) {
    decimalPlaces = 2;
  } else if (price >= 0.01) {
    decimalPlaces = 4;
  } else if (price >= 0.0001) {
    decimalPlaces = 6;
  } else {
    decimalPlaces = 8;
  }
  
  formattedPrice = price.toFixed(decimalPlaces);
  
  // Remove trailing zeros and decimal point if unnecessary
  formattedPrice = formattedPrice.replace(/\.?0+$/, '');
  
  return currency ? `${currency}${formattedPrice}` : formattedPrice;
};

/**
 * Format a percentage with sign
 */
export const formatPercentage = (
  percentage: number | null | undefined,
  options: FormatOptions = {}
): string => {
  if (percentage === null || percentage === undefined || isNaN(percentage)) {
    return '-';
  }
  
  const {
    decimals = 2,
    showSign = true,
  } = options;
  
  const sign = showSign && percentage > 0 ? '+' : '';
  const formattedValue = percentage.toFixed(decimals);
  
  return `${sign}${formattedValue}%`;
};

/**
 * Format numbers with appropriate suffixes (K, M, B, T)
 */
export const formatNumber = (
  number: number | null | undefined,
  options: FormatOptions = {}
): string => {
  if (number === null || number === undefined || isNaN(number)) {
    return '-';
  }
  
  const {
    compact = false,
    decimals = 2,
    showSign = false,
  } = options;
  
  const sign = showSign && number > 0 ? '+' : '';
  const absNumber = Math.abs(number);
  
  if (!compact || absNumber < 1000) {
    const formatted = number.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    });
    return `${sign}${formatted}`;
  }
  
  const units = [
    { value: 1e12, suffix: 'T' },
    { value: 1e9, suffix: 'B' },
    { value: 1e6, suffix: 'M' },
    { value: 1e3, suffix: 'K' },
  ];
  
  for (const unit of units) {
    if (absNumber >= unit.value) {
      const formatted = (number / unit.value).toFixed(decimals);
      const trimmed = formatted.replace(/\.?0+$/, '');
      return `${sign}${trimmed}${unit.suffix}`;
    }
  }
  
  return `${sign}${number.toFixed(decimals)}`;
};

/**
 * Format volume with appropriate units
 */
export const formatVolume = (
  volume: number | null | undefined,
  options: FormatOptions = {}
): string => {
  return formatNumber(volume, { ...options, compact: true });
};

/**
 * Format market cap
 */
export const formatMarketCap = (
  marketCap: number | null | undefined,
  options: FormatOptions = {}
): string => {
  return formatNumber(marketCap, { ...options, compact: true, currency: '$' });
};

/**
 * Format time duration in human readable format
 */
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${Math.floor(seconds)}s`;
  }
  
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
};

/**
 * Format date in relative terms (e.g., "2 minutes ago")
 */
export const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = Math.floor((now - timestamp) / 1000);
  
  if (diff < 5) {
    return 'just now';
  }
  
  if (diff < 60) {
    return `${diff}s ago`;
  }
  
  if (diff < 3600) {
    const minutes = Math.floor(diff / 60);
    return `${minutes}m ago`;
  }
  
  if (diff < 86400) {
    const hours = Math.floor(diff / 3600);
    return `${hours}h ago`;
  }
  
  const days = Math.floor(diff / 86400);
  if (days < 7) {
    return `${days}d ago`;
  }
  
  // For older dates, return formatted date
  return new Date(timestamp).toLocaleDateString();
};

/**
 * Format file size
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const base = 1024;
  const index = Math.floor(Math.log(bytes) / Math.log(base));
  const size = bytes / Math.pow(base, index);
  
  return `${size.toFixed(1)} ${units[index]}`;
};

/**
 * Format address (truncate middle)
 */
export const formatAddress = (
  address: string,
  startChars: number = 6,
  endChars: number = 4
): string => {
  if (address.length <= startChars + endChars) {
    return address;
  }
  
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
};

/**
 * Format trade size based on asset type
 */
export const formatTradeSize = (
  size: number,
  asset: { symbol: string; type: 'spot' | 'perpetual' },
  options: FormatOptions = {}
): string => {
  const { decimals = 4 } = options;
  
  // For perpetuals, show contracts
  if (asset.type === 'perpetual') {
    return `${formatNumber(size, { decimals })} contracts`;
  }
  
  // For spot, show base asset
  const baseAsset = asset.symbol.split('-')[0] || asset.symbol;
  return `${formatNumber(size, { decimals })} ${baseAsset}`;
};

/**
 * Color-based formatting helpers
 */
export const getPnLColor = (pnl: number): string => {
  if (pnl > 0) return 'text-green-500 dark:text-green-400';
  if (pnl < 0) return 'text-red-500 dark:text-red-400';
  return 'text-muted-foreground';
};

export const getChangeColor = (change: number): string => {
  if (change > 0) return 'text-green-500 dark:text-green-400';
  if (change < 0) return 'text-red-500 dark:text-red-400';
  return 'text-muted-foreground';
};

/**
 * Format large numbers for display in charts/tables
 */
export const formatAxisNumber = (value: number): string => {
  return formatNumber(value, { compact: true, decimals: 1 });
};

/**
 * Format price for order entry (respects tick size)
 */
export const formatPriceForOrder = (
  price: number,
  tickSize: number
): string => {
  const decimalPlaces = Math.max(0, -Math.floor(Math.log10(tickSize)));
  return price.toFixed(decimalPlaces);
};

/**
 * Parse formatted number back to number
 */
export const parseFormattedNumber = (formatted: string): number => {
  // Remove currency symbols, commas, and spaces
  const cleaned = formatted.replace(/[$,\s]/g, '');
  
  // Handle K, M, B, T suffixes
  const multipliers: Record<string, number> = {
    K: 1e3,
    M: 1e6,
    B: 1e9,
    T: 1e12,
  };
  
  const lastChar = cleaned.slice(-1).toUpperCase();
  if (multipliers[lastChar]) {
    const number = parseFloat(cleaned.slice(0, -1));
    return number * multipliers[lastChar];
  }
  
  return parseFloat(cleaned);
};