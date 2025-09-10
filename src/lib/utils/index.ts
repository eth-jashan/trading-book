import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistance, isToday, isYesterday } from 'date-fns';

/**
 * Utility function to merge class names with tailwindcss-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format numbers with proper decimal places and locale
 */
export function formatNumber(
  value: number,
  options: {
    decimals?: number;
    compact?: boolean;
    currency?: boolean;
    sign?: boolean;
    percentage?: boolean;
  } = {}
): string {
  const {
    decimals = 2,
    compact = false,
    currency = false,
    sign = false,
    percentage = false,
  } = options;

  if (isNaN(value) || !isFinite(value)) {
    return '—';
  }

  let formattedValue: string;

  if (percentage) {
    formattedValue = new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value / 100);
  } else if (currency) {
    formattedValue = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      notation: compact ? 'compact' : 'standard',
    }).format(value);
  } else {
    formattedValue = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      notation: compact ? 'compact' : 'standard',
    }).format(value);
  }

  if (sign && value > 0 && !currency && !percentage) {
    formattedValue = `+${formattedValue}`;
  }

  return formattedValue;
}

/**
 * Format price with appropriate decimal places
 */
export function formatPrice(price: number, symbol?: string): string {
  if (isNaN(price) || !isFinite(price)) {
    return '—';
  }

  let decimals = 2;

  // Adjust decimals based on price magnitude or symbol
  if (symbol) {
    if (symbol.includes('BTC') || symbol.includes('ETH')) {
      decimals = price > 100 ? 2 : 4;
    } else if (price < 0.01) {
      decimals = 6;
    } else if (price < 1) {
      decimals = 4;
    }
  } else {
    if (price < 0.01) {
      decimals = 6;
    } else if (price < 1) {
      decimals = 4;
    } else if (price > 1000) {
      decimals = 2;
    }
  }

  return formatNumber(price, { decimals, currency: true });
}

/**
 * Format percentage with color coding
 */
export function formatPercentage(
  value: number,
  options: { decimals?: number; sign?: boolean } = {}
): { value: string; color: 'success' | 'danger' | 'neutral' } {
  const { decimals = 2, sign = true } = options;
  
  const formatted = formatNumber(value, { decimals, percentage: true, sign });
  
  let color: 'success' | 'danger' | 'neutral' = 'neutral';
  if (value > 0) color = 'success';
  else if (value < 0) color = 'danger';
  
  return { value: formatted, color };
}

/**
 * Format volume with compact notation
 */
export function formatVolume(volume: number): string {
  if (volume === 0) return '—';
  
  return formatNumber(volume, { 
    compact: true, 
    decimals: volume < 1000 ? 2 : 1 
  });
}

/**
 * Format timestamp for trading context
 */
export function formatTimestamp(
  timestamp: number,
  options: { relative?: boolean; includeTime?: boolean } = {}
): string {
  const { relative = false, includeTime = true } = options;
  const date = new Date(timestamp);
  
  if (relative) {
    if (isToday(date)) {
      return format(date, 'HH:mm:ss');
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'HH:mm')}`;
    } else {
      return formatDistance(date, new Date(), { addSuffix: true });
    }
  }
  
  const timeFormat = includeTime ? 'MMM dd, HH:mm:ss' : 'MMM dd, yyyy';
  return format(date, timeFormat);
}

/**
 * Calculate price change percentage
 */
export function calculatePriceChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Calculate position PnL
 */
export function calculatePnL(
  entryPrice: number,
  currentPrice: number,
  size: number,
  side: 'long' | 'short'
): { pnl: number; pnlPercentage: number } {
  let pnl: number;
  
  if (side === 'long') {
    pnl = (currentPrice - entryPrice) * size;
  } else {
    pnl = (entryPrice - currentPrice) * size;
  }
  
  const pnlPercentage = ((pnl / (entryPrice * size)) * 100);
  
  return { pnl, pnlPercentage };
}

/**
 * Calculate liquidation price
 */
export function calculateLiquidationPrice(
  entryPrice: number,
  leverage: number,
  side: 'long' | 'short'
): number {
  const maintenanceMargin = 0.01; // 1% maintenance margin
  
  if (side === 'long') {
    return entryPrice * (1 - (1 / leverage) + maintenanceMargin);
  } else {
    return entryPrice * (1 + (1 / leverage) - maintenanceMargin);
  }
}

/**
 * Calculate required margin
 */
export function calculateRequiredMargin(
  size: number,
  price: number,
  leverage: number
): number {
  return (size * price) / leverage;
}

/**
 * Validate order parameters
 */
export function validateOrderSize(
  size: number,
  minSize: number,
  maxSize: number
): ValidationResult {
  if (size <= 0) {
    return { isValid: false, error: 'Size must be greater than 0' };
  }
  
  if (size < minSize) {
    return { 
      isValid: false, 
      error: `Size must be at least ${formatNumber(minSize, { decimals: 8 })}` 
    };
  }
  
  if (size > maxSize) {
    return { 
      isValid: false, 
      error: `Size cannot exceed ${formatNumber(maxSize, { compact: true })}` 
    };
  }
  
  return { isValid: true };
}

/**
 * Generate unique ID
 */
export function generateId(prefix = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): T {
  let timeout: NodeJS.Timeout;
  
  return ((...args: unknown[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: unknown[]) => void>(
  func: T,
  limit: number
): T {
  let inThrottle: boolean;
  
  return ((...args: unknown[]) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  }) as T;
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Safe JSON parse
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Get price color based on change
 */
export function getPriceColor(change: number): 'success' | 'danger' | 'neutral' {
  if (change > 0) return 'success';
  if (change < 0) return 'danger';
  return 'neutral';
}

/**
 * Clamp number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Round to nearest tick size
 */
export function roundToTickSize(value: number, tickSize: number): number {
  return Math.round(value / tickSize) * tickSize;
}

/**
 * Check if market is open (crypto is always open, but useful for future expansion)
 */
export function isMarketOpen(): boolean {
  return true; // Crypto markets are 24/7
}

/**
 * Calculate spread percentage
 */
export function calculateSpreadPercentage(bid: number, ask: number): number {
  if (bid === 0 || ask === 0) return 0;
  return ((ask - bid) / bid) * 100;
}

interface ValidationResult {
  isValid: boolean;
  error?: string;
}