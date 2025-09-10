import { useEffect, useState, useCallback, useRef } from 'react';
import { 
  getBatchedPriceUpdater, 
  getPerformanceMonitor,
  initializeBatchedUpdates,
  BatchedPriceUpdater,
  PriceUpdatePerformanceMonitor 
} from '@/lib/performance/batched-updates';
import { storeEvents } from '@/stores/middleware';

/**
 * Hook for managing performance optimizations in trading components
 */
export const usePerformanceOptimizations = (config?: {
  batchInterval?: number;
  maxBatchSize?: number;
  highPrioritySymbols?: string[];
  autoInit?: boolean;
}) => {
  const [updater] = useState<BatchedPriceUpdater>(() => 
    getBatchedPriceUpdater(config)
  );
  const [monitor] = useState<PriceUpdatePerformanceMonitor>(() => 
    getPerformanceMonitor()
  );
  
  const [performanceMetrics, setPerformanceMetrics] = useState(() => 
    monitor.getMetrics()
  );
  const [batchStats, setBatchStats] = useState(() => 
    updater.getStats()
  );
  
  // Auto-initialize if requested
  useEffect(() => {
    if (config?.autoInit !== false) {
      initializeBatchedUpdates(config);
    }
  }, [config]);
  
  // Subscribe to performance updates
  useEffect(() => {
    const unsubscribeSnapshot = storeEvents.subscribe('performance:snapshot', () => {
      setPerformanceMetrics(monitor.getMetrics());
    });
    
    const unsubscribeBatch = storeEvents.subscribe('performance:batch-completed', () => {
      setBatchStats(updater.getStats());
    });
    
    return () => {
      unsubscribeSnapshot();
      unsubscribeBatch();
    };
  }, [monitor, updater]);
  
  // Manual control functions
  const flushUpdates = useCallback(() => {
    updater.flushUpdates();
  }, [updater]);
  
  const updateConfig = useCallback((newConfig: {
    batchInterval?: number;
    maxBatchSize?: number;
    highPrioritySymbols?: string[];
  }) => {
    updater.updateConfig(newConfig);
    setBatchStats(updater.getStats());
  }, [updater]);
  
  const queuePriceUpdate = useCallback((
    symbol: string, 
    price: number, 
    metadata?: any
  ) => {
    updater.queuePriceUpdate(symbol, price, metadata);
  }, [updater]);
  
  return {
    // Performance data
    performanceMetrics,
    batchStats,
    performanceHistory: monitor.getHistory(),
    
    // Control functions
    flushUpdates,
    updateConfig,
    queuePriceUpdate,
    
    // Raw instances for advanced usage
    updater,
    monitor,
  };
};

/**
 * Hook for components that need to optimize their own rendering based on performance
 */
export const useRenderOptimization = (options?: {
  skipRenderThreshold?: number; // Skip renders if updates/sec exceed this
  throttleMs?: number; // Minimum time between renders
}) => {
  const { performanceMetrics } = usePerformanceOptimizations();
  const lastRenderTime = useRef<number>(Date.now());
  const skipRenderThreshold = options?.skipRenderThreshold || 100;
  const throttleMs = options?.throttleMs || 16; // ~60fps
  
  const shouldSkipRender = useCallback(() => {
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTime.current;
    
    // Skip if we're rendering too frequently
    if (timeSinceLastRender < throttleMs) {
      return true;
    }
    
    // Skip if system is under heavy load
    if (performanceMetrics.averageUpdatesPerSecond > skipRenderThreshold) {
      return Math.random() > 0.5; // Skip 50% of renders during high load
    }
    
    lastRenderTime.current = now;
    return false;
  }, [performanceMetrics, skipRenderThreshold, throttleMs]);
  
  const markRender = useCallback(() => {
    lastRenderTime.current = Date.now();
  }, []);
  
  return {
    shouldSkipRender,
    markRender,
    isHighLoad: performanceMetrics.averageUpdatesPerSecond > skipRenderThreshold,
    performanceMetrics,
  };
};

/**
 * Hook for debouncing high-frequency updates
 */
export const useDebouncedPriceUpdates = (
  symbol: string,
  interval: number = 100
) => {
  const [debouncedPrice, setDebouncedPrice] = useState<number | null>(null);
  const [updateCount, setUpdateCount] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const latestPrice = useRef<number | null>(null);
  
  const updatePrice = useCallback((price: number) => {
    latestPrice.current = price;
    setUpdateCount(prev => prev + 1);
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      if (latestPrice.current !== null) {
        setDebouncedPrice(latestPrice.current);
      }
    }, interval);
  }, [interval]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return {
    debouncedPrice,
    updatePrice,
    updateCount,
    isPending: timeoutRef.current !== null,
  };
};

/**
 * Hook for monitoring component performance
 */
export const useComponentPerformance = (componentName: string) => {
  const renderCount = useRef(0);
  const mountTime = useRef(Date.now());
  const lastRenderTime = useRef(Date.now());
  
  // Increment render count
  useEffect(() => {
    renderCount.current++;
    lastRenderTime.current = Date.now();
  });
  
  const getPerformanceStats = useCallback(() => {
    const now = Date.now();
    const lifetime = now - mountTime.current;
    const timeSinceLastRender = now - lastRenderTime.current;
    
    return {
      componentName,
      renderCount: renderCount.current,
      lifetime,
      timeSinceLastRender,
      averageRenderInterval: lifetime / renderCount.current,
    };
  }, [componentName]);
  
  const logPerformance = useCallback(() => {
    const stats = getPerformanceStats();
    console.log(`Component Performance [${componentName}]:`, stats);
  }, [componentName, getPerformanceStats]);
  
  return {
    getPerformanceStats,
    logPerformance,
    renderCount: renderCount.current,
  };
};

/**
 * Hook for adaptive performance based on device capabilities
 */
export const useAdaptivePerformance = () => {
  const [deviceCapabilities, setDeviceCapabilities] = useState(() => {
    // Initial device capability assessment
    const cores = navigator.hardwareConcurrency || 2;
    const memory = (navigator as any).deviceMemory || 4; // GB
    const connection = (navigator as any).connection;
    
    return {
      cores,
      memory,
      connectionSpeed: connection?.effectiveType || 'unknown',
      isLowEnd: cores <= 2 || memory <= 2,
    };
  });
  
  const getOptimalBatchConfig = useCallback(() => {
    const { isLowEnd, cores, memory } = deviceCapabilities;
    
    if (isLowEnd) {
      return {
        batchInterval: 200, // Longer batching for low-end devices
        maxBatchSize: 25, // Smaller batches
        highPrioritySymbols: ['BTC-USD'], // Only most important
      };
    }
    
    return {
      batchInterval: 50, // Faster batching for high-end devices
      maxBatchSize: 100, // Larger batches
      highPrioritySymbols: ['BTC-USD', 'ETH-USD', 'SOL-USD', 'AVAX-USD'],
    };
  }, [deviceCapabilities]);
  
  const shouldUseVirtualization = useCallback((itemCount: number) => {
    if (deviceCapabilities.isLowEnd) {
      return itemCount > 50; // Use virtualization earlier on low-end devices
    }
    return itemCount > 200;
  }, [deviceCapabilities]);
  
  return {
    deviceCapabilities,
    getOptimalBatchConfig,
    shouldUseVirtualization,
    isLowEndDevice: deviceCapabilities.isLowEnd,
  };
};