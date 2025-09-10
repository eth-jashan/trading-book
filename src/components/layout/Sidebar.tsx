'use client';

import React from 'react';
import { MarketList } from '@/components/market/MarketList';

export function Sidebar() {
  return (
    <div className="h-full border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-white dark:bg-gray-900/60">
      <MarketList className="h-full" compact />
    </div>
  );
}

