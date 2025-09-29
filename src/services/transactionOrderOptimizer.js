const logger = require('../config/logger');
const EventEmitter = require('events');

class TransactionOrderOptimizer extends EventEmitter {
  constructor() {
    super();
    
    this.algorithms = {
      GENETIC: 'genetic',
      SIMULATED_ANNEALING: 'simulated_annealing', 
      GREEDY: 'greedy',
      GRAPH_BASED: 'graph_based'
    };
    
    this.config = {
      populationSize: 30,
      generations: 50,
      mutationRate: 0.1,
      crossoverRate: 0.8,
      coolingRate: 0.95,
      initialTemperature: 1000,
      maxIterations: 500
    };
    
    this.scoringWeights = {
      profit: 0.4,
      gasEfficiency: 0.25,
      riskDistribution: 0.2,
      synergy: 0.15
    };
    
    this.dependencyGraph = new Map();
    this.optimizationStats = {
      totalOptimizations: 0,
      averageImprovement: 0,
      bestScoreAchieved: 0
    };
  }

  async optimizeTransactionOrder(transactions, constraints = {}) {
    const startTime = Date.now();
    logger.info(`🔧 Optimizing order for ${transactions.length} transactions`);
    
    if (!transactions || transactions.length <= 1) {
      return transactions;
    }
    
    // Select optimization algorithm
    const algorithm = this.selectOptimizationAlgorithm(transactions.length);
    
    // Build dependency graph
    this.buildDependencyGraph(transactions);
    
    // Run optimization
    const optimizedOrder = await this.runOptimization(algorithm, transactions, constraints);
    
    // Calculate improvement
    const originalScore = this.calculateOrderScore(transactions);
    const optimizedScore = this.calculateOrderScore(optimizedOrder);
    const improvement = ((optimizedScore - originalScore) / originalScore) * 100;
    
    this.updateStats(improvement, optimizedScore);
    
    logger.info(`✅ Order optimized: ${improvement.toFixed(2)}% improvement`);
    
    return {
      optimizedOrder,
      originalScore,
      optimizedScore,
      improvement,
      algorithm,
      optimizationTime: Date.now() - startTime
    };
  }

  selectOptimizationAlgorithm(transactionCount) {
    if (transactionCount <= 5) return this.algorithms.GREEDY;
    if (transactionCount <= 12) return this.algorithms.GENETIC;
    return this.algorithms.SIMULATED_ANNEALING;
  }

  buildDependencyGraph(transactions) {
    this.dependencyGraph.clear();
    
    for (let i = 0; i < transactions.length; i++) {
      const dependencies = [];
      
      for (let j = 0; j < i; j++) {
        if (this.hasDependency(transactions[j], transactions[i])) {
          dependencies.push(j);
        }
      }
      
      this.dependencyGraph.set(i, { transaction: transactions[i], dependencies });
    }
  }

  hasDependency(tx1, tx2) {
    // Token flow dependency
    if (this.hasTokenFlowDependency(tx1, tx2)) return true;
    
    // Same DEX liquidity dependency
    if (tx1.dex === tx2.dex && this.shareTokens(tx1.tokens, tx2.tokens)) return true;
    
    return false;
  }

  hasTokenFlowDependency(tx1, tx2) {
    if (!tx1.tokens || !tx2.tokens) return false;
    
    for (const token1 of tx1.tokens) {
      for (const token2 of tx2.tokens) {
        if (token1.mint === token2.mint && 
            token1.direction === 'out' && 
            token2.direction === 'in') {
          return true;
        }
      }
    }
    return false;
  }

  shareTokens(tokens1, tokens2) {
    if (!tokens1 || !tokens2) return false;
    
    for (const token1 of tokens1) {
      for (const token2 of tokens2) {
        if (token1.mint === token2.mint) return true;
      }
    }
    return false;
  }

  async runOptimization(algorithm, transactions, constraints) {
    switch (algorithm) {
      case this.algorithms.GENETIC:
        return this.geneticAlgorithmOptimization(transactions);
      case this.algorithms.SIMULATED_ANNEALING:
        return this.simulatedAnnealingOptimization(transactions);
      case this.algorithms.GREEDY:
        return this.greedyOptimization(transactions);
      case this.algorithms.GRAPH_BASED:
        return this.graphBasedOptimization(transactions);
      default:
        return this.greedyOptimization(transactions);
    }
  }

  geneticAlgorithmOptimization(transactions) {
    let population = this.initializePopulation(transactions);
    let bestSolution = [...population[0]];
    let bestScore = this.calculateOrderScore(bestSolution);
    
    for (let generation = 0; generation < this.config.generations; generation++) {
      const fitnessScores = population.map(individual => 
        this.calculateOrderScore(individual)
      );
      
      // Update best solution
      const maxIndex = fitnessScores.indexOf(Math.max(...fitnessScores));
      if (fitnessScores[maxIndex] > bestScore) {
        bestSolution = [...population[maxIndex]];
        bestScore = fitnessScores[maxIndex];
      }
      
      // Create new generation
      const newPopulation = [];
      
      // Elitism - keep best 10%
      const eliteCount = Math.floor(this.config.populationSize * 0.1);
      const sortedIndices = fitnessScores
        .map((score, index) => ({ score, index }))
        .sort((a, b) => b.score - a.score);
      
      for (let i = 0; i < eliteCount; i++) {
        newPopulation.push([...population[sortedIndices[i].index]]);
      }
      
      // Generate offspring
      while (newPopulation.length < this.config.populationSize) {
        const parent1 = this.tournamentSelection(population, fitnessScores);
        const parent2 = this.tournamentSelection(population, fitnessScores);
        
        let offspring = this.crossover(parent1, parent2);
        
        if (Math.random() < this.config.mutationRate) {
          offspring = this.mutate(offspring);
        }
        
        if (this.isValidOrder(offspring)) {
          newPopulation.push(offspring);
        } else {
          newPopulation.push(this.repairOrder(offspring));
        }
      }
      
      population = newPopulation;
    }
    
    return bestSolution;
  }

  simulatedAnnealingOptimization(transactions) {
    let currentSolution = [...transactions];
    let currentScore = this.calculateOrderScore(currentSolution);
    let bestSolution = [...currentSolution];
    let bestScore = currentScore;
    let temperature = this.config.initialTemperature;
    
    for (let iteration = 0; iteration < this.config.maxIterations; iteration++) {
      const neighbor = this.generateNeighbor(currentSolution);
      const neighborScore = this.calculateOrderScore(neighbor);
      const delta = neighborScore - currentScore;
      
      if (delta > 0 || Math.exp(delta / temperature) > Math.random()) {
        currentSolution = neighbor;
        currentScore = neighborScore;
        
        if (neighborScore > bestScore) {
          bestSolution = [...neighbor];
          bestScore = neighborScore;
        }
      }
      
      temperature *= this.config.coolingRate;
      if (temperature < 0.001) break;
    }
    
    return bestSolution;
  }

  greedyOptimization(transactions) {
    const result = [];
    const remaining = [...transactions];
    
    while (remaining.length > 0) {
      let bestIndex = 0;
      let bestScore = -Infinity;
      
      for (let i = 0; i < remaining.length; i++) {
        if (this.canAddTransaction(remaining[i], result)) {
          const score = this.calculateTransactionScore(remaining[i], result);
          if (score > bestScore) {
            bestScore = score;
            bestIndex = i;
          }
        }
      }
      
      result.push(remaining.splice(bestIndex, 1)[0]);
    }
    
    return result;
  }

  graphBasedOptimization(transactions) {
    // Topological sort with profit optimization
    const inDegree = new Map();
    const adjList = new Map();
    
    for (let i = 0; i < transactions.length; i++) {
      inDegree.set(i, 0);
      adjList.set(i, []);
    }
    
    // Build dependency graph
    for (const [index, node] of this.dependencyGraph.entries()) {
      for (const depIndex of node.dependencies) {
        adjList.get(depIndex).push(index);
        inDegree.set(index, inDegree.get(index) + 1);
      }
    }
    
    const result = [];
    const queue = [];
    
    for (const [index, degree] of inDegree.entries()) {
      if (degree === 0) queue.push(index);
    }
    
    while (queue.length > 0) {
      // Sort by profit for greedy selection
      queue.sort((a, b) => transactions[b].profitSOL - transactions[a].profitSOL);
      
      const current = queue.shift();
      result.push(transactions[current]);
      
      for (const neighbor of adjList.get(current)) {
        inDegree.set(neighbor, inDegree.get(neighbor) - 1);
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      }
    }
    
    return result;
  }

  // Helper methods
  initializePopulation(transactions) {
    const population = [];
    population.push([...transactions]); // Original order
    population.push(this.orderByProfit([...transactions]));
    population.push(this.orderByRisk([...transactions]));
    
    while (population.length < this.config.populationSize) {
      const randomOrder = [...transactions].sort(() => Math.random() - 0.5);
      population.push(this.isValidOrder(randomOrder) ? randomOrder : this.repairOrder(randomOrder));
    }
    
    return population;
  }

  tournamentSelection(population, fitnessScores, tournamentSize = 3) {
    const tournament = [];
    for (let i = 0; i < tournamentSize; i++) {
      const randomIndex = Math.floor(Math.random() * population.length);
      tournament.push({ individual: population[randomIndex], fitness: fitnessScores[randomIndex] });
    }
    tournament.sort((a, b) => b.fitness - a.fitness);
    return [...tournament[0].individual];
  }

  crossover(parent1, parent2) {
    const size = parent1.length;
    const offspring = new Array(size).fill(null);
    const start = Math.floor(Math.random() * size);
    const end = Math.floor(Math.random() * (size - start)) + start;
    
    for (let i = start; i <= end; i++) {
      offspring[i] = parent1[i];
    }
    
    let parent2Index = 0;
    for (let i = 0; i < size; i++) {
      if (offspring[i] === null) {
        while (offspring.includes(parent2[parent2Index])) {
          parent2Index++;
        }
        offspring[i] = parent2[parent2Index];
        parent2Index++;
      }
    }
    
    return offspring;
  }

  mutate(individual) {
    const mutated = [...individual];
    const i = Math.floor(Math.random() * mutated.length);
    const j = Math.floor(Math.random() * mutated.length);
    [mutated[i], mutated[j]] = [mutated[j], mutated[i]];
    return mutated;
  }

  generateNeighbor(solution) {
    const neighbor = [...solution];
    const i = Math.floor(Math.random() * neighbor.length);
    const j = Math.floor(Math.random() * neighbor.length);
    [neighbor[i], neighbor[j]] = [neighbor[j], neighbor[i]];
    return this.isValidOrder(neighbor) ? neighbor : this.repairOrder(neighbor);
  }

  calculateOrderScore(order) {
    let score = 0;
    
    // Profit component - early profits weighted higher
    let cumulativeProfit = 0;
    for (let i = 0; i < order.length; i++) {
      cumulativeProfit += order[i].profitSOL;
      score += this.scoringWeights.profit * cumulativeProfit / (i + 1);
    }
    
    // Gas efficiency
    const totalProfit = order.reduce((sum, tx) => sum + tx.profitSOL, 0);
    const totalGas = order.reduce((sum, tx) => sum + tx.gasCost, 0);
    const gasEfficiency = totalGas > 0 ? totalProfit / totalGas : 0;
    score += this.scoringWeights.gasEfficiency * gasEfficiency;
    
    // Risk distribution - penalty for consecutive high-risk
    let riskPenalty = 0;
    for (let i = 0; i < order.length - 1; i++) {
      if (order[i].riskScore > 7 && order[i + 1].riskScore > 7) {
        riskPenalty += 5;
      }
    }
    score += this.scoringWeights.riskDistribution * (10 - riskPenalty);
    
    // Synergy - bonus for related transactions
    let synergyBonus = 0;
    for (let i = 0; i < order.length - 1; i++) {
      if (order[i].dex === order[i + 1].dex) synergyBonus += 1;
      if (this.shareTokens(order[i].tokens, order[i + 1].tokens)) synergyBonus += 2;
    }
    score += this.scoringWeights.synergy * synergyBonus;
    
    return score;
  }

  calculateTransactionScore(transaction, currentOrder) {
    const baseScore = transaction.profitSOL / transaction.gasCost;
    let bonuses = 0;
    
    // Synergy with last transaction
    if (currentOrder.length > 0) {
      const lastTx = currentOrder[currentOrder.length - 1];
      if (lastTx.dex === transaction.dex) bonuses += 1;
      if (this.shareTokens(lastTx.tokens, transaction.tokens)) bonuses += 2;
    }
    
    return baseScore + bonuses;
  }

  orderByProfit(transactions) {
    return transactions.sort((a, b) => b.profitSOL - a.profitSOL);
  }

  orderByRisk(transactions) {
    return transactions.sort((a, b) => a.riskScore - b.riskScore);
  }

  canAddTransaction(transaction, currentOrder) {
    // Check dependencies
    for (const [index, node] of this.dependencyGraph.entries()) {
      if (node.transaction === transaction) {
        for (const depIndex of node.dependencies) {
          const depTransaction = this.dependencyGraph.get(depIndex).transaction;
          if (!currentOrder.includes(depTransaction)) {
            return false;
          }
        }
        break;
      }
    }
    return true;
  }

  isValidOrder(order) {
    // Check if order respects all dependencies
    for (let i = 0; i < order.length; i++) {
      const transaction = order[i];
      
      // Find dependencies for this transaction
      for (const [index, node] of this.dependencyGraph.entries()) {
        if (node.transaction === transaction) {
          for (const depIndex of node.dependencies) {
            const depTransaction = this.dependencyGraph.get(depIndex).transaction;
            const depPosition = order.indexOf(depTransaction);
            
            if (depPosition === -1 || depPosition >= i) {
              return false; // Dependency not satisfied
            }
          }
          break;
        }
      }
    }
    return true;
  }

  repairOrder(order) {
    // Simple repair: topological sort
    const visited = new Set();
    const result = [];
    
    const visit = (transaction) => {
      if (visited.has(transaction)) return;
      visited.add(transaction);
      
      // Visit dependencies first
      for (const [index, node] of this.dependencyGraph.entries()) {
        if (node.transaction === transaction) {
          for (const depIndex of node.dependencies) {
            const depTransaction = this.dependencyGraph.get(depIndex).transaction;
            if (order.includes(depTransaction)) {
              visit(depTransaction);
            }
          }
          break;
        }
      }
      
      result.push(transaction);
    };
    
    for (const transaction of order) {
      visit(transaction);
    }
    
    return result;
  }

  updateStats(improvement, score) {
    this.optimizationStats.totalOptimizations++;
    
    const currentAvg = this.optimizationStats.averageImprovement;
    this.optimizationStats.averageImprovement = (
      (currentAvg * (this.optimizationStats.totalOptimizations - 1) + improvement) / 
      this.optimizationStats.totalOptimizations
    );
    
    if (score > this.optimizationStats.bestScoreAchieved) {
      this.optimizationStats.bestScoreAchieved = score;
    }
  }

  getStats() {
    return { ...this.optimizationStats };
  }
}

module.exports = TransactionOrderOptimizer;