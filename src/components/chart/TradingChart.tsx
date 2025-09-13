
 'use client';

import React, { useEffect, useRef, useState } from 'react';
import { 
  createChart, 
  ColorType, 
  IChartApi,
  MouseEventParams,
  HistogramSeries,CandlestickSeries
} from 'lightweight-charts';
import { useHyperliquidAPI } from '@/services/api/hyperliquid-api';
import { useWebSocket } from '@/services/websocket/websocket-manager';
import { useMarketStore } from '@/stores/market/market.store';
import { useUIStore } from '@/stores';
import { ChartInterval, CHART_TIMEFRAMES } from '@/types/chart.types';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { LoaderIcon } from 'lucide-react';
import { AssetSelectorDropdown } from '@/components/trading/AssetSelectorDropdown';

interface TradingChartProps {
  symbol: string;
  interval?: ChartInterval;
  className?: string;
  height?: number | 'responsive';
  onIntervalChange?: (interval: ChartInterval) => void;
}

export function TradingChart({ 
  symbol: propSymbol, 
  interval = '15m',
  className,
  height = 'responsive',
  onIntervalChange
}: TradingChartProps) {
  const { selectedSymbol } = useUIStore();
  const symbol = selectedSymbol || propSymbol || 'BTC';
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentInterval, setCurrentInterval] = useState<ChartInterval>(interval);
  const [crosshairData, setCrosshairData] = useState<{
    price: number;
    time: string;
    volume?: number;
  } | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [priceSubscriptionId, setPriceSubscriptionId] = useState<string | null>(null);
  const [isLiveUpdating, setIsLiveUpdating] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [chartHeight, setChartHeight] = useState(500);
  const lastCandleRef = useRef<any>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPriceUpdateRef = useRef<number>(0);
  const UPDATE_THROTTLE_MS = 100; // Throttle updates to max 10 per second for smoother updates
  
  const { getChartCandles, getAllMids } = useHyperliquidAPI();
  const { subscribeToCandles, subscribeToAllMids, unsubscribe, connected } = useWebSocket();
  const marketStore = useMarketStore();
  
  // Handle responsive behavior with debounce to prevent flicker
  useEffect(() => {
    let resizeTimer: NodeJS.Timeout;
    
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      // Debounce height changes to prevent chart flicker
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (height === 'responsive') {
          const newHeight = mobile ? 300 : window.innerHeight < 800 ? 400 : 500;
          setChartHeight(newHeight);
        } else if (typeof height === 'number') {
          setChartHeight(height);
        }
      }, 100); // 100ms debounce
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
    };
  }, [height]);

  // Initialize chart - only recreate when symbol changes, not on height changes
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#6B7280',
      },
      grid: {
        vertLines: {
          color: '#1F2937',
          style: 1,
        },
        horzLines: {
          color: '#1F2937',
          style: 1,
        },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartHeight,
      rightPriceScale: {
        borderColor: '#374151',
        scaleMargins: {
          top: 0.1,
          bottom: 0.25,
        },
      },
      timeScale: {
        borderColor: '#374151',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: 1,
        vertLine: {
          width: 1,
          color: '#6B7280',
          style: 2,
        },
        horzLine: {
          width: 1,
          color: '#6B7280',
          style: 2,
        },
      },
      // watermark is not available in this version
    });

    // Create candlestick series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10B981',
      downColor: '#EF4444',
      borderUpColor: '#10B981',
      borderDownColor: '#EF4444',
      wickUpColor: '#10B981',
      wickDownColor: '#EF4444',
    });

    // Create volume series  
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#374151',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    // Handle crosshair movement
    

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ 
          width: chartContainerRef.current.clientWidth 
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [symbol]); // Remove chartHeight dependency to prevent recreating chart on height changes

  // Update chart height separately without recreating the chart
  useEffect(() => {
    if (chartRef.current && chartContainerRef.current) {
      chartRef.current.applyOptions({
        height: chartHeight,
        width: chartContainerRef.current.clientWidth
      });
    }
  }, [chartHeight]);

  // Store candles data in ref to preserve it across re-renders
  const candlesDataRef = useRef<any[]>([]);
  const volumeDataRef = useRef<any[]>([]);

  // Load candle data
  useEffect(() => {
    const loadData = async () => {
      if (!candleSeriesRef.current || !volumeSeriesRef.current) return;

      setIsLoading(true);
      setError(null);

      try {
        const candles = await getChartCandles(symbol, currentInterval);
        
        if (candles.length === 0) {
          setError('No data available for this symbol');
          return;
        }

        // Store data in refs
        candlesDataRef.current = candles.map(candle => ({
          ...candle,
          time: candle.time as any // Cast to Time type
        }));

        volumeDataRef.current = candles.map(candle => ({
          time: candle.time as any, // Cast to Time type
          value: candle.volume || 0,
          color: candle.close >= candle.open ? '#10B98180' : '#EF444480',
        }));

        // Set candle data
        candleSeriesRef.current.setData(candlesDataRef.current);
        // Set volume data
        volumeSeriesRef.current.setData(volumeDataRef.current);
        
        // Fit content
        chartRef.current?.timeScale().fitContent();
        
        // Sort by time
        const chartCandles = candles.sort((a: any, b: any) => a.time - b.time);
        
        console.log("setting the value.....................",chartCandles)
        // Store last candle for real-time updates
        if (chartCandles.length > 0) {
          lastCandleRef.current = chartCandles[chartCandles.length - 1];
        }
        
        setLastUpdateTime(Date.now());

      } catch (err) {
        console.error('Failed to load chart data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load chart data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [symbol, currentInterval]);

  // Restore data after chart recreation (if needed)
  useEffect(() => {
    if (candleSeriesRef.current && candlesDataRef.current.length > 0) {
      candleSeriesRef.current.setData(candlesDataRef.current);
    }
    if (volumeSeriesRef.current && volumeDataRef.current.length > 0) {
      volumeSeriesRef.current.setData(volumeDataRef.current);
    }
  }, [candleSeriesRef.current, volumeSeriesRef.current]);

  // Subscribe to WebSocket candle updates
  useEffect(() => {
    if (!connected || !symbol || isLoading) return;

    // Unsubscribe from previous subscription
    if (subscriptionId) {
      unsubscribe(subscriptionId);
    }

    // Subscribe to new symbol/interval
    console.log(`Subscribing to WebSocket candles: ${symbol} ${currentInterval}`);
    const newSubId = subscribeToCandles(symbol, currentInterval);
    setSubscriptionId(newSubId);

    return () => {
      if (newSubId) {
        unsubscribe(newSubId);
      }
    };
  }, [symbol, currentInterval, connected, isLoading]);

 
  // Subscribe to real-time price updates
  
  useEffect(() => {
    if (!symbol || isLoading || !candleSeriesRef.current) return;

    let priceSubId: string | null = null;
    let unsubscribePrices: (() => void) | null = null;

    if (connected) {
      // WebSocket is connected - use real-time subscription
      priceSubId = subscribeToAllMids();
      setPriceSubscriptionId(priceSubId);
      setIsLiveUpdating(true);
      console.log("update here.............")
      // Listen for price updates for our symbol
      unsubscribePrices = useMarketStore.subscribe((state) => {
        const price = state.prices.get(symbol);
        if (price && lastCandleRef.current) {
          // Throttle updates to prevent excessive re-renders
          const now = Date.now();
          if (now - lastPriceUpdateRef.current < UPDATE_THROTTLE_MS) {
            return; // Skip this update if too soon
          }
          lastPriceUpdateRef.current = now;
          
          // Update the current candle with the new price
          const updatedCandle = {
            ...lastCandleRef.current,
            close: price.price,
            high: Math.max(lastCandleRef.current.high, price.price),
            low: Math.min(lastCandleRef.current.low, price.price),
          };
          
          // Update the ref with the new candle state
          lastCandleRef.current = updatedCandle;
          console.log("updating chart............",updatedCandle)
          // Update only the last candle
          candleSeriesRef.current?.update(updatedCandle);
          
          // Update volume color based on direction
          const volumeUpdate = {
            time: updatedCandle.time,
            value: updatedCandle.volume || 0,
            color: updatedCandle.close >= updatedCandle.open ? '#10B98180' : '#EF444480',
          };
          volumeSeriesRef.current?.update(volumeUpdate);
        }
      });
    } else {
      // WebSocket disconnected - use polling fallback
      console.log('WebSocket disconnected, starting price polling for chart updates');
      setIsLiveUpdating(false);
      
      const pollPrices = async () => {
        try {
          const mids = await getAllMids();
          const price = mids[symbol];
          
          if (price && lastCandleRef.current) {
            const priceNum = parseFloat(price);
            
            // No need to throttle polling since it's already limited to every 2 seconds
            const updatedCandle = {
              ...lastCandleRef.current,
              close: priceNum,
              high: Math.max(lastCandleRef.current.high, priceNum),
              low: Math.min(lastCandleRef.current.low, priceNum),
            };
            
            // Update the ref with the new candle state
            lastCandleRef.current = updatedCandle;

            // Update only the last candle
            candleSeriesRef.current?.update(updatedCandle);
            
            // Update volume color
            const volumeUpdate = {
              time: updatedCandle.time,
              value: updatedCandle.volume || 0,
              color: updatedCandle.close >= updatedCandle.open ? '#10B98180' : '#EF444480',
            };
            volumeSeriesRef.current?.update(volumeUpdate);
            
            // Update market store with the latest price
            marketStore.updatePrice(symbol, { price: priceNum });
          }
        } catch (error) {
          console.error('Error polling prices:', error);
        }
      };

      // Poll immediately and then every 2 seconds
      pollPrices();
      pollingIntervalRef.current = setInterval(pollPrices, 2000);
    }

    return () => {
      if (priceSubId) {
        unsubscribe(priceSubId);
      }
      if (unsubscribePrices) {
        unsubscribePrices();
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      setIsLiveUpdating(false);
    };
  }, [connected, symbol, isLoading, getAllMids, subscribeToAllMids, unsubscribe]); // Include necessary dependencies

  const handleIntervalChange = (newInterval: ChartInterval) => {
    setCurrentInterval(newInterval);
    onIntervalChange?.(newInterval);
  };

  return (
    <div className={cn("relative bg-gray-900 rounded-lg overflow-hidden", className)}>
      {/* Chart Toolbar */}
      <div className={cn(
        "absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-gray-900 to-transparent",
        isMobile ? "p-2" : "p-4"
      )}>
        {/* Mobile Layout */}
        {isMobile ? (
          <div className="space-y-2">
            {/* First Row: Timeframes */}
            <div className="flex justify-center">
              <div className="flex gap-1 overflow-x-auto scrollbar-hide">
                {CHART_TIMEFRAMES.map((tf) => (
                  <button
                    key={tf.value}
                    onClick={() => handleIntervalChange(tf.value)}
                    className={cn(
                      "px-2 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap flex-shrink-0",
                      currentInterval === tf.value
                        ? "bg-primary text-white"
                        : "bg-white dark:bg-gray-800 text-gray-400 hover:bg-gray-700"
                    )}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Second Row: Status Indicators */}
            <div className="flex items-center justify-center gap-2">
              {/* Live Update Indicator */}
              {isLiveUpdating && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded-full"
                >
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="w-1.5 h-1.5 bg-green-500 rounded-full"
                  />
                  <span className="text-xs font-medium text-green-500">LIVE</span>
                </motion.div>
              )}
              
              {/* Polling Indicator */}
              {!connected && !isLoading && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 rounded-full"
                >
                  <LoaderIcon className="w-2.5 h-2.5 text-yellow-500 animate-spin" />
                  <span className="text-xs font-medium text-yellow-500">Polling</span>
                </motion.div>
              )}
              
              {/* Connection Status */}
              <div className="flex items-center gap-1 px-2 py-1 bg-gray-800 rounded text-xs">
                <div 
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    connected ? "bg-green-500 animate-pulse" : "bg-red-500"
                  )}
                />
                <span className="text-gray-400">
                  {connected ? "Live" : "Offline"}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Desktop Layout */
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Timeframe Selector */}
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {CHART_TIMEFRAMES.map((tf) => (
                    <button
                      key={tf.value}
                      onClick={() => handleIntervalChange(tf.value)}
                      className={cn(
                        "px-3 py-1 text-xs font-medium rounded transition-colors",
                        currentInterval === tf.value
                          ? "bg-primary text-white"
                          : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                      )}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Connection Status & Crosshair Data Display */}
            <div className="flex items-center gap-4">
              {/* Live Update Indicator */}
              {isLiveUpdating && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 px-3 py-1 bg-green-500/20 rounded-full"
                >
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="w-2 h-2 bg-green-500 rounded-full"
                  />
                  <span className="text-xs font-medium text-green-500">LIVE</span>
                </motion.div>
              )}
              
              {/* Polling Indicator */}
              {!connected && !isLoading && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 px-3 py-1 bg-yellow-500/20 rounded-full"
                >
                  <LoaderIcon className="w-3 h-3 text-yellow-500 animate-spin" />
                  <span className="text-xs font-medium text-yellow-500">Polling</span>
                </motion.div>
              )}
              {/* WebSocket Status Indicator */}
              <div className="flex items-center gap-2 px-2 py-1 bg-gray-800 rounded text-xs">
                <div 
                  className={cn(
                    "w-2 h-2 rounded-full",
                    connected ? "bg-green-500 animate-pulse" : "bg-red-500"
                  )}
                />
                <span className="text-gray-400">
                  {connected ? "Live" : "Offline"}
                </span>
                {subscriptionId && (
                  <span className="text-gray-500 ml-2">
                    Candles
                  </span>
                )}
              </div>

              {/* Crosshair Data Display - Hidden on small screens */}
              <AnimatePresence>
                {crosshairData && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="hidden lg:flex items-center gap-4 px-3 py-1 bg-gray-800 rounded text-xs"
                  >
                    <span className="text-gray-400">Price:</span>
                    <span className="font-mono text-white">${crosshairData.price.toFixed(2)}</span>
                    {crosshairData.volume && (
                      <>
                        <span className="text-gray-400">Vol:</span>
                        <span className="font-mono text-white">{crosshairData.volume.toFixed(2)}</span>
                      </>
                    )}
                    <span className="text-gray-400">{crosshairData.time}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Crosshair Data Display */}
      {isMobile && (
        <AnimatePresence>
          {crosshairData && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-20 left-2 right-2 z-10 flex items-center justify-center gap-4 px-3 py-2 bg-gray-800/90 rounded text-xs backdrop-blur-sm"
            >
              <span className="text-gray-400">Price:</span>
              <span className="font-mono text-white">${crosshairData.price.toFixed(2)}</span>
              {crosshairData.volume && (
                <>
                  <span className="text-gray-400">Vol:</span>
                  <span className="font-mono text-white">{crosshairData.volume.toFixed(2)}</span>
                </>
              )}
              <span className="text-gray-400">{crosshairData.time}</span>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Chart Container - using key to prevent re-mount on drawer open */}
      <div 
        ref={chartContainerRef} 
        className="w-full touch-pan-x touch-pan-y"
        style={{ height: chartHeight }}
        key={`chart-${symbol}`} // Stable key to prevent unnecessary re-mounts
      />

      {/* Loading Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-3">
              <LoaderIcon className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm text-gray-400">Loading chart data...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Overlay */}
      <AnimatePresence>
        {error && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-3 p-6 bg-gray-800 rounded-lg">
              <span className="text-red-500 text-sm font-medium">Error loading chart</span>
              <span className="text-xs text-gray-400">{error}</span>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 text-xs bg-primary text-white rounded hover:bg-primary/90"
              >
                Retry
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TradingView Attribution (Required by license) */}
      {/* <div className="absolute bottom-2 right-2 text-xs text-gray-500">
        Powered by <a href="https://www.tradingview.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">TradingView</a>
      </div> */}
    </div>
  );
}