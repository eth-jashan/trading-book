import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility for merging Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let isThrottled = false;
  
  return (...args: Parameters<T>) => {
    if (!isThrottled) {
      func(...args);
      isThrottled = true;
      setTimeout(() => {
        isThrottled = false;
      }, delay);
    }
  };
}

/**
 * Sleep utility
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// This generateId function is defined below with more options

/**
 * Deep clone object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as unknown as T;
  if (typeof obj === 'object') {
    const clonedObj = {} as { [key in keyof T]: T[key] };
    for (const key in obj) {
      clonedObj[key] = deepClone(obj[key]);
    }
    return clonedObj;
  }
  return obj;
}

/**
 * Check if value is empty (null, undefined, empty string, empty array, empty object)
 */
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * Capitalize first letter
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert camelCase to kebab-case
 */
export function camelToKebab(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Convert kebab-case to camelCase
 */
export function kebabToCamel(str: string): string {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

/**
 * Get nested object value safely
 */
export function get(obj: any, path: string, defaultValue?: any): any {
  const keys = path.split('.');
  let result = obj;
  
  for (const key of keys) {
    if (result == null || typeof result !== 'object') {
      return defaultValue;
    }
    result = result[key];
  }
  
  return result === undefined ? defaultValue : result;
}

/**
 * Set nested object value
 */
export function set(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
}

/**
 * Create range array
 */
export function range(start: number, end?: number, step: number = 1): number[] {
  if (end === undefined) {
    end = start;
    start = 0;
  }
  
  const result: number[] = [];
  for (let i = start; i < end; i += step) {
    result.push(i);
  }
  
  return result;
}

/**
 * Group array by key
 */
export function groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const key = keyFn(item);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

/**
 * Unique array values
 */
export function unique<T>(array: T[]): T[] {
  return Array.from(new Set(array));
}

/**
 * Sort array by multiple keys
 */
export function sortBy<T>(
  array: T[], 
  ...sortKeys: Array<keyof T | ((item: T) => any)>
): T[] {
  return [...array].sort((a, b) => {
    for (const key of sortKeys) {
      let aVal: any;
      let bVal: any;
      
      if (typeof key === 'function') {
        aVal = key(a);
        bVal = key(b);
      } else {
        aVal = a[key];
        bVal = b[key];
      }
      
      if (aVal < bVal) return -1;
      if (aVal > bVal) return 1;
    }
    return 0;
  });
}

/**
 * Calculate percentage
 */
export function percentage(value: number, total: number): number {
  if (total === 0) return 0;
  return (value / total) * 100;
}

/**
 * Clamp number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Linear interpolation
 */
export function lerp(start: number, end: number, factor: number): number {
  return start + (end - start) * factor;
}

/**
 * Map value from one range to another
 */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

/**
 * Check if element is in viewport
 */
export function isInViewport(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Download data as file
 */
export function downloadFile(data: string, filename: string, type: string = 'text/plain'): void {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format URL parameters
 */
export function formatUrlParams(params: Record<string, any>): string {
  return Object.entries(params)
    .filter(([_, value]) => value !== null && value !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

/**
 * Parse URL parameters
 */
export function parseUrlParams(search: string): Record<string, string> {
  const params: Record<string, string> = {};
  const urlParams = new URLSearchParams(search);
  
  for (const [key, value] of urlParams.entries()) {
    params[key] = value;
  }
  
  return params;
}

/**
 * Generate unique ID with optional prefix
 */
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2);
  return prefix ? `${prefix}_${timestamp}_${randomStr}` : `${timestamp}_${randomStr}`;
}

/**
 * Calculate P&L for a position
 */
export function calculatePnL(
  entryPrice: number,
  currentPrice: number,
  size: number,
  side: 'long' | 'short',
  leverage: number = 1
): { 
  pnl: number; 
  pnlPercentage: number; // ROI based on margin
  priceChangePercent: number; // Price movement percentage
} {
  let pnl: number;
  
  if (side === 'long') {
    pnl = (currentPrice - entryPrice) * size;
  } else {
    pnl = (entryPrice - currentPrice) * size;
  }
  
  // Calculate margin used (position value / leverage)
  const marginUsed = (entryPrice * size) / leverage;
  
  // P&L percentage is ROI on margin (what traders actually care about)
  const pnlPercentage = marginUsed > 0 ? (pnl / marginUsed) * 100 : 0;
  
  // Price change percentage (for reference)
  const priceChangePercent = entryPrice > 0 ? ((currentPrice - entryPrice) / entryPrice) * 100 : 0;
  
  return { pnl, pnlPercentage, priceChangePercent };
}

/**
 * Calculate liquidation price for a position
 * Uses proper formula considering initial margin and maintenance margin
 */
export function calculateLiquidationPrice(
  entryPrice: number,
  leverage: number,
  side: 'long' | 'short',
  maintenanceMarginRate: number = 0.005 // 0.5% maintenance margin rate (standard for crypto)
): number {
  // Initial margin rate = 1 / leverage
  const initialMarginRate = 1 / leverage;
  
  // Liquidation occurs when losses equal (initial margin - maintenance margin)
  // This gives us more accurate liquidation prices
  
  if (side === 'long') {
    // Long position liquidates when price drops by (initial margin - maintenance margin)
    return entryPrice * (1 - initialMarginRate + maintenanceMarginRate);
  } else {
    // Short position liquidates when price rises by (initial margin - maintenance margin)
    return entryPrice * (1 + initialMarginRate - maintenanceMarginRate);
  }
}

/**
 * Calculate required margin for a position
 */
export function calculateRequiredMargin(
  size: number,
  price: number,
  leverage: number = 1
): number {
  return (size * price) / leverage;
}

/**
 * Calculate ROI (Return on Investment) based on margin
 */
export function calculateROI(
  pnl: number,
  margin: number
): number {
  return margin > 0 ? (pnl / margin) * 100 : 0;
}

/**
 * Calculate position value
 */
export function calculatePositionValue(
  size: number,
  currentPrice: number
): number {
  return size * currentPrice;
}

/**
 * Check if price data is stale
 */
export function isPriceStale(
  timestamp: number,
  maxAge: number = 5000 // 5 seconds
): boolean {
  return Date.now() - timestamp > maxAge;
}

/**
 * Calculate price change percentage
 */
export function calculatePriceChange(newPrice: number, oldPrice: number): number {
  if (oldPrice === 0) return 0;
  return ((newPrice - oldPrice) / oldPrice) * 100;
}

/**
 * Format timestamp to readable string
 */
export function formatTimestamp(timestamp: number, format: 'short' | 'long' = 'short'): string {
  const date = new Date(timestamp);
  
  if (format === 'long') {
    return date.toLocaleString();
  }
  
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  // Less than a minute
  if (diff < 60000) {
    return 'just now';
  }
  
  // Less than an hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes}m ago`;
  }
  
  // Less than a day
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}h ago`;
  }
  
  // Less than a week
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    return `${days}d ago`;
  }
  
  // Older than a week, show date
  return date.toLocaleDateString();
}

/**
 * Format number with currency option
 */
export function formatNumber(
  value: number,
  options: { 
    currency?: boolean;
    decimals?: number;
    compact?: boolean;
  } = {}
): string {
  const { currency = false, decimals = 2, compact = false } = options;
  
  // Handle null, undefined, or NaN values
  if (value == null || isNaN(value)) {
    return currency ? '$0.00' : '0.00';
  }
  
  let formatted: string;
  
  if (compact && Math.abs(value) >= 1000) {
    // Use compact notation for large numbers
    if (Math.abs(value) >= 1e9) {
      formatted = (value / 1e9).toFixed(1) + 'B';
    } else if (Math.abs(value) >= 1e6) {
      formatted = (value / 1e6).toFixed(1) + 'M';
    } else if (Math.abs(value) >= 1e3) {
      formatted = (value / 1e3).toFixed(1) + 'K';
    } else {
      formatted = value.toFixed(decimals);
    }
  } else {
    formatted = value.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    });
  }
  
  return currency ? `$${formatted}` : formatted;
}

/**
 * Storage utilities
 */
export const storage = {
  get: (key: string): any => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  },
  
  set: (key: string, value: any): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  },
  
  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to remove from localStorage:', error);
    }
  },
  
  clear: (): void => {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
  },
};