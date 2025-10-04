// Number formatting utilities
export const formatNumber = (num, decimals = 2) => {
  if (num === null || num === undefined) return '0';
  return Number(num).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

export const formatSOL = (amount, decimals = 4) => {
  if (amount === null || amount === undefined) return '0 SOL';
  return `${formatNumber(amount, decimals)} SOL`;
};

export const formatUSD = (amount, decimals = 2) => {
  if (amount === null || amount === undefined) return '$0';
  return `$${formatNumber(amount, decimals)}`;
};

export const formatPercentage = (value, decimals = 2) => {
  if (value === null || value === undefined) return '0%';
  return `${formatNumber(value, decimals)}%`;
};

export const formatLargeNumber = (num) => {
  if (num === null || num === undefined) return '0';
  
  const absNum = Math.abs(num);
  if (absNum >= 1e9) {
    return `${(num / 1e9).toFixed(1)}B`;
  } else if (absNum >= 1e6) {
    return `${(num / 1e6).toFixed(1)}M`;
  } else if (absNum >= 1e3) {
    return `${(num / 1e3).toFixed(1)}K`;
  }
  return formatNumber(num);
};

// Time formatting utilities
export const formatTimeAgo = (timestamp) => {
  const now = new Date();
  const time = new Date(timestamp);
  const diffInSeconds = Math.floor((now - time) / 1000);

  if (diffInSeconds < 60) {
    return `${diffInSeconds}s ago`;
  } else if (diffInSeconds < 3600) {
    return `${Math.floor(diffInSeconds / 60)}m ago`;
  } else if (diffInSeconds < 86400) {
    return `${Math.floor(diffInSeconds / 3600)}h ago`;
  } else {
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  }
};

export const formatDateTime = (timestamp) => {
  return new Date(timestamp).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

export const formatDate = (timestamp) => {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Address formatting utilities
export const formatAddress = (address, startChars = 6, endChars = 4) => {
  if (!address) return '';
  if (address.length <= startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
};

export const formatValidatorName = (validator) => {
  if (validator.name) return validator.name;
  return formatAddress(validator.address || validator.pubkey, 8, 6);
};

// MEV specific formatters
export const formatOpportunityType = (type) => {
  const types = {
    arbitrage: 'Arbitrage',
    liquidation: 'Liquidation',
    sandwich: 'Sandwich Attack',
    frontrun: 'Front-running',
    backrun: 'Back-running'
  };
  return types[type] || type;
};

export const formatRiskLevel = (risk) => {
  const levels = {
    low: 'Low Risk',
    medium: 'Medium Risk',
    high: 'High Risk',
    critical: 'Critical Risk'
  };
  return levels[risk] || risk;
};

export const formatDEX = (dex) => {
  const dexNames = {
    raydium: 'Raydium',
    orca: 'Orca',
    serum: 'Serum',
    jupiter: 'Jupiter',
    saber: 'Saber',
    aldrin: 'Aldrin'
  };
  return dexNames[dex] || dex;
};

// Profit and performance formatters
export const formatProfitChange = (current, previous) => {
  if (!previous || previous === 0) return null;
  const change = ((current - previous) / previous) * 100;
  return {
    value: change,
    formatted: `${change >= 0 ? '+' : ''}${formatNumber(change, 1)}%`,
    isPositive: change >= 0
  };
};

export const formatAPY = (apy) => {
  return `${formatNumber(apy, 2)}%`;
};

export const formatSuccessRate = (rate) => {
  return `${formatNumber(rate * 100, 1)}%`;
};

// Validation formatters
export const formatValidationError = (error) => {
  if (typeof error === 'string') return error;
  if (error.message) return error.message;
  return 'Invalid input';
};

// Export utility object
export const formatters = {
  number: formatNumber,
  sol: formatSOL,
  usd: formatUSD,
  percentage: formatPercentage,
  largeNumber: formatLargeNumber,
  timeAgo: formatTimeAgo,
  dateTime: formatDateTime,
  date: formatDate,
  address: formatAddress,
  validatorName: formatValidatorName,
  opportunityType: formatOpportunityType,
  riskLevel: formatRiskLevel,
  dex: formatDEX,
  profitChange: formatProfitChange,
  apy: formatAPY,
  successRate: formatSuccessRate,
  validationError: formatValidationError
};