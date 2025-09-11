'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore, useConnectionState } from '@/stores';
import { websocketManager } from '@/services/websocket/websocket-manager';
import { hyperliquidAPI } from '@/services/api/hyperliquid-api';
import { cn } from '@/lib/utils';
import { Toaster } from 'react-hot-toast';

// Import sub-components (we'll create these)
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { MainContent } from './MainContent';
import { RightPanel } from './RightPanel';
import { BottomPanel } from './BottomPanel';
import { TradingPanel } from '../trading/TradingPanel';

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
    <div className="h-screen w-full overflow-hidden bg-white dark:bg-gray-900 text-foreground">
      {/* Main Layout Grid */}
      <div 
        className="grid h-full transition-all duration-300 ease-in-out"
        style={{
          gridTemplateAreas: sidebarCollapsed
            ? `
                "header header"
                "main main"
                "bottom bottom"
              `
            : `
                "sidebar header"
                "sidebar main"
                "sidebar bottom"
              `,
          gridTemplateColumns: sidebarCollapsed 
            ? `0px 1fr`
            : `${sidebarWidth}px 1fr`,
          gridTemplateRows: `60px 1fr ${bottomPanelHeight}px`,
        }}
      >
        {/* Top Navigation Bar */}
        {/* <motion.div 
          className="border-b border-gray-200 dark:border-gray-800 bg-card/50 backdrop-blur-sm"
          style={{ gridArea: 'header' }}
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <TopBar />
        </motion.div> */}
        
        {/* Left Sidebar */}
        {/* <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              className="border-r border-gray-200 dark:border-gray-800 bg-card/30 backdrop-blur-sm"
              style={{ gridArea: 'sidebar' }}
              initial={{ x: -sidebarWidth, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -sidebarWidth, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <Sidebar />
            </motion.div>
          )}
        </AnimatePresence> */}
        
        {/* Main Trading Area */}
        <motion.div
          className="overflow-hidden bg-white dark:bg-gray-900"
          style={{ gridArea: 'main' }}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <MainContent>
            {children}
          </MainContent>
        </motion.div>
        
        {/* Right Panel */}
        {/* <motion.div
          className="border-l border-gray-200 dark:border-gray-800 bg-card/30 backdrop-blur-sm"
          style={{ gridArea: 'right' }}
          initial={{ x: rightPanelWidth, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <div className="w-80 flex-shrink-0 overflow-auto">
              <TradingPanel className="h-fit max-h-full" />
            </div>
        </motion.div> */}
        
        {/* Bottom Panel */}
        {/* <motion.div
          className="border-t border-gray-200 dark:border-gray-800 bg-card/30 backdrop-blur-sm"
          style={{ gridArea: 'bottom' }}
          initial={{ y: bottomPanelHeight, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <BottomPanel />
        </motion.div> */}
      </div>
      
      {/* Connection Status Indicator */}
      {/* <ConnectionIndicator /> */}
      
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
      
      {/* Loading States & Modals would go here */}
    </div>
  );
}

// Connection Status Indicator Component
function ConnectionIndicator() {
  const [connectionState, setConnectionState] = useState(websocketManager.getConnectionState());
  
  useEffect(() => {
    const updateInterval = setInterval(() => {
      setConnectionState(websocketManager.getConnectionState());
    }, 1000);
    
    return () => clearInterval(updateInterval);
  }, []);
  
  if (connectionState.connected) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <motion.div
          className="flex items-center gap-2 px-3 py-2 rounded-full bg-success/10 border border-success/20 text-green-500 text-xs font-medium"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
        >
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          Live ({connectionState.latency}ms)
        </motion.div>
      </div>
    );
  }
  
  if (connectionState.connecting) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <motion.div
          className="flex items-center gap-2 px-3 py-2 rounded-full bg-warning/10 border border-warning/20 text-warning text-xs font-medium"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <div className="w-2 h-2 rounded-full bg-warning animate-spin" />
          Connecting...
        </motion.div>
      </div>
    );
  }
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <motion.div
        className="flex items-center gap-2 px-3 py-2 rounded-full bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium cursor-pointer hover:bg-destructive/20"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={() => websocketManager.connect()}
      >
        <div className="w-2 h-2 rounded-full bg-destructive" />
        Disconnected (Click to reconnect)
      </motion.div>
    </div>
  );
}

export default TradingLayout;