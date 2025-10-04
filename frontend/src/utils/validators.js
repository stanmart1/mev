// Input validation utilities
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password) => {
  const errors = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateSolanaAddress = (address) => {
  if (!address) return false;
  
  // Solana addresses are base58 encoded and typically 32-44 characters
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(address);
};

export const validateAmount = (amount, min = 0, max = Infinity) => {
  const numAmount = parseFloat(amount);
  
  if (isNaN(numAmount)) {
    return { isValid: false, error: 'Amount must be a valid number' };
  }
  
  if (numAmount < min) {
    return { isValid: false, error: `Amount must be at least ${min}` };
  }
  
  if (numAmount > max) {
    return { isValid: false, error: `Amount must not exceed ${max}` };
  }
  
  return { isValid: true };
};

export const validatePercentage = (percentage, min = 0, max = 100) => {
  const numPercentage = parseFloat(percentage);
  
  if (isNaN(numPercentage)) {
    return { isValid: false, error: 'Percentage must be a valid number' };
  }
  
  if (numPercentage < min || numPercentage > max) {
    return { isValid: false, error: `Percentage must be between ${min}% and ${max}%` };
  }
  
  return { isValid: true };
};

export const validateRequired = (value, fieldName = 'Field') => {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return { isValid: false, error: `${fieldName} is required` };
  }
  return { isValid: true };
};

export const validateURL = (url) => {
  try {
    new URL(url);
    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Please enter a valid URL' };
  }
};

export const validateDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) {
    return { isValid: false, error: 'Both start and end dates are required' };
  }
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (start > end) {
    return { isValid: false, error: 'Start date must be before end date' };
  }
  
  return { isValid: true };
};

// Form validation utilities
export const validateForm = (data, rules) => {
  const errors = {};
  let isValid = true;
  
  Object.keys(rules).forEach(field => {
    const value = data[field];
    const fieldRules = rules[field];
    
    fieldRules.forEach(rule => {
      if (errors[field]) return; // Skip if field already has error
      
      let result;
      
      switch (rule.type) {
        case 'required':
          result = validateRequired(value, rule.message || field);
          break;
        case 'email':
          if (value) result = validateEmail(value) ? { isValid: true } : { isValid: false, error: 'Invalid email format' };
          break;
        case 'password':
          if (value) result = validatePassword(value);
          break;
        case 'solanaAddress':
          if (value) result = validateSolanaAddress(value) ? { isValid: true } : { isValid: false, error: 'Invalid Solana address' };
          break;
        case 'amount':
          if (value) result = validateAmount(value, rule.min, rule.max);
          break;
        case 'percentage':
          if (value) result = validatePercentage(value, rule.min, rule.max);
          break;
        case 'url':
          if (value) result = validateURL(value);
          break;
        case 'custom':
          if (rule.validator) result = rule.validator(value);
          break;
        default:
          result = { isValid: true };
      }
      
      if (!result.isValid) {
        errors[field] = result.error || result.errors?.[0] || 'Invalid input';
        isValid = false;
      }
    });
  });
  
  return { isValid, errors };
};

// MEV specific validators
export const validateBundleTransaction = (transaction) => {
  const errors = {};
  
  if (!transaction.tokenIn) {
    errors.tokenIn = 'Input token is required';
  }
  
  if (!transaction.tokenOut) {
    errors.tokenOut = 'Output token is required';
  }
  
  if (!transaction.amountIn || parseFloat(transaction.amountIn) <= 0) {
    errors.amountIn = 'Amount must be greater than 0';
  }
  
  if (transaction.slippage && (parseFloat(transaction.slippage) < 0 || parseFloat(transaction.slippage) > 50)) {
    errors.slippage = 'Slippage must be between 0% and 50%';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateProfitCalculation = (data) => {
  const errors = {};
  
  if (!data.amount || parseFloat(data.amount) <= 0) {
    errors.amount = 'Investment amount must be greater than 0';
  }
  
  if (data.gasPrice && parseFloat(data.gasPrice) < 0) {
    errors.gasPrice = 'Gas price cannot be negative';
  }
  
  if (data.slippage && (parseFloat(data.slippage) < 0 || parseFloat(data.slippage) > 100)) {
    errors.slippage = 'Slippage must be between 0% and 100%';
  }
  
  if (data.competitionFactor && (parseFloat(data.competitionFactor) < 0 || parseFloat(data.competitionFactor) > 1)) {
    errors.competitionFactor = 'Competition factor must be between 0 and 1';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Export validation utilities
export const validators = {
  email: validateEmail,
  password: validatePassword,
  solanaAddress: validateSolanaAddress,
  amount: validateAmount,
  percentage: validatePercentage,
  required: validateRequired,
  url: validateURL,
  dateRange: validateDateRange,
  form: validateForm,
  bundleTransaction: validateBundleTransaction,
  profitCalculation: validateProfitCalculation
};