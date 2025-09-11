//@ts-nocheck
'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  CalendarIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ActivityIcon,
  FilterIcon,
  InfoIcon,
  BarChart3Icon,
  ClockIcon,
  Calendar as CalendarDaysIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  TargetIcon
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
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [viewMode, setViewMode] = useState<'heatmap' | 'timeline'>('heatmap');

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

  const activeDays = performanceByDay.filter(day => day.trades > 0);
  const getPeriodDays = () => {
    switch(selectedPeriod) {
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      default: return 30;
    }
  };

  return (
    <div className={cn("p-4 space-y-6", className)}>
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <ActivityIcon className="h-5 w-5" />
          </div>
          <div>
            
            <p className="text-sm text-muted-foreground">Your daily trading performance overview</p>
          </div>
        </div>

       
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricOverviewCard
          title="Active Days"
          value={summaryStats.totalDays}
          subtitle={`${activeDays.length} of ${getPeriodDays()} days`}
          icon={<CalendarIcon className="h-4 w-4" />}
          color="neutral"
        />
        
        <MetricOverviewCard
          title="Success Rate"
          value={`${summaryStats.profitableDaysRate.toFixed(1)}%`}
          subtitle={`${summaryStats.profitableDays} profitable days`}
          icon={<TargetIcon className="h-4 w-4" />}
          color={summaryStats.profitableDaysRate > 50 ? "success" : "neutral"}
          progress={summaryStats.profitableDaysRate}
        />
        
        <MetricOverviewCard
          title="Avg Daily P&L"
          value={formatNumber(summaryStats.avgDailyPnl, { currency: true, compact: true })}
          subtitle="Per active day"
          icon={summaryStats.avgDailyPnl > 0 ? <ArrowUpIcon className="h-4 w-4" /> : <ArrowDownIcon className="h-4 w-4" />}
          color={summaryStats.avgDailyPnl > 0 ? "success" : summaryStats.avgDailyPnl < 0 ? "destructive" : "neutral"}
        />
        
        <MetricOverviewCard
          title="Avg Daily Volume"
          value={summaryStats.avgDailyTrades.toFixed(1)}
          subtitle="Trades per day"
          icon={<BarChart3Icon className="h-4 w-4" />}
          color="neutral"
        />
      </div>

      {/* Performance Highlights */}
      {(summaryStats.bestDay || summaryStats.worstDay) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {summaryStats.bestDay && (
            <PerformanceHighlight
              type="best"
              day={summaryStats.bestDay}
              getDateLabel={getDateLabel}
            />
          )}
          
          {summaryStats.worstDay && (
            <PerformanceHighlight
              type="worst"
              day={summaryStats.worstDay}
              getDateLabel={getDateLabel}
            />
          )}
        </div>
      )}

      {/* Activity Visualization */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">
              {viewMode === 'heatmap' ? 'Activity Heatmap' : 'Daily Timeline'}
            </CardTitle>
            <div className="flex items-center gap-2">
              <InfoIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {viewMode === 'heatmap' 
                  ? 'Intensity shows P&L magnitude' 
                  : 'Green: Profitable, Red: Loss'
                }
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'heatmap' ? (
            <HeatmapView 
              weekGroups={weekGroups}
              getHeatmapColor={getHeatmapColor}
              getDateLabel={getDateLabel}
              formatNumber={formatNumber}
            />
          ) : (
            <TimelineView 
              performanceData={activeDays.slice(-getPeriodDays())}
              getDateLabel={getDateLabel}
              formatNumber={formatNumber}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Metric Overview Card Component
function MetricOverviewCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  color, 
  progress 
}: { 
  title: string; 
  value: string | number; 
  subtitle: string; 
  icon: React.ReactNode; 
  color: 'success' | 'destructive' | 'neutral';
  progress?: number;
}) {
  return (
    <Card className="transition-all hover:shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-medium text-muted-foreground">{title}</div>
          <div className={cn(
            "p-2 rounded-lg",
            color === 'success' && 'bg-green-500/10 text-green-500',
            color === 'destructive' && 'bg-red-500/10 text-red-500',
            color === 'neutral' && 'bg-accent text-muted-foreground'
          )}>
            {icon}
          </div>
        </div>
        
        <div className={cn(
          'text-2xl font-bold mb-1',
          color === 'success' && 'text-green-500',
          color === 'destructive' && 'text-red-500',
          color === 'neutral' && 'text-foreground'
        )}>
          {value}
        </div>
        
        {progress !== undefined && (
          <div className="mb-2">
            <div className="h-2 bg-accent rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full transition-all duration-500 rounded-full",
                  color === 'success' && 'bg-green-500',
                  color === 'destructive' && 'bg-red-500',
                  color === 'neutral' && 'bg-primary'
                )}
                style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
              />
            </div>
          </div>
        )}
        
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </CardContent>
    </Card>
  );
}

// Performance Highlight Component
function PerformanceHighlight({ 
  type, 
  day, 
  getDateLabel 
}: { 
  type: 'best' | 'worst'; 
  day: TradePerformanceByDay; 
  getDateLabel: (date: string) => { day: number; month: string; weekday: string };
}) {
  const isBest = type === 'best';
  const dateInfo = getDateLabel(day.date);
  
  return (
    <Card className={cn(
      "transition-all hover:shadow-sm",
      isBest ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5"
    )}>
      <CardHeader className="pb-3">
        <CardTitle className={cn(
          "flex items-center gap-2 text-base",
          isBest ? "text-green-500" : "text-red-500"
        )}>
          {isBest ? <TrendingUpIcon className="h-5 w-5" /> : <TrendingDownIcon className="h-5 w-5" />}
          {isBest ? 'Best Trading Day' : 'Most Challenging Day'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-lg">
                {dateInfo.weekday}, {dateInfo.month} {dateInfo.day}
              </p>
              <p className="text-sm text-muted-foreground">
                {day.trades} trades executed
              </p>
            </div>
            <div className="text-right">
              <p className={cn(
                "text-2xl font-bold",
                isBest ? "text-green-500" : "text-red-500"
              )}>
                {isBest ? '+' : ''}{formatNumber(day.pnl, { currency: true })}
              </p>
              <p className="text-sm text-muted-foreground">
                {day.winRate.toFixed(1)}% win rate
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Heatmap View Component
function HeatmapView({ 
  weekGroups, 
  getHeatmapColor, 
  getDateLabel, 
  formatNumber 
}: {
  weekGroups: (TradePerformanceByDay | null)[][];
  getHeatmapColor: (day: TradePerformanceByDay | null) => string;
  getDateLabel: (date: string) => { day: number; month: string; weekday: string };
  formatNumber: (value: number, options?: any) => string;
}) {
  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Less activity</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-800" />
              <div className="w-3 h-3 rounded-sm bg-red-100 dark:bg-red-900/20" />
              <div className="w-3 h-3 rounded-sm bg-red-300 dark:bg-red-900/40" />
              <div className="w-3 h-3 rounded-sm bg-red-500 dark:bg-red-900/80" />
              <div className="w-2" />
              <div className="w-3 h-3 rounded-sm bg-green-100 dark:bg-green-900/20" />
              <div className="w-3 h-3 rounded-sm bg-green-300 dark:bg-green-900/40" />
              <div className="w-3 h-3 rounded-sm bg-green-500 dark:bg-green-900/80" />
            </div>
            <span className="text-sm text-muted-foreground">More activity</span>
          </div>
        </div>
      </div>

      {/* Weekday labels */}
      <div className="flex justify-start">
        <div className="w-8" />
        <div className="grid grid-cols-7 gap-1 text-xs font-medium text-muted-foreground">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center w-10">
              {day}
            </div>
          ))}
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="space-y-1">
        {weekGroups.map((week, weekIndex) => (
          <div key={weekIndex} className="flex items-center gap-1">
            <div className="w-8 text-xs text-muted-foreground text-right">
              {week[0] && weekIndex % 4 === 0 ? getDateLabel(
                week[0]?.date || new Date().toISOString().split('T')[0]
              ).month : ''}
            </div>
            
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
                      "w-10 h-10 rounded-lg cursor-pointer transition-all hover:scale-105 hover:shadow-sm relative group border",
                      getHeatmapColor(day),
                      day ? "border-border" : "border-transparent"
                    )}
                    title={day ? (
                      `${dateLabel?.weekday} ${dateLabel?.month} ${dateLabel?.day}\n` +
                      `${day.trades} trades\n` +
                      `P&L: ${formatNumber(day.pnl, { currency: true })}\n` +
                      `Win Rate: ${day.winRate.toFixed(1)}%`
                    ) : 'No activity'}
                  >
                    {dateLabel && (
                      <span className={cn(
                        "absolute inset-0 flex items-center justify-center text-xs font-medium",
                        day && Math.abs(day.pnl) > 0 ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {dateLabel.day}
                      </span>
                    )}
                    
                    {/* Hover tooltip */}
                    {day && (
                      <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                        <div className="bg-popover text-popover-foreground px-3 py-2 rounded-lg shadow-lg border text-sm whitespace-nowrap">
                          <div className="font-semibold">{dateLabel?.weekday} {dateLabel?.month} {dateLabel?.day}</div>
                          <div className="flex justify-between gap-4 mt-1">
                            <span>Trades:</span>
                            <span className="font-medium">{day.trades}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span>P&L:</span>
                            <span className={cn(
                              "font-medium",
                              day.pnl > 0 ? "text-green-500" : day.pnl < 0 ? "text-red-500" : "text-muted-foreground"
                            )}>
                              {formatNumber(day.pnl, { currency: true })}
                            </span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span>Win Rate:</span>
                            <span className="font-medium">{day.winRate.toFixed(1)}%</span>
                          </div>
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
  );
}

// Timeline View Component
function TimelineView({ 
  performanceData, 
  getDateLabel, 
  formatNumber 
}: {
  performanceData: TradePerformanceByDay[];
  getDateLabel: (date: string) => { day: number; month: string; weekday: string };
  formatNumber: (value: number, options?: any) => string;
}) {
  if (performanceData.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No trading activity in this period</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {performanceData.slice().reverse().map((day, index) => {
        const dateInfo = getDateLabel(day.date);
        const isProfit = day.pnl > 0;
        
        return (
          <motion.div
            key={day.date}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              "flex items-center justify-between p-4 rounded-lg border transition-all hover:shadow-sm",
              isProfit ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-full",
                isProfit ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
              )}>
                {isProfit ? <TrendingUpIcon className="h-4 w-4" /> : <TrendingDownIcon className="h-4 w-4" />}
              </div>
              <div>
                <div className="font-medium">
                  {dateInfo.weekday}, {dateInfo.month} {dateInfo.day}
                </div>
                <div className="text-sm text-muted-foreground">
                  {day.trades} trades • {day.winRate.toFixed(1)}% win rate
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className={cn(
                "font-bold text-lg",
                isProfit ? "text-green-500" : "text-red-500"
              )}>
                {isProfit ? '+' : ''}{formatNumber(day.pnl, { currency: true })}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}