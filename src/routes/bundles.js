const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const JitoIntegrationService = require('../services/jitoIntegrationService');

let jitoService = null;

const getJitoService = () => {
  if (!jitoService) {
    jitoService = new JitoIntegrationService(null, pool);
  }
  return jitoService;
};

// Simulate bundle execution
router.post('/simulate', async (req, res) => {
  try {
    const { opportunities, transactions, settings } = req.body;
    const txArray = opportunities || transactions;
    
    if (!txArray || !Array.isArray(txArray) || txArray.length === 0) {
      return res.status(400).json({ error: 'Opportunities or transactions array is required' });
    }

    // Calculate expected profit based on transactions and settings
    const totalProfit = txArray.reduce((sum, tx) => sum + (tx.estimated_profit_sol || tx.estimatedProfit || 0), 0);
    const totalGas = txArray.reduce((sum, tx) => sum + (tx.estimatedGas || 50000), 0);
    const slippageAdjustment = 1 - (settings?.slippageTolerance || 0.5) / 100;
    
    // Simulate execution with some randomness
    const successRate = Math.max(0.6, Math.random());
    const expectedProfit = totalProfit * slippageAdjustment * successRate;
    
    const simulation = {
      bundleId: `bundle_${Date.now()}`,
      expectedProfit,
      totalGas,
      successProbability: successRate * 100,
      estimatedExecutionTime: Math.floor(Math.random() * 5000) + 1000, // 1-6 seconds
      riskAssessment: {
        slippageRisk: settings?.slippageTolerance > 1 ? 'High' : 'Low',
        competitionRisk: txArray.length > 3 ? 'High' : 'Medium',
        gasRisk: totalGas > 500000 ? 'High' : 'Low'
      },
      breakdown: txArray.map((tx, index) => ({
        position: index + 1,
        type: tx.opportunity_type || tx.type,
        estimatedProfit: (tx.estimated_profit_sol || tx.estimatedProfit || 0) * slippageAdjustment * successRate,
        gasUsed: tx.estimatedGas || 50000,
        status: 'simulated'
      }))
    };

    res.json({
      success: true,
      data: simulation
    });
  } catch (error) {
    console.error('Bundle simulation error:', error);
    res.status(500).json({ error: 'Failed to simulate bundle' });
  }
});

// Submit bundle for execution
router.post('/submit', async (req, res) => {
  try {
    const { opportunities, transactions, settings } = req.body;
    const txArray = opportunities || transactions;
    
    if (!txArray || !Array.isArray(txArray) || txArray.length === 0) {
      return res.status(400).json({ error: 'Opportunities or transactions array is required' });
    }

    const jito = getJitoService();
    await jito.initialize();

    const result = await jito.createAndSubmitOptimizedBundle(
      txArray,
      {
        maxBundleSize: settings?.maxBundleSize || 5,
        minProfitThreshold: settings?.minProfitThreshold || 0.001,
        riskTolerance: settings?.riskTolerance || 'medium'
      },
      {
        strategy: settings?.strategy || 'balanced',
        realSubmission: false
      }
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    res.json({
      success: true,
      data: {
        bundleId: result.bundleId,
        status: 'submitted',
        estimatedConfirmation: Date.now() + (result.expectedOutcome.estimatedLatency || 30000),
        successProbability: result.successEstimation.successProbability,
        expectedProfit: result.expectedOutcome.estimatedProfit,
        tipAmount: result.optimization.tipAmount,
        priority: result.optimization.priority
      }
    });
  } catch (error) {
    console.error('Bundle submission error:', error);
    res.status(500).json({ error: 'Failed to submit bundle' });
  }
});

// Get bundle status
router.get('/:bundleId/status', async (req, res) => {
  try {
    const { bundleId } = req.params;
    
    const jito = getJitoService();
    const status = await jito.getBundleStatus(bundleId);
    
    if (status.error) {
      return res.status(404).json({ error: status.error });
    }
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Bundle status error:', error);
    res.status(500).json({ error: 'Failed to get bundle status' });
  }
});

// Execute bundle (actual submission)
router.post('/execute', async (req, res) => {
  try {
    const { bundleId, opportunities, transactions, settings } = req.body;
    const txArray = opportunities || transactions;
    
    if (!txArray || !Array.isArray(txArray) || txArray.length === 0) {
      return res.status(400).json({ error: 'Opportunities or transactions array is required' });
    }

    const jito = getJitoService();
    await jito.initialize();

    const result = await jito.createAndSubmitOptimizedBundle(
      txArray,
      {
        maxBundleSize: settings?.maxBundleSize || 5,
        minProfitThreshold: settings?.minProfitThreshold || 0.001,
        riskTolerance: settings?.riskTolerance || 'medium'
      },
      {
        strategy: settings?.strategy || 'balanced',
        realSubmission: true
      }
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    res.json({
      success: true,
      data: {
        bundleId: result.bundleId,
        status: 'executing',
        submissionResult: result.submissionResult,
        successProbability: result.successEstimation.successProbability,
        expectedProfit: result.expectedOutcome.estimatedProfit,
        optimization: result.optimization
      }
    });
  } catch (error) {
    console.error('Bundle execution error:', error);
    res.status(500).json({ error: 'Failed to execute bundle' });
  }
});

module.exports = router;