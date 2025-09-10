'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  MenuIcon, 
  SettingsIcon, 
  BellIcon, 
  UserIcon,
  TrendingUpIcon,
  DollarSignIcon 
} from 'lucide-react';
import { useUIStore, useAccountSummary, useNotifications } from '@/stores';
import { Button } from '@/components/ui/button';
import { formatNumber } from '@/lib/utils';
import { formatPercentage } from '@/lib/format';
import { cn } from '@/lib/utils';

export function TopBar() {
  const {
    selectedSymbol,
    openModal,
  } = useUIStore();
  
  const accountSummary = useAccountSummary();
  const { notifications, unreadCount } = useNotifications();
  
  return (
    <div className="flex items-center justify-between h-full px-4 bg-card/50 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        {/* Menu Toggle */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => {}}
          className="hover:bg-accent"
        >
          <MenuIcon className="h-4 w-4" />
        </Button>
        
        {/* Logo/Brand */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/60 rounded-lg flex items-center justify-center">
            <TrendingUpIcon className="h-5 w-5 text-white" />
          </div>
          <span className="font-semibold text-lg hidden sm:block">
            HyperTrade
          </span>
        </div>
        
        {/* Current Symbol Display */}
        {selectedSymbol && (
          <motion.div
            className="flex items-center gap-2 px-3 py-1 rounded-md bg-accent/50"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="font-mono text-sm font-medium">
              {selectedSymbol}
            </span>
          </motion.div>
        )}
      </div>
      
      {/* Center Section - Account Summary */}
      <div className="flex items-center gap-6">
        <AccountMetric
          label="Equity"
          value={formatNumber(accountSummary.equity, { currency: true })}
          change={accountSummary.totalPnl}
          icon={<DollarSignIcon className="h-4 w-4" />}
        />
        
        <AccountMetric
          label="Day P&L"
          value={formatNumber(accountSummary.dayPnl, { 
            currency: true
          })}
          change={accountSummary.dayPnl}
          showChangeColor={true}
        />
        
        <AccountMetric
          label="Free Margin"
          value={formatNumber(accountSummary.freeMargin, { 
            currency: true,
            compact: true 
          })}
          subValue={`${formatNumber(accountSummary.marginLevel, { decimals: 1 })}%`}
        />
      </div>
      
      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => openModal('settings')}
            className="hover:bg-accent"
          >
            <BellIcon className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
        </div>
        
        {/* Settings */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => openModal('settings')}
          className="hover:bg-accent"
        >
          <SettingsIcon className="h-4 w-4" />
        </Button>
        
        {/* User Menu */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="hover:bg-accent"
        >
          <UserIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Account Metric Component
interface AccountMetricProps {
  label: string;
  value: string;
  change?: number;
  subValue?: string;
  icon?: React.ReactNode;
  showChangeColor?: boolean;
}

function AccountMetric({ 
  label, 
  value, 
  change, 
  subValue, 
  icon, 
  showChangeColor = false 
}: AccountMetricProps) {
  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-500';
    if (change < 0) return 'text-destructive';
    return 'text-muted-foreground';
  };
  
  return (
    <div className="text-center min-w-0">
      <div className="flex items-center gap-1 justify-center mb-1">
        {icon}
        <span className="text-xs text-muted-foreground truncate">
          {label}
        </span>
      </div>
      
      <div className="space-y-0.5">
        <div 
          className={cn(
            'font-mono text-sm font-semibold tabular-nums truncate',
            showChangeColor && change !== undefined && getChangeColor(change)
          )}
        >
          {value}
        </div>
        
        {subValue && (
          <div className="text-xs text-muted-foreground truncate">
            {subValue}
          </div>
        )}
        
        {change !== undefined && !showChangeColor && (
          <div className={cn(
            'text-xs font-medium tabular-nums',
            getChangeColor(change)
          )}>
            {formatPercentage((change / 100000) * 100)}
          </div>
        )}
      </div>
    </div>
  );
}