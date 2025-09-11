'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/stores';
import { Card, CardContent } from '@/components/ui/card';
import { TradingChart } from '@/components/chart/TradingChart';
import { TradingPanel } from '@/components/trading/TradingPanel';
import { PositionsList } from '@/components/trading/PositionsList';
import { ChartInterval } from '@/types/chart.types';
import { AssetSelectorDropdown } from '../trading/AssetSelectorDropdown';
import { BottomPanel } from './BottomPanel';
import { Button } from '@/components/ui/button';
import { TrendingUp, X, BarChart3 } from 'lucide-react';

interface MainContentProps {
  children?: React.ReactNode;
}

export function MainContent({ children }: MainContentProps) {
  const { selectedSymbol } = useUIStore();
  const [chartInterval, setChartInterval] = useState<ChartInterval>('15m');
  const [isMobileTradingOpen, setIsMobileTradingOpen] = useState(false);
  
  if (children) {
    return (
      <div className="h-full overflow-auto">
        {children}
      </div>
    );
  }
  
  return (
    <div className="h-full">
      <motion.div
        className="h-full flex"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {selectedSymbol ? (
          <div className='flex w-full flex-row h-screen relative'>
            {/* Left Panel - Chart Area (fills remaining space) */}
            <div className="flex-1 p-4 lg:pr-0 overflow-scroll">
              <div className="mb-4 lg:pr-4">
                <AssetSelectorDropdown />
              </div>
              <TradingChart
                symbol={selectedSymbol}
                interval={chartInterval}
                onIntervalChange={setChartInterval}
                className="h-[50%]"
                height={typeof window !== 'undefined' ? window.innerHeight - 500 : 600}
              />
              <BottomPanel />
            </div>
            
            {/* Desktop Right Panel - Trading Controls (hidden on mobile/tablet) */}
            <div className="hidden lg:flex w-[400px] flex-shrink-0 bg-background border-l border-border/30 shadow-xl overflow-scroll">
              <div className="space-y-3 p-4">
                <TradingPanel className="h-fit" />
                <PositionsList className="h-fit" maxHeight="350px" />
              </div>
            </div>

            {/* Floating Trade Button (visible on mobile/tablet) */}
            <motion.div
              className="lg:hidden fixed bottom-6 right-6 z-50"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                onClick={() => setIsMobileTradingOpen(true)}
                className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-2xl shadow-blue-500/25 border-0"
                size="icon"
              >
                <TrendingUp className="h-6 w-6" />
              </Button>
            </motion.div>

            {/* Mobile Trading Modal/Drawer */}
            <AnimatePresence>
              {isMobileTradingOpen && (
                <>
                  {/* Backdrop */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                    onClick={() => setIsMobileTradingOpen(false)}
                  />
                  
                  {/* Trading Panel Drawer */}
                  <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'tween', duration: 0.3 }}
                    className="lg:hidden fixed right-0 top-0 bottom-0 w-[85%] max-w-[400px] bg-background border-l border-border/30 shadow-2xl z-50 overflow-hidden"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-border/30 bg-background/80 backdrop-blur-sm">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-600/10">
                          <BarChart3 className="h-5 w-5 text-blue-500" />
                        </div>
                        <span className="font-semibold">Trading Panel</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsMobileTradingOpen(false)}
                        className="h-8 w-8 rounded-full"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Content */}
                    <div className="overflow-y-auto h-full pb-20">
                      <div className="space-y-4 p-4">
                        <TradingPanel className="h-fit" />
                        <PositionsList className="h-fit" maxHeight="300px" />
                      </div>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
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