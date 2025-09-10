'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  ZapIcon, 
  TargetIcon, 
  ShieldIcon, 
  TrendingUpIcon 
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type OrderType = 'market' | 'limit';

interface OrderTypeOption {
  value: OrderType;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const ORDER_TYPES: OrderTypeOption[] = [
  {
    value: 'market',
    label: 'Market',
    icon: <ZapIcon className="h-4 w-4" />,
    description: 'Execute immediately at current market price'
  },
  {
    value: 'limit',
    label: 'Limit',
    icon: <TargetIcon className="h-4 w-4" />,
    description: 'Execute only at specified price or better'
  }
];

interface OrderTypeSelectorProps {
  value: OrderType;
  onChange: (value: OrderType) => void;
  className?: string;
  disabled?: boolean;
}

export function OrderTypeSelector({ 
  value, 
  onChange, 
  className,
  disabled = false 
}: OrderTypeSelectorProps) {
  const activeIndex = ORDER_TYPES.findIndex(type => type.value === value);

  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-sm font-medium text-foreground">
        Order Type
      </label>
      
      <div className="relative bg-muted/30 p-1.5 rounded-xl border border-border/20">
        {/* Sliding background indicator */}
        <motion.div
          className="absolute top-1.5 bottom-1.5 bg-background rounded-lg shadow-md border border-border/40 w-[calc(50%-0.375rem)]"
          initial={false}
          animate={{
            x: value === 'market' ? 0 : 'calc(100% + 0.375rem)',
          }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 30,
          }}
        />

        {/* Order type buttons */}
        <div className="flex gap-0">
          {ORDER_TYPES.map((orderType, index) => (
            <button
              key={orderType.value}
              type="button"
              onClick={() => !disabled && onChange(orderType.value)}
              disabled={disabled}
              className={cn(
                "relative z-10 flex-1 flex flex-col items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-all duration-200 rounded-lg",
                value === orderType.value 
                  ? "text-foreground" 
                  : "text-muted-foreground hover:text-foreground",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              title={orderType.description}
            >
              <motion.div
                animate={{ 
                  scale: value === orderType.value ? 1.15 : 1,
                  color: value === orderType.value ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'
                }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                {orderType.icon}
              </motion.div>
              <span className="leading-tight font-semibold">{orderType.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Description tooltip */}
      <motion.div
        className="text-xs text-muted-foreground bg-muted/20 rounded-lg p-3 border border-border/10"
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        key={value}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
          <span className="font-medium">{ORDER_TYPES.find(type => type.value === value)?.description}</span>
        </div>
      </motion.div>
    </div>
  );
}