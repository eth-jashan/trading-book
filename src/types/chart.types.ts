export interface CandleData {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface HyperliquidCandle {
  T: number;    // End time (epoch milliseconds)
  c: string;    // Close price
  h: string;    // High price
  i: string;    // Interval
  l: string;    // Low price
  n: number;    // Number of trades
  o: string;    // Open price
  s: string;    // Symbol
  t: number;    // Start time (epoch milliseconds)
  v: string;    // Volume
}

export type ChartInterval = '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '8h' | '12h' | '1d' | '3d' | '1w' | '1M';

export interface ChartTimeframe {
  label: string;
  value: ChartInterval;
  seconds: number;
}

export const CHART_TIMEFRAMES: ChartTimeframe[] = [
  { label: '1m', value: '1m', seconds: 60 },
  { label: '5m', value: '5m', seconds: 300 },
  { label: '15m', value: '15m', seconds: 900 },
  { label: '1H', value: '1h', seconds: 3600 },
  { label: '4H', value: '4h', seconds: 14400 },
  { label: '1D', value: '1d', seconds: 86400 },
];

export interface ChartTheme {
  backgroundColor: string;
  textColor: string;
  gridColor: string;
  upColor: string;
  downColor: string;
  borderUpColor: string;
  borderDownColor: string;
  wickUpColor: string;
  wickDownColor: string;
  volumeUpColor: string;
  volumeDownColor: string;
}