//@ts-nocheck
import { unstable_batchedUpdates } from 'react-dom';
import { useMarketStore } from '@/stores/market/market.store';
import { storeEvents, STORE_EVENTS } from '@/stores/middleware';

/**
 * Performance optimization service for batching high-frequency price updates
 * Prevents UI from being overwhelmed by rapid price changes
 */
export class BatchedPriceUpdater {
  private updateQueue = new Map<string, number>();
  private metadataQueue = new Map<string, Partial<{
    volume24h: number;
    high24h: number;
    low24h: number;
    change24h: number;
    changePercent24h: number;
    bid: number;
    ask: number;
    spread: number;
  }>>();
  private flushTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  
  // Configuration
  private readonly batchInterval: number;
  private readonly maxBatchSize: number;
  private readonly highPrioritySymbols: Set<string>;
  
  constructor(options: {
    batchInterval?: number;
    maxBatchSize?: number;
    highPrioritySymbols?: string[];
  } = {}) {
    this.batchInterval = options.batchInterval || 100; // 100ms batching
    this.maxBatchSize = options.maxBatchSize || 50; // Max 50 updates per batch
    this.highPrioritySymbols = new Set(options.highPrioritySymbols || ['BTC-USD', 'ETH-USD', 'SOL-USD']);
    
    this.startBatchTimer();
  }
  
  /**
   * Queue a price update for batching
   */
  queuePriceUpdate(symbol: string, price: number, metadata?: Partial<{
    volume24h: number;
    high24h: number;
    low24h: number;
    change24h: number;
    changePercent24h: number;
    bid: number;
    ask: number;
    spread: number;
  }>) {
    // Validate inputs
    if (!symbol || typeof price !== 'number' || price <= 0) {
      console.warn('Invalid price update data:', { symbol, price });
      return;
    }
    
    // Queue the update
    this.updateQueue.set(symbol, price);
    
    if (metadata) {
      const existing = this.metadataQueue.get(symbol) || {};
      this.metadataQueue.set(symbol, { ...existing, ...metadata });
    }
    
    // Process immediately for high-priority symbols or if queue is getting large
    if (this.shouldProcessImmediately(symbol)) {
      this.flushUpdates();
    }
  }
  
  /**
   * Queue multiple price updates at once
   */
  queueBulkPriceUpdates(updates: Array<{
    symbol: string;
    price: number;
    metadata?: Partial<{
      volume24h: number;
      high24h: number;
      low24h: number;
      change24h: number;
      changePercent24h: number;
      bid: number;
      ask: number;
      spread: number;
    }>;
  }>) {
    updates.forEach(({ symbol, price, metadata }) => {
      this.queuePriceUpdate(symbol, price, metadata);
    });
  }
  
  /**
   * Force immediate flush of pending updates
   */
  flushUpdates() {
    if (this.isProcessing || (this.updateQueue.size === 0 && this.metadataQueue.size === 0)) {
      return;
    }
    
    this.isProcessing = true;
    
    try {
      // Get current queued updates
      const priceUpdates = new Map(this.updateQueue);
      const metadataUpdates = new Map(this.metadataQueue);
      
      // Clear queues
      this.updateQueue.clear();
      this.metadataQueue.clear();
      
      // Batch React updates to prevent excessive re-renders
      unstable_batchedUpdates(() => {
        this.processUpdates(priceUpdates, metadataUpdates);
      });
      
      // Emit batch completion event with performance metrics
      storeEvents.emit('performance:batch-completed', {
        priceUpdatesCount: priceUpdates.size,
        metadataUpdatesCount: metadataUpdates.size,
        timestamp: Date.now(),
      });
      
    } catch (error) {
      console.error('Error processing batched updates:', error);
      
      // Re-queue failed updates (with reduced priority to prevent infinite loops)
      setTimeout(() => {
        this.updateQueue = new Map([...this.updateQueue, ...priceUpdates]);
        this.metadataQueue = new Map([...this.metadataQueue, ...metadataUpdates]);
      }, 1000);
    } finally {
      this.isProcessing = false;
    }
  }
  
  /**
   * Process the actual price updates in the market store
   */
  private processUpdates(
    priceUpdates: Map<string, number>,
    metadataUpdates: Map<string, Partial<any>>
  ) {
    const marketStore = useMarketStore.getState();
    
    // Sort updates by priority (high-priority symbols first)
    const sortedUpdates = Array.from(priceUpdates.entries()).sort(([symbolA], [symbolB]) => {
      const priorityA = this.highPrioritySymbols.has(symbolA) ? 0 : 1;
      const priorityB = this.highPrioritySymbols.has(symbolB) ? 0 : 1;
      return priorityA - priorityB;
    });
    
    // Process updates in batches to prevent UI blocking
    const batchSize = Math.min(this.maxBatchSize, sortedUpdates.length);
    
    for (let i = 0; i < sortedUpdates.length; i += batchSize) {
      const batch = sortedUpdates.slice(i, i + batchSize);
      
      batch.forEach(([symbol, price]) => {
        const metadata = metadataUpdates.get(symbol) || {};
        
        // Update price in market store
        marketStore.updatePrice(symbol, {
          price,
          ...metadata,
        });
        
        // Emit individual price update event (throttled)
        storeEvents.emit(STORE_EVENTS.PRICE_UPDATE, {
          symbol,
          price,
          change: metadata.changePercent24h || 0,
          timestamp: Date.now(),
        });
      });
      
      // Yield control back to the event loop between batches
      if (i + batchSize < sortedUpdates.length) {
        setTimeout(() => {}, 0);
      }
    }
  }
  
  /**
   * Determine if we should process updates immediately
   */
  private shouldProcessImmediately(symbol: string): boolean {
    return (
      this.highPrioritySymbols.has(symbol) || // High priority symbol
      this.updateQueue.size >= this.maxBatchSize || // Queue is getting full
      this.hasStaleUpdates() // Some updates are getting old
    );
  }
  
  /**
   * Check if there are updates that have been waiting too long
   */
  private hasStaleUpdates(): boolean {
    // For now, we rely on the batch timer, but could add timestamp tracking here
    return false;
  }
  
  /**
   * Start the batch timer
   */
  private startBatchTimer() {
    this.flushTimer = setInterval(() => {
      this.flushUpdates();
    }, this.batchInterval);
  }
  
  /**
   * Stop the batch timer
   */
  private stopBatchTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }
  
  /**
   * Update configuration
   */
  updateConfig(config: {
    batchInterval?: number;
    maxBatchSize?: number;
    highPrioritySymbols?: string[];
  }) {
    if (config.batchInterval) {
      this.batchInterval = config.batchInterval;
      this.stopBatchTimer();
      this.startBatchTimer();
    }
    
    if (config.maxBatchSize) {
      this.maxBatchSize = config.maxBatchSize;
    }
    
    if (config.highPrioritySymbols) {
      this.highPrioritySymbols.clear();
      config.highPrioritySymbols.forEach(symbol => {
        this.highPrioritySymbols.add(symbol);
      });
    }
  }
  
  /**
   * Get performance statistics
   */
  getStats() {
    return {
      queuedPriceUpdates: this.updateQueue.size,
      queuedMetadataUpdates: this.metadataQueue.size,
      isProcessing: this.isProcessing,
      batchInterval: this.batchInterval,
      maxBatchSize: this.maxBatchSize,
      highPrioritySymbols: Array.from(this.highPrioritySymbols),
    };
  }
  
  /**
   * Clear all pending updates
   */
  clear() {
    this.updateQueue.clear();
    this.metadataQueue.clear();
  }
  
  /**
   * Cleanup resources
   */
  destroy() {
    this.stopBatchTimer();
    this.clear();
  }
}

/**
 * Advanced performance monitor for tracking update performance
 */
export class PriceUpdatePerformanceMonitor {
  private updateCounts = new Map<string, number>();
  private lastUpdateTimes = new Map<string, number>();
  private performanceHistory: Array<{
    timestamp: number;
    updatesPerSecond: number;
    averageLatency: number;
    peakMemoryUsage: number;
  }> = [];
  
  private monitorInterval: NodeJS.Timeout | null = null;
  
  constructor(private options = { monitoringInterval: 5000 }) {
    this.startMonitoring();
  }
  
  /**
   * Record a price update
   */
  recordUpdate(symbol: string, latency?: number) {
    const now = Date.now();
    
    // Update counters
    this.updateCounts.set(symbol, (this.updateCounts.get(symbol) || 0) + 1);
    this.lastUpdateTimes.set(symbol, now);
    
    // Record performance data
    if (latency !== undefined) {
      this.recordLatency(symbol, latency);
    }
  }
  
  /**
   * Record latency for performance tracking
   */
  private recordLatency(symbol: string, latency: number) {
    // Store latency data (could be enhanced with more sophisticated tracking)
    if (latency > 100) { // Warn on high latency
      console.warn(`High price update latency for ${symbol}: ${latency}ms`);
    }
  }
  
  /**
   * Start performance monitoring
   */
  private startMonitoring() {
    this.monitorInterval = setInterval(() => {
      this.capturePerformanceSnapshot();
    }, this.options.monitoringInterval);
  }
  
  /**
   * Capture a performance snapshot
   */
  private capturePerformanceSnapshot() {
    const now = Date.now();
    const totalUpdates = Array.from(this.updateCounts.values()).reduce((sum, count) => sum + count, 0);
    const updatesPerSecond = totalUpdates / (this.options.monitoringInterval / 1000);
    
    // Calculate memory usage (if available)
    const memoryUsage = (performance as any).memory?.usedJSHeapSize || 0;
    
    const snapshot = {
      timestamp: now,
      updatesPerSecond,
      averageLatency: 0, // Would need more sophisticated latency tracking
      peakMemoryUsage: memoryUsage,
    };
    
    this.performanceHistory.push(snapshot);
    
    // Keep only last 100 snapshots
    if (this.performanceHistory.length > 100) {
      this.performanceHistory = this.performanceHistory.slice(-100);
    }
    
    // Reset counters
    this.updateCounts.clear();
    
    // Emit performance event
    storeEvents.emit('performance:snapshot', snapshot);
  }
  
  /**
   * Get current performance metrics
   */
  getMetrics() {
    const recent = this.performanceHistory.slice(-10);
    
    if (recent.length === 0) {
      return {
        averageUpdatesPerSecond: 0,
        averageLatency: 0,
        memoryUsage: 0,
        trend: 'stable' as const,
      };
    }
    
    const avgUPS = recent.reduce((sum, s) => sum + s.updatesPerSecond, 0) / recent.length;
    const avgLatency = recent.reduce((sum, s) => sum + s.averageLatency, 0) / recent.length;
    const memoryUsage = recent[recent.length - 1]?.peakMemoryUsage || 0;
    
    // Determine trend
    let trend: 'improving' | 'stable' | 'degrading' = 'stable';
    if (recent.length >= 3) {
      const earlyAvg = recent.slice(0, 3).reduce((sum, s) => sum + s.updatesPerSecond, 0) / 3;
      const lateAvg = recent.slice(-3).reduce((sum, s) => sum + s.updatesPerSecond, 0) / 3;
      
      if (lateAvg > earlyAvg * 1.1) trend = 'improving';
      else if (lateAvg < earlyAvg * 0.9) trend = 'degrading';
    }
    
    return {
      averageUpdatesPerSecond: Math.round(avgUPS * 100) / 100,
      averageLatency: Math.round(avgLatency * 100) / 100,
      memoryUsage,
      trend,
    };
  }
  
  /**
   * Get performance history
   */
  getHistory() {
    return [...this.performanceHistory];
  }
  
  /**
   * Stop monitoring
   */
  destroy() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    
    this.updateCounts.clear();
    this.lastUpdateTimes.clear();
    this.performanceHistory = [];
  }
}

// Global instances
let batchedUpdater: BatchedPriceUpdater | null = null;
let performanceMonitor: PriceUpdatePerformanceMonitor | null = null;

/**
 * Get or create the global batched price updater
 */
export const getBatchedPriceUpdater = (config?: {
  batchInterval?: number;
  maxBatchSize?: number;
  highPrioritySymbols?: string[];
}): BatchedPriceUpdater => {
  if (!batchedUpdater) {
    batchedUpdater = new BatchedPriceUpdater(config);
  }
  return batchedUpdater;
};

/**
 * Get or create the global performance monitor
 */
export const getPerformanceMonitor = (): PriceUpdatePerformanceMonitor => {
  if (!performanceMonitor) {
    performanceMonitor = new PriceUpdatePerformanceMonitor();
  }
  return performanceMonitor;
};

/**
 * Initialize batched updates system
 */
export const initializeBatchedUpdates = (config?: {
  batchInterval?: number;
  maxBatchSize?: number;
  highPrioritySymbols?: string[];
}) => {
  const updater = getBatchedPriceUpdater(config);
  const monitor = getPerformanceMonitor();
  
  console.log('Batched price updates system initialized with config:', updater.getStats());
  
  // Subscribe to WebSocket events to intercept price updates
  storeEvents.subscribe(STORE_EVENTS.PRICE_UPDATE, (data: any) => {
    monitor.recordUpdate(data.symbol, data.latency);
  });
  
  return {
    updater,
    monitor,
  };
};

/**
 * Clean up batched updates system
 */

export const cleanupBatchedUpdates = () => {
  if (batchedUpdater) {
    batchedUpdater.destroy();
    batchedUpdater = null;
  }
  
  if (performanceMonitor) {
    performanceMonitor.destroy();
    performanceMonitor = null;
  }
};