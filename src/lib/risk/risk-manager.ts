import { Position, Order, Balance, Asset, RiskMetrics } from '@/lib/types';

export interface RiskLimits {
  maxLeverage: number;
  maxPositionSize: number;
  maxTotalExposure: number;
  maxDailyLoss: number;
  maxOpenPositions: number;
  marginCallThreshold: number;
  liquidationThreshold: number;
}

export interface DynamicLeverageConfig {
  baseAsset: string;
  volatility: number;
  liquidity: number;
  userExperience: 'beginner' | 'intermediate' | 'expert';
  accountSize: number;
  maxLeverage: number;
}

export interface RiskWarning {
  id: string;
  type: 'margin_call' | 'high_exposure' | 'liquidation_risk' | 'daily_loss' | 'correlation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  recommendation: string;
  timestamp: number;
  positionId?: string;
  symbol?: string;
}

/**
 * Advanced risk management system for trading operations
 */
export class RiskManager {
  private limits: RiskLimits;
  private activeWarnings = new Map<string, RiskWarning>();
  private dailyPnLHistory: Array<{ timestamp: number; pnl: number }> = [];
  
  constructor(limits?: Partial<RiskLimits>) {
    this.limits = {
      maxLeverage: 10,
      maxPositionSize: 0.1, // 10% of account
      maxTotalExposure: 0.5, // 50% of account
      maxDailyLoss: 0.05, // 5% of account per day
      maxOpenPositions: 10,
      marginCallThreshold: 0.8, // 80% margin level
      liquidationThreshold: 0.5, // 50% margin level
      ...limits,
    };
  }
  
  /**
   * Calculate dynamic leverage based on asset characteristics and user profile
   */
  calculateDynamicLeverage(config: DynamicLeverageConfig): number {
    let adjustedLeverage = config.maxLeverage;
    
    // Volatility adjustment - higher volatility = lower leverage
    const volatilityFactor = Math.max(0.2, 1 - (config.volatility / 100));
    adjustedLeverage *= volatilityFactor;
    
    // Liquidity adjustment - lower liquidity = lower leverage
    const liquidityFactor = Math.min(1, config.liquidity / 1000000); // Normalize to millions
    adjustedLeverage *= liquidityFactor;
    
    // User experience adjustment
    const experienceMultiplier = {
      beginner: 0.5,
      intermediate: 0.8,
      expert: 1.0,
    };
    adjustedLeverage *= experienceMultiplier[config.userExperience];
    
    // Account size adjustment - smaller accounts get less leverage
    const accountSizeFactor = Math.min(1, config.accountSize / 100000); // Normalize to $100k
    adjustedLeverage *= Math.max(0.3, accountSizeFactor);
    
    // Cap at system maximum
    return Math.min(Math.floor(adjustedLeverage), this.limits.maxLeverage);
  }
  
  /**
   * Validate if an order meets risk requirements
   */
  validateOrderRisk(order: Omit<Order, 'id' | 'timestamp' | 'status'>, balance: Balance, positions: Position[]): {
    isValid: boolean;
    warnings: RiskWarning[];
    suggestedAdjustments?: {
      maxSize: number;
      recommendedLeverage: number;
      alternativeSymbols?: string[];
    };
  } {
    const warnings: RiskWarning[] = [];
    let isValid = true;
    
    // Calculate position value
    const positionValue = order.size * (order.price || 0);
    const leverage = 1; // Would get from order or calculate
    const margin = positionValue / leverage;
    
    // Check position size limit
    const positionSizeRatio = margin / balance.total;
    if (positionSizeRatio > this.limits.maxPositionSize) {
      isValid = false;
      warnings.push({
        id: `position_size_${Date.now()}`,
        type: 'high_exposure',
        severity: 'high',
        message: `Position size (${(positionSizeRatio * 100).toFixed(1)}%) exceeds maximum allowed (${(this.limits.maxPositionSize * 100).toFixed(1)}%)`,
        recommendation: `Reduce position size to ${(balance.total * this.limits.maxPositionSize / (order.price || 1)).toFixed(4)} ${order.symbol}`,
        timestamp: Date.now(),
      });
    }
    
    // Check total exposure limit
    const currentExposure = positions
      .filter(p => p.status === 'open')
      .reduce((total, pos) => total + pos.margin, 0);
    
    const newTotalExposure = (currentExposure + margin) / balance.total;
    if (newTotalExposure > this.limits.maxTotalExposure) {
      isValid = false;
      warnings.push({
        id: `total_exposure_${Date.now()}`,
        type: 'high_exposure',
        severity: 'critical',
        message: `Total exposure would reach ${(newTotalExposure * 100).toFixed(1)}%, exceeding limit of ${(this.limits.maxTotalExposure * 100).toFixed(1)}%`,
        recommendation: 'Close some existing positions or reduce order size',
        timestamp: Date.now(),
      });
    }
    
    // Check maximum open positions
    const openPositionsCount = positions.filter(p => p.status === 'open').length;
    if (openPositionsCount >= this.limits.maxOpenPositions) {
      warnings.push({
        id: `max_positions_${Date.now()}`,
        type: 'high_exposure',
        severity: 'medium',
        message: `You have ${openPositionsCount} open positions (limit: ${this.limits.maxOpenPositions})`,
        recommendation: 'Consider closing some positions before opening new ones',
        timestamp: Date.now(),
      });
    }
    
    // Check correlation risk (simplified - would need more sophisticated analysis)
    const correlatedPositions = positions.filter(p => 
      p.status === 'open' && 
      this.assetsAreCorrelated(p.symbol, order.symbol)
    );
    
    if (correlatedPositions.length > 0) {
      warnings.push({
        id: `correlation_${Date.now()}`,
        type: 'correlation',
        severity: 'medium',
        message: `This position may be correlated with existing ${correlatedPositions.length} position(s)`,
        recommendation: 'Consider diversifying across different asset classes',
        timestamp: Date.now(),
      });
    }
    
    // Generate suggested adjustments
    const suggestedAdjustments = {
      maxSize: Math.floor((balance.total * this.limits.maxPositionSize) / (order.price || 1)),
      recommendedLeverage: this.calculateRecommendedLeverage(order.symbol, balance, positions),
      alternativeSymbols: this.getAlternativeSymbols(order.symbol),
    };
    
    return { isValid, warnings, suggestedAdjustments };
  }
  
  /**
   * Monitor account risk and generate warnings
   */
  assessAccountRisk(balance: Balance, positions: Position[]): {
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    warnings: RiskWarning[];
    metrics: {
      marginLevel: number;
      totalExposure: number;
      dailyPnL: number;
      openPositionsCount: number;
      correlationScore: number;
    };
  } {
    const warnings: RiskWarning[] = [];
    
    // Calculate margin level
    const marginLevel = balance.margin > 0 ? ((balance.total + balance.unrealizedPnl) / balance.margin) : Infinity;
    
    // Check margin call threshold
    if (marginLevel < this.limits.marginCallThreshold && marginLevel !== Infinity) {
      warnings.push({
        id: `margin_call_${Date.now()}`,
        type: 'margin_call',
        severity: marginLevel < this.limits.liquidationThreshold ? 'critical' : 'high',
        message: `Margin level is ${(marginLevel * 100).toFixed(1)}%`,
        recommendation: marginLevel < this.limits.liquidationThreshold 
          ? 'URGENT: Add funds or close positions to avoid liquidation'
          : 'Consider adding funds or reducing exposure',
        timestamp: Date.now(),
      });
    }
    
    // Calculate total exposure
    const totalExposure = positions
      .filter(p => p.status === 'open')
      .reduce((total, pos) => total + pos.margin, 0) / balance.total;
    
    if (totalExposure > this.limits.maxTotalExposure * 0.8) { // Warning at 80% of limit
      warnings.push({
        id: `high_exposure_${Date.now()}`,
        type: 'high_exposure',
        severity: totalExposure > this.limits.maxTotalExposure ? 'critical' : 'high',
        message: `Total exposure is ${(totalExposure * 100).toFixed(1)}% of account`,
        recommendation: 'Consider reducing position sizes or closing some positions',
        timestamp: Date.now(),
      });
    }
    
    // Check daily P&L
    const todaysPnL = this.calculateDailyPnL(balance);
    if (todaysPnL < -this.limits.maxDailyLoss * balance.total) {
      warnings.push({
        id: `daily_loss_${Date.now()}`,
        type: 'daily_loss',
        severity: 'high',
        message: `Daily loss exceeds ${(this.limits.maxDailyLoss * 100).toFixed(1)}% limit`,
        recommendation: 'Consider stopping trading for today and reviewing strategy',
        timestamp: Date.now(),
      });
    }
    
    // Assess overall risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    
    const criticalWarnings = warnings.filter(w => w.severity === 'critical');
    const highWarnings = warnings.filter(w => w.severity === 'high');
    
    if (criticalWarnings.length > 0) riskLevel = 'critical';
    else if (highWarnings.length > 1 || marginLevel < this.limits.marginCallThreshold) riskLevel = 'high';
    else if (warnings.length > 0) riskLevel = 'medium';
    
    const metrics = {
      marginLevel,
      totalExposure,
      dailyPnL: todaysPnL,
      openPositionsCount: positions.filter(p => p.status === 'open').length,
      correlationScore: this.calculateCorrelationScore(positions),
    };
    
    return { riskLevel, warnings, metrics };
  }
  
  /**
   * Calculate position sizing recommendation
   */
  calculatePositionSizing(
    symbol: string,
    entryPrice: number,
    stopLoss: number,
    balance: Balance,
    riskPercentage: number = 0.02 // 2% risk per trade
  ): {
    recommendedSize: number;
    maxSize: number;
    riskAmount: number;
    rewardToRiskRatio?: number;
  } {
    // Calculate risk per unit
    const riskPerUnit = Math.abs(entryPrice - stopLoss);
    
    // Calculate maximum risk amount
    const maxRiskAmount = balance.total * riskPercentage;
    
    // Calculate recommended position size
    const recommendedSize = riskPerUnit > 0 ? maxRiskAmount / riskPerUnit : 0;
    
    // Apply position size limits
    const maxSizeByLimit = (balance.total * this.limits.maxPositionSize) / entryPrice;
    const maxSize = Math.min(recommendedSize, maxSizeByLimit);
    
    return {
      recommendedSize: Math.floor(recommendedSize * 1000) / 1000, // Round to 3 decimals
      maxSize: Math.floor(maxSize * 1000) / 1000,
      riskAmount: recommendedSize * riskPerUnit,
      rewardToRiskRatio: undefined, // Would need take profit level
    };
  }
  
  /**
   * Monitor position for liquidation risk
   */
  checkLiquidationRisk(position: Position): {
    isAtRisk: boolean;
    distanceToLiquidation: number; // Price distance
    timeEstimate?: number; // Estimated time in minutes if current trend continues
    recommendation: string;
  } {
    if (!position.liquidationPrice || position.status !== 'open') {
      return {
        isAtRisk: false,
        distanceToLiquidation: Infinity,
        recommendation: 'Position is not at liquidation risk',
      };
    }
    
    const currentPrice = position.currentPrice;
    const distanceToLiquidation = position.side === 'long' 
      ? currentPrice - position.liquidationPrice
      : position.liquidationPrice - currentPrice;
    
    const distancePercentage = Math.abs(distanceToLiquidation / currentPrice) * 100;
    
    const isAtRisk = distancePercentage < 10; // Within 10% of liquidation
    
    let recommendation = 'Position is safe';
    if (distancePercentage < 5) {
      recommendation = 'URGENT: Add margin or close position immediately';
    } else if (distancePercentage < 10) {
      recommendation = 'WARNING: Consider adding margin or reducing position size';
    } else if (distancePercentage < 20) {
      recommendation = 'Monitor position closely';
    }
    
    return {
      isAtRisk,
      distanceToLiquidation,
      recommendation,
    };
  }
  
  // Helper methods
  private calculateDailyPnL(balance: Balance): number {
    // Simplified - in reality would track P&L throughout the day
    return balance.unrealizedPnl + balance.realizedPnl;
  }
  
  private assetsAreCorrelated(symbol1: string, symbol2: string): boolean {
    // Simplified correlation detection
    const cryptoGroups = [
      ['BTC', 'ETH'], // Major cryptos tend to be correlated
      ['SOL', 'AVAX', 'ADA'], // Alt L1s
      ['LINK', 'DOT'], // Infrastructure tokens
    ];
    
    return cryptoGroups.some(group => 
      group.some(token => symbol1.includes(token)) && 
      group.some(token => symbol2.includes(token))
    );
  }
  
  private calculateRecommendedLeverage(symbol: string, balance: Balance, positions: Position[]): number {
    // Base recommendation on account health and symbol volatility
    const marginLevel = balance.margin > 0 ? ((balance.total + balance.unrealizedPnl) / balance.margin) : Infinity;
    
    let baseLeverage = 5; // Conservative default
    
    // Adjust based on account health
    if (marginLevel > 2) baseLeverage = 10;
    else if (marginLevel < 1.5) baseLeverage = 2;
    
    // Adjust based on symbol (simplified)
    if (symbol.includes('BTC') || symbol.includes('ETH')) {
      baseLeverage = Math.min(baseLeverage * 1.2, this.limits.maxLeverage);
    }
    
    return Math.min(Math.floor(baseLeverage), this.limits.maxLeverage);
  }
  
  private getAlternativeSymbols(symbol: string): string[] {
    // Suggest less correlated alternatives
    const alternatives: Record<string, string[]> = {
      'BTC-USD': ['ETH-USD', 'SOL-USD'],
      'ETH-USD': ['BTC-USD', 'AVAX-USD'],
      'SOL-USD': ['ADA-USD', 'DOT-USD'],
    };
    
    return alternatives[symbol] || [];
  }
  
  private calculateCorrelationScore(positions: Position[]): number {
    // Simplified correlation score (0-100, higher = more correlated)
    if (positions.length < 2) return 0;
    
    const openPositions = positions.filter(p => p.status === 'open');
    let correlationSum = 0;
    let pairCount = 0;
    
    for (let i = 0; i < openPositions.length; i++) {
      for (let j = i + 1; j < openPositions.length; j++) {
        if (this.assetsAreCorrelated(openPositions[i].symbol, openPositions[j].symbol)) {
          correlationSum += 80; // High correlation score
        } else {
          correlationSum += 20; // Low correlation score
        }
        pairCount++;
      }
    }
    
    return pairCount > 0 ? correlationSum / pairCount : 0;
  }
  
  // Configuration methods
  updateLimits(newLimits: Partial<RiskLimits>) {
    this.limits = { ...this.limits, ...newLimits };
  }
  
  getLimits(): RiskLimits {
    return { ...this.limits };
  }
  
  getActiveWarnings(): RiskWarning[] {
    return Array.from(this.activeWarnings.values());
  }
  
  dismissWarning(warningId: string) {
    this.activeWarnings.delete(warningId);
  }
  
  clearAllWarnings() {
    this.activeWarnings.clear();
  }
}