// MEV profit calculation utilities
export const calculateArbitrageProfit = (buyPrice, sellPrice, amount, fees = 0.003) => {
  const grossProfit = (sellPrice - buyPrice) * amount;
  const totalFees = (buyPrice + sellPrice) * amount * fees;
  return grossProfit - totalFees;
};

export const calculateLiquidationProfit = (collateralValue, debtValue, liquidationBonus = 0.05) => {
  return collateralValue * liquidationBonus - (collateralValue - debtValue);
};

export const calculateGasCost = (gasPrice, gasUnits = 1000000) => {
  return gasPrice * gasUnits;
};

export const calculateSlippageCost = (amount, slippagePercent) => {
  return amount * (slippagePercent / 100);
};

export const calculateExpectedValue = (profit, successProbability) => {
  return profit * successProbability;
};

export const calculateROI = (profit, investment) => {
  if (investment === 0) return 0;
  return (profit / investment) * 100;
};

// Risk assessment utilities
export const calculateRiskScore = (factors) => {
  const {
    competitionLevel = 0.5,
    liquidityDepth = 1,
    priceVolatility = 0.3,
    networkCongestion = 0.2
  } = factors;
  
  // Weighted risk calculation (0-1 scale)
  const riskScore = (
    competitionLevel * 0.3 +
    (1 - liquidityDepth) * 0.25 +
    priceVolatility * 0.25 +
    networkCongestion * 0.2
  );
  
  return Math.min(1, Math.max(0, riskScore));
};

export const getRiskLevel = (riskScore) => {
  if (riskScore <= 0.3) return 'low';
  if (riskScore <= 0.6) return 'medium';
  if (riskScore <= 0.8) return 'high';
  return 'critical';
};

// Validator performance calculations
export const calculateValidatorAPY = (rewards, stake, epochDuration = 2.5) => {
  const dailyRewards = rewards / epochDuration;
  const annualRewards = dailyRewards * 365;
  return (annualRewards / stake) * 100;
};

export const calculateMEVEfficiency = (mevRewards, totalRewards) => {
  if (totalRewards === 0) return 0;
  return (mevRewards / totalRewards) * 100;
};

// Bundle optimization utilities
export const optimizeBundleOrder = (transactions) => {
  // Simple optimization: sort by profit potential
  return [...transactions].sort((a, b) => {
    const profitA = calculateArbitrageProfit(a.buyPrice, a.sellPrice, a.amount);
    const profitB = calculateArbitrageProfit(b.buyPrice, b.sellPrice, b.amount);
    return profitB - profitA;
  });
};

export const calculateBundleProfit = (transactions) => {
  return transactions.reduce((total, tx) => {
    const profit = calculateArbitrageProfit(tx.buyPrice, tx.sellPrice, tx.amount);
    return total + profit;
  }, 0);
};

// Monte Carlo simulation for profit estimation
export const runMonteCarloSimulation = (baseProfit, riskFactors, iterations = 1000) => {
  const results = [];
  
  for (let i = 0; i < iterations; i++) {
    let simulatedProfit = baseProfit;
    
    // Apply random variations based on risk factors
    const competitionImpact = (Math.random() - 0.5) * riskFactors.competitionLevel * 0.5;
    const volatilityImpact = (Math.random() - 0.5) * riskFactors.priceVolatility * 0.3;
    const liquidityImpact = (Math.random() - 0.5) * (1 - riskFactors.liquidityDepth) * 0.2;
    
    simulatedProfit *= (1 + competitionImpact + volatilityImpact + liquidityImpact);
    results.push(simulatedProfit);
  }
  
  results.sort((a, b) => a - b);
  
  return {
    mean: results.reduce((sum, val) => sum + val, 0) / results.length,
    median: results[Math.floor(results.length / 2)],
    percentile5: results[Math.floor(results.length * 0.05)],
    percentile95: results[Math.floor(results.length * 0.95)],
    worstCase: Math.min(...results),
    bestCase: Math.max(...results),
    successProbability: results.filter(r => r > 0).length / results.length
  };
};

// Price impact calculations
export const calculatePriceImpact = (tradeSize, liquidity) => {
  // Simplified price impact model
  return Math.min(0.1, tradeSize / liquidity * 0.01);
};

export const calculateOptimalTradeSize = (availableLiquidity, maxPriceImpact = 0.01) => {
  return availableLiquidity * maxPriceImpact * 100;
};

// Export calculator utilities
export const calculators = {
  arbitrageProfit: calculateArbitrageProfit,
  liquidationProfit: calculateLiquidationProfit,
  gasCost: calculateGasCost,
  slippageCost: calculateSlippageCost,
  expectedValue: calculateExpectedValue,
  roi: calculateROI,
  riskScore: calculateRiskScore,
  riskLevel: getRiskLevel,
  validatorAPY: calculateValidatorAPY,
  mevEfficiency: calculateMEVEfficiency,
  optimizeBundleOrder: optimizeBundleOrder,
  bundleProfit: calculateBundleProfit,
  monteCarloSimulation: runMonteCarloSimulation,
  priceImpact: calculatePriceImpact,
  optimalTradeSize: calculateOptimalTradeSize
};