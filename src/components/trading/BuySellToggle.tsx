'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUpIcon, TrendingDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BuySellToggleProps {
  value: 'buy' | 'sell';
  onChange: (value: 'buy' | 'sell') => void;
  className?: string;
  disabled?: boolean;
}

export function BuySellToggle({ 
  value, 
  onChange, 
  className,
  disabled = false 
}: BuySellToggleProps) {
  return (
    <div className={cn("relative flex bg-muted rounded-lg p-1 w-full", className)}>
      {/* Background sliding indicator */}
      <motion.div
        className="absolute top-1 bottom-1 rounded-md w-[calc(50%-0.25rem)]"
        initial={false}
        animate={{
          x: value === 'buy' ? 0 : 'calc(100% + 0.25rem)',
        }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30,
        }}
        style={{
          background: value === 'buy' 
            ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' 
            : 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
          boxShadow: value === 'buy'
            ? '0 2px 12px rgba(16, 185, 129, 0.4), 0 1px 3px rgba(16, 185, 129, 0.3)'
            : '0 2px 12px rgba(239, 68, 68, 0.4), 0 1px 3px rgba(239, 68, 68, 0.3)',
        }}
      />
      
      {/* Buy Button */}
      <button
        type="button"
        onClick={() => !disabled && onChange('buy')}
        disabled={disabled}
        className={cn(
          "relative z-10 flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-md font-medium text-sm transition-all duration-200 min-w-[80px]",
          value === 'buy' 
            ? "text-white" 
            : "text-muted-foreground hover:text-foreground",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <TrendingUpIcon className="h-4 w-4 flex-shrink-0" />
        <span className="font-semibold whitespace-nowrap">Buy</span>
      </button>

      {/* Sell Button */}
      <button
        type="button"
        onClick={() => !disabled && onChange('sell')}
        disabled={disabled}
        className={cn(
          "relative z-10 flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-md font-medium text-sm transition-all duration-200 min-w-[80px]",
          value === 'sell' 
            ? "text-white" 
            : "text-muted-foreground hover:text-foreground",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <TrendingDownIcon className="h-4 w-4 flex-shrink-0" />
        <span className="font-semibold whitespace-nowrap">Sell</span>
      </button>
    </div>
  );
}