'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  CalendarIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ActivityIcon
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn, formatNumber } from '@/lib/utils';
import { usePositionPerformance, TradePerformanceByDay } from '@/hooks/usePositionPerformance';

interface PositionHeatMapProps {
  className?: string;
  showDays?: number; // Number of days to show in heatmap
}

export function PositionHeatMap({ className, showDays = 30 }: PositionHeatMapProps) {
  const { performanceByDay } = usePositionPerformance();

  // Generate heatmap data for the last N days
  const heatmapData = useMemo(() => {
    const now = new Date();
    const startDate = new Date(now.getTime() - (showDays * 24 * 60 * 60 * 1000));
    
    // Create a map of all days in the range
    const dayMap = new Map<string, TradePerformanceByDay>();
    
    // Fill with existing performance data
    performanceByDay.forEach(day => {
      dayMap.set(day.date, day);
    });
    
    // Generate array of all days with data or empty days
    const days: (TradePerformanceByDay | null)[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= now) {
      const dateString = currentDate.toISOString().split('T')[0];
      const existingData = dayMap.get(dateString);
      
      if (existingData) {
        days.push(existingData);
      } else {
        days.push(null); // No trading activity
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  }, [performanceByDay, showDays]);

  // Calculate intensity levels for heatmap coloring
  const getIntensityLevel = (pnl: number, maxAbsPnl: number): number => {
    if (maxAbsPnl === 0) return 0;
    return Math.abs(pnl) / maxAbsPnl;
  };

  const maxAbsPnl = useMemo(() => {
    return Math.max(
      ...performanceByDay.map(day => Math.abs(day.pnl)),
      1 // Minimum value to avoid division by zero
    );
  }, [performanceByDay]);

  const getHeatmapColor = (day: TradePerformanceByDay | null) => {
    if (!day || day.trades === 0) {
      return 'bg-gray-100 dark:bg-gray-800'; // No activity
    }

    const intensity = getIntensityLevel(day.pnl, maxAbsPnl);
    const isProfit = day.pnl > 0;

    if (intensity < 0.2) {
      return isProfit 
        ? 'bg-green-100 dark:bg-green-900/20' 
        : 'bg-red-100 dark:bg-red-900/20';
    } else if (intensity < 0.4) {
      return isProfit 
        ? 'bg-green-200 dark:bg-green-900/30' 
        : 'bg-red-200 dark:bg-red-900/30';
    } else if (intensity < 0.6) {
      return isProfit 
        ? 'bg-green-300 dark:bg-green-900/40' 
        : 'bg-red-300 dark:bg-red-900/40';
    } else if (intensity < 0.8) {
      return isProfit 
        ? 'bg-green-400 dark:bg-green-900/60' 
        : 'bg-red-400 dark:bg-red-900/60';
    } else {
      return isProfit 
        ? 'bg-green-500 dark:bg-green-900/80' 
        : 'bg-red-500 dark:bg-red-900/80';
    }
  };

  const getDateLabel = (dateString: string) => {
    const date = new Date(dateString);
    return {
      day: date.getDate(),
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
    };
  };

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const activeDays = performanceByDay.filter(day => day.trades > 0);
    const totalDays = activeDays.length;
    const profitableDays = activeDays.filter(day => day.pnl > 0).length;
    const totalPnl = activeDays.reduce((sum, day) => sum + day.pnl, 0);
    const totalTrades = activeDays.reduce((sum, day) => sum + day.trades, 0);
    
    return {
      totalDays,
      profitableDays,
      profitableDaysRate: totalDays > 0 ? (profitableDays / totalDays) * 100 : 0,
      avgDailyPnl: totalDays > 0 ? totalPnl / totalDays : 0,
      avgDailyTrades: totalDays > 0 ? totalTrades / totalDays : 0,
      bestDay: activeDays.reduce((best, day) => day.pnl > (best?.pnl || -Infinity) ? day : best, null),
      worstDay: activeDays.reduce((worst, day) => day.pnl < (worst?.pnl || Infinity) ? day : worst, null),
    };
  }, [performanceByDay]);

  // Group days into weeks for better visualization
  const weekGroups = useMemo(() => {
    const weeks: (TradePerformanceByDay | null)[][] = [];
    let currentWeek: (TradePerformanceByDay | null)[] = [];
    
    heatmapData.forEach((day, index) => {
      currentWeek.push(day);
      
      // Start new week on Sunday or when we reach 7 days
      if (currentWeek.length === 7) {
        weeks.push([...currentWeek]);
        currentWeek = [];
      }
    });
    
    // Add remaining days
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }
    
    return weeks;
  }, [heatmapData]);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Trading Activity Heatmap</h3>
        </div>
        <div className="text-sm text-muted-foreground">
          Last {showDays} days
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-3">
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{summaryStats.totalDays}</p>
              <p className="text-xs text-muted-foreground">Active Days</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="text-center">
              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                {summaryStats.profitableDaysRate.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">Profitable Days</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="text-center">
              <p className={cn(
                "text-lg font-bold",
                summaryStats.avgDailyPnl > 0 
                  ? "text-green-600 dark:text-green-400" 
                  : "text-red-600 dark:text-red-400"
              )}>
                {formatNumber(summaryStats.avgDailyPnl, { currency: true, compact: true })}
              </p>
              <p className="text-xs text-muted-foreground">Avg Daily P&L</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">
                {summaryStats.avgDailyTrades.toFixed(1)}
              </p>
              <p className="text-xs text-muted-foreground">Avg Daily Trades</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Heatmap Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ActivityIcon className="h-4 w-4" />
            Daily Performance Heatmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Legend */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Less</span>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-800" />
                <div className="w-3 h-3 rounded-sm bg-red-100 dark:bg-red-900/20" />
                <div className="w-3 h-3 rounded-sm bg-red-200 dark:bg-red-900/30" />
                <div className="w-3 h-3 rounded-sm bg-red-400 dark:bg-red-900/60" />
                <div className="w-3 h-3 rounded-sm bg-red-500 dark:bg-red-900/80" />
                <div className="w-2 h-2" /> {/* Spacer */}
                <div className="w-3 h-3 rounded-sm bg-green-100 dark:bg-green-900/20" />
                <div className="w-3 h-3 rounded-sm bg-green-200 dark:bg-green-900/30" />
                <div className="w-3 h-3 rounded-sm bg-green-400 dark:bg-green-900/60" />
                <div className="w-3 h-3 rounded-sm bg-green-500 dark:bg-green-900/80" />
              </div>
              <span className="text-muted-foreground">More</span>
            </div>

            {/* Weekday labels */}
            <div className="flex justify-start">
              <div className="w-6" /> {/* Spacer for alignment */}
              <div className="grid grid-cols-7 gap-1 text-xs text-muted-foreground">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center w-8">
                    {day}
                  </div>
                ))}
              </div>
            </div>

            {/* Heatmap Grid */}
            <div className="space-y-1">
              {weekGroups.map((week, weekIndex) => (
                <div key={weekIndex} className="flex items-center gap-1">
                  {/* Month label for first day of week */}
                  <div className="w-6 text-xs text-muted-foreground text-right">
                    {week[0] && weekIndex % 4 === 0 ? getDateLabel(
                      week[0]?.date || new Date().toISOString().split('T')[0]
                    ).month : ''}
                  </div>
                  
                  {/* Week grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {week.map((day, dayIndex) => {
                      const dateStr = day?.date || '';
                      const dateLabel = dateStr ? getDateLabel(dateStr) : null;
                      
                      return (
                        <motion.div
                          key={`${weekIndex}-${dayIndex}`}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: (weekIndex * 7 + dayIndex) * 0.01 }}
                          className={cn(
                            "w-8 h-8 rounded-sm cursor-pointer transition-all hover:scale-110 relative group",
                            getHeatmapColor(day)
                          )}
                          title={day ? (
                            `${dateLabel?.weekday} ${dateLabel?.month} ${dateLabel?.day}\n` +
                            `Trades: ${day.trades}\n` +
                            `P&L: ${formatNumber(day.pnl, { currency: true })}\n` +
                            `Win Rate: ${day.winRate.toFixed(1)}%`
                          ) : 'No activity'}
                        >
                          {/* Day number for better readability */}
                          {dateLabel && (
                            <span className="absolute inset-0 flex items-center justify-center text-xs font-medium opacity-70">
                              {dateLabel.day}
                            </span>
                          )}
                          
                          {/* Tooltip */}
                          {day && (
                            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                              <div className="bg-black dark:bg-white text-white dark:text-black px-2 py-1 rounded text-xs whitespace-nowrap">
                                <div>{dateLabel?.weekday} {dateLabel?.month} {dateLabel?.day}</div>
                                <div>{day.trades} trades</div>
                                <div>{formatNumber(day.pnl, { currency: true })}</div>
                                <div>{day.winRate.toFixed(1)}% wins</div>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Best and Worst Days */}
      {(summaryStats.bestDay || summaryStats.worstDay) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {summaryStats.bestDay && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <TrendingUpIcon className="h-4 w-4" />
                  Best Day
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-semibold">
                    {getDateLabel(summaryStats.bestDay.date).weekday}{' '}
                    {getDateLabel(summaryStats.bestDay.date).month}{' '}
                    {getDateLabel(summaryStats.bestDay.date).day}
                  </p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    +{formatNumber(summaryStats.bestDay.pnl, { currency: true })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {summaryStats.bestDay.trades} trades • {summaryStats.bestDay.winRate.toFixed(1)}% wins
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {summaryStats.worstDay && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <TrendingDownIcon className="h-4 w-4" />
                  Worst Day
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-semibold">
                    {getDateLabel(summaryStats.worstDay.date).weekday}{' '}
                    {getDateLabel(summaryStats.worstDay.date).month}{' '}
                    {getDateLabel(summaryStats.worstDay.date).day}
                  </p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {formatNumber(summaryStats.worstDay.pnl, { currency: true })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {summaryStats.worstDay.trades} trades • {summaryStats.worstDay.winRate.toFixed(1)}% wins
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}