'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useUIStore } from '@/stores';
import { websocketManager } from '@/services/websocket/websocket-manager';
import { hyperliquidAPI } from '@/services/api/hyperliquid-api';
import { cn } from '@/lib/utils';
import { Toaster } from 'react-hot-toast';
import { MainContent } from './MainContent';



interface TradingLayoutProps {
  children?: React.ReactNode;
}

export function TradingLayout({ children }: TradingLayoutProps) {
  const {
    sidebarWidth,
    bottomPanelHeight,
  } = useUIStore();
  
  // Temporary hardcoded values until UI store is properly configured
  const sidebarCollapsed = true;
  const theme = 'system';
  
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  
  // Initialize connections and data on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        setIsInitializing(true);
        setInitError(null);
        
        // Initialize API and load initial market data
        await hyperliquidAPI.initialize();
        
        // Connect to WebSocket for real-time updates
        await websocketManager.connect();
        
        // Subscribe to essential data feeds
        websocketManager.subscribeToAllMids();
        
        setIsInitializing(false);
      } catch (error) {
        console.error('Failed to initialize trading platform:', error);
        setInitError(error instanceof Error ? error.message : 'Initialization failed');
        setIsInitializing(false);
      }
    };
    
    initialize();
    
    // Cleanup on unmount
    return () => {
      websocketManager.disconnect();
    };
  }, []);
  
  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches 
        ? 'dark' 
        : 'light';
      root.classList.toggle('dark', systemTheme === 'dark');
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
  }, [theme]);
  
  // Show loading state during initialization
  if (isInitializing) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center space-y-4">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          <div className="text-sm text-muted-foreground">
            Initializing trading platform...
          </div>
        </div>
      </div>
    );
  }
  
  // Show error state if initialization failed
  if (initError) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-destructive text-lg">⚠️ Initialization Failed</div>
          <div className="text-sm text-muted-foreground">{initError}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-screen w-full bg-white dark:bg-gray-900 text-foreground">
      {/* Main Layout Grid */}
      <div 
        className="h-full transition-all duration-300 ease-in-out"
      > 
        {/* Main Trading Area */}
        <motion.div
          className="bg-white dark:bg-gray-900"
          style={{ gridArea: 'main' }}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <MainContent>
            {children}
          </MainContent>
        </motion.div>
      </div>
      
     
      
      {/* Global Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          className: cn(
            'bg-card border border-gray-200 dark:border-gray-800 text-card-foreground shadow-lg',
            'dark:bg-card dark:border-gray-200 dark:border-gray-800 dark:text-card-foreground'
          ),
          success: {
            iconTheme: {
              primary: 'hsl(var(--success))',
              secondary: 'white',
            },
          },
          error: {
            iconTheme: {
              primary: 'hsl(var(--destructive))',
              secondary: 'white',
            },
          },
        }}
      />
    </div>
  );
}
export default TradingLayout;