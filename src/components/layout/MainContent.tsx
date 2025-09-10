'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useUIStore } from '@/stores';
import { Card, CardContent } from '@/components/ui/card';
import { TradingChart } from '@/components/chart/TradingChart';
import { TradingPanel } from '@/components/trading/TradingPanel';
import { PositionsList } from '@/components/trading/PositionsList';
import { ChartInterval } from '@/types/chart.types';

interface MainContentProps {
  children?: React.ReactNode;
}

export function MainContent({ children }: MainContentProps) {
  const { selectedSymbol } = useUIStore();
  const [chartInterval, setChartInterval] = useState<ChartInterval>('15m');
  
  if (children) {
    return (
      <div className="h-full overflow-auto">
        {children}
      </div>
    );
  }
  
  return (
    <div className="h-full overflow-hidden">
      <motion.div
        className="h-full flex"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {selectedSymbol ? (
          <>
            {/* Left Panel - Chart Area (fills remaining space) */}
            <div className="flex-1 min-w-0 overflow-hidden p-4 pr-0">
              <TradingChart
                symbol={selectedSymbol}
                interval={chartInterval}
                onIntervalChange={setChartInterval}
                className="h-full"
                height={typeof window !== 'undefined' ? window.innerHeight - 120 : 600}
              />
            </div>
            
            {/* Right Panel - Trading Controls (fixed width, no gap) */}
            <div className="w-[400px] flex-shrink-0 overflow-auto bg-background border-l border-border/30 shadow-xl">
              <div className="space-y-3 p-4">
                <TradingPanel className="h-fit" />
                <PositionsList className="h-fit" maxHeight="350px" />
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1">
            <Card className="h-full">
              <CardContent className="p-6 h-full flex items-center justify-center">
                <div className="text-center space-y-6 max-w-md">
                  <div className="w-24 h-24 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl flex items-center justify-center mx-auto">
                    <svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="space-y-3">
                    <h2 className="text-3xl font-bold text-foreground">Welcome to HyperTrade</h2>
                    <p className="text-lg text-muted-foreground">
                      Professional paper trading platform with real-time market data
                    </p>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                      Select a symbol from the sidebar to access advanced trading tools, 
                      live charts, and portfolio management features
                    </p>
                  </div>
                  
                  {/* Feature highlights */}
                  <div className="grid grid-cols-2 gap-4 pt-6">
                    <div className="text-center p-4 rounded-lg bg-muted/30 border border-border/20">
                      <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mx-auto mb-2">
                        <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                      </div>
                      <div className="text-sm font-medium">Real-time Data</div>
                      <div className="text-xs text-muted-foreground">Live price feeds</div>
                    </div>
                    
                    <div className="text-center p-4 rounded-lg bg-muted/30 border border-border/20">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mx-auto mb-2">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012-2m0 0v6a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H9a2 2 0 00-2 2z" />
                        </svg>
                      </div>
                      <div className="text-sm font-medium">Paper Trading</div>
                      <div className="text-xs text-muted-foreground">Risk-free practice</div>
                    </div>
                    
                    <div className="text-center p-4 rounded-lg bg-muted/30 border border-border/20">
                      <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mx-auto mb-2">
                        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M trending-up" />
                          <polyline points="23,6 13.5,15.5 8.5,10.5 1,18" />
                          <polyline points="17,6 23,6 23,12" />
                        </svg>
                      </div>
                      <div className="text-sm font-medium">Advanced Charts</div>
                      <div className="text-xs text-muted-foreground">Professional analysis</div>
                    </div>
                    
                    <div className="text-center p-4 rounded-lg bg-muted/30 border border-border/20">
                      <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center mx-auto mb-2">
                        <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                      </div>
                      <div className="text-sm font-medium">Risk Management</div>
                      <div className="text-xs text-muted-foreground">Portfolio protection</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </motion.div>
    </div>
  );
}