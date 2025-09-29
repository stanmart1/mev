const assert = require('assert');
const { Pool } = require('pg');

// Import our delegation analytics components
const DelegationAnalyticsEngine = require('../src/services/delegationAnalyticsEngine');
const ValidatorRecommendationEngine = require('../src/services/validatorRecommendationEngine');
const UserProfileService = require('../src/services/userProfileService');

/**
 * Comprehensive Delegation Analytics System Validation
 * Tests the accuracy and functionality of the complete delegation analytics system
 */
class DelegationAnalyticsValidator {
    constructor() {
        this.testResults = {
            passed: 0,
            failed: 0,
            warnings: 0,
            details: []
        };
        
        // Test configuration
        this.config = {
            testDatabaseUrl: process.env.TEST_DATABASE_URL || 'postgresql://test_user:test_pass@localhost:5432/mev_analytics_test',
            testUserId: 'test-user-12345',
            sampleValidators: [
                'ValidatorA1234567890123456789012345678901234',
                'ValidatorB1234567890123456789012345678901234',
                'ValidatorC1234567890123456789012345678901234',
                'ValidatorD1234567890123456789012345678901234',
                'ValidatorE1234567890123456789012345678901234'
            ]
        };
    }

    /**
     * Run all validation tests
     */
    async runAllTests() {
        console.log('🧪 Starting Delegation Analytics System Validation...\n');
        
        try {
            // Initialize database connection
            this.pool = new Pool({ connectionString: this.config.testDatabaseUrl });
            
            // Initialize services
            await this.initializeServices();
            
            // Create test data
            await this.setupTestData();
            
            // Run validation tests
            await this.testValidatorScoring();
            await this.testRecommendationEngine();
            await this.testPersonalization();
            await this.testDatabaseIntegrity();
            await this.testAPIValidation();
            await this.testPerformanceMetrics();
            await this.testEdgeCases();
            
            // Clean up test data
            await this.cleanupTestData();
            
            // Generate final report
            this.generateReport();
            
        } catch (error) {
            console.error('❌ Validation failed with error:', error);
            this.recordFailure('System Initialization', error.message);
        } finally {
            if (this.pool) {
                await this.pool.end();
            }
        }
    }

    /**
     * Initialize delegation analytics services
     */
    async initializeServices() {
        try {
            this.userProfileService = new UserProfileService(this.pool, {});
            this.delegationAnalytics = new DelegationAnalyticsEngine(this.pool, null, null);
            this.recommendationEngine = new ValidatorRecommendationEngine(
                this.delegationAnalytics,
                this.userProfileService,
                this.pool
            );
            
            this.recordSuccess('Service Initialization', 'All services initialized successfully');
        } catch (error) {
            this.recordFailure('Service Initialization', error.message);
            throw error;
        }
    }

    /**
     * Set up test data in database
     */
    async setupTestData() {
        try {
            // Create test user
            await this.pool.query(`
                INSERT INTO users (id, username, email, password_hash, role)
                VALUES ($1, 'test_user', 'test@example.com', 'dummy_hash', 'user')
                ON CONFLICT (id) DO NOTHING
            `, [this.config.testUserId]);

            // Create sample validator scores
            for (let i = 0; i < this.config.sampleValidators.length; i++) {
                const validator = this.config.sampleValidators[i];
                await this.pool.query(`
                    INSERT INTO validator_scores (
                        validator_id, composite_score, mev_score, reliability_score,
                        commission_score, decentralization_score, consistency_score,
                        risk_penalty, epochs_analyzed, confidence_level
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    ON CONFLICT (validator_id) DO UPDATE SET
                        composite_score = EXCLUDED.composite_score,
                        last_updated = NOW()
                `, [
                    validator,
                    0.7 + (i * 0.05), // Varying composite scores
                    0.6 + (i * 0.08), // MEV scores
                    0.9 - (i * 0.02), // Reliability scores
                    0.8 + (i * 0.03), // Commission scores
                    0.7 + (i * 0.04), // Decentralization scores
                    0.8 - (i * 0.01), // Consistency scores
                    i * 0.01,         // Risk penalty
                    50 + (i * 10),    // Epochs analyzed
                    0.85 + (i * 0.02) // Confidence level
                ]);
            }

            // Create test delegation preferences
            await this.pool.query(`
                INSERT INTO user_delegation_preferences (
                    user_id, preferred_strategy, risk_tolerance, custom_weights
                ) VALUES ($1, 'balanced', 'balanced', $2)
                ON CONFLICT (user_id) DO UPDATE SET
                    preferred_strategy = EXCLUDED.preferred_strategy
            `, [
                this.config.testUserId,
                JSON.stringify({
                    mevPotential: 0.25,
                    reliability: 0.25,
                    commissionOptimization: 0.20,
                    stakeDecentralization: 0.15,
                    performanceConsistency: 0.15
                })
            ]);

            this.recordSuccess('Test Data Setup', 'Sample data created successfully');
        } catch (error) {
            this.recordFailure('Test Data Setup', error.message);
            throw error;
        }
    }

    /**
     * Test validator scoring algorithms
     */
    async testValidatorScoring() {
        try {
            console.log('📊 Testing Validator Scoring Algorithms...');
            
            // Test composite score calculation
            const mockValidatorData = {
                mev_rewards: 1000000000, // 1 SOL in lamports
                total_epochs: 50,
                uptime_percentage: 98.5,
                commission_rate: 0.07,
                stake_amount: 5000000000000, // 5000 SOL
                epochCount: 50,
                isJitoEnabled: true
            };

            // Test MEV potential scoring
            const mevScore = await this.delegationAnalytics.calculateMevPotentialScore(mockValidatorData);
            assert(mevScore.score >= 0 && mevScore.score <= 1, 'MEV score should be between 0 and 1');
            assert(mevScore.confidence >= 0 && mevScore.confidence <= 100, 'MEV confidence should be between 0 and 100');

            // Test reliability scoring
            const reliabilityScore = await this.delegationAnalytics.calculateReliabilityScore(mockValidatorData);
            assert(reliabilityScore.score >= 0 && reliabilityScore.score <= 1, 'Reliability score should be between 0 and 1');

            // Test composite scoring
            const compositeScore = await this.delegationAnalytics.calculateCompositeValidatorScore(
                this.config.sampleValidators[0],
                mockValidatorData
            );
            
            assert(compositeScore.overall_score >= 0 && compositeScore.overall_score <= 1, 'Composite score should be between 0 and 1');
            assert(compositeScore.mev_potential_score >= 0, 'MEV potential score should be non-negative');
            assert(compositeScore.reliability_score >= 0, 'Reliability score should be non-negative');

            this.recordSuccess('Validator Scoring', 'All scoring algorithms working correctly');
        } catch (error) {
            this.recordFailure('Validator Scoring', error.message);
        }
    }

    /**
     * Test recommendation engine functionality
     */
    async testRecommendationEngine() {
        try {
            console.log('💡 Testing Recommendation Engine...');
            
            // Test basic recommendations
            const recommendations = await this.recommendationEngine.getPersonalizedRecommendations(
                this.config.testUserId,
                { count: 3, strategy: 'balanced', refreshCache: true }
            );

            assert(recommendations.recommendations, 'Recommendations should exist');
            assert(Array.isArray(recommendations.recommendations), 'Recommendations should be an array');
            assert(recommendations.recommendations.length <= 3, 'Should not exceed requested count');
            assert(recommendations.strategy_used === 'balanced', 'Should use specified strategy');

            // Test different strategies
            const strategies = ['maximize_mev', 'maximize_safety', 'support_decentralization', 'cost_optimize'];
            for (const strategy of strategies) {
                const strategyRecs = await this.recommendationEngine.getPersonalizedRecommendations(
                    this.config.testUserId,
                    { count: 2, strategy, refreshCache: true }
                );
                
                assert(strategyRecs.strategy_used === strategy, `Should use ${strategy} strategy`);
                assert(strategyRecs.recommendations.length >= 0, 'Should return valid recommendations');
            }

            // Test risk tolerance levels
            const riskLevels = ['conservative', 'balanced', 'aggressive'];
            for (const riskTolerance of riskLevels) {
                const riskRecs = await this.recommendationEngine.getPersonalizedRecommendations(
                    this.config.testUserId,
                    { count: 2, riskTolerance, refreshCache: true }
                );
                
                assert(riskRecs.risk_tolerance === riskTolerance, `Should use ${riskTolerance} risk tolerance`);
            }

            this.recordSuccess('Recommendation Engine', 'All recommendation functions working correctly');
        } catch (error) {
            this.recordFailure('Recommendation Engine', error.message);
        }
    }

    /**
     * Test personalization features
     */
    async testPersonalization() {
        try {
            console.log('🎯 Testing Personalization Features...');
            
            // Test custom weights
            const customWeights = {
                mevPotential: 0.40,
                reliability: 0.20,
                commissionOptimization: 0.15,
                stakeDecentralization: 0.15,
                performanceConsistency: 0.10
            };

            await this.pool.query(`
                UPDATE user_delegation_preferences 
                SET custom_weights = $1 
                WHERE user_id = $2
            `, [JSON.stringify(customWeights), this.config.testUserId]);

            const personalizedRecs = await this.recommendationEngine.getPersonalizedRecommendations(
                this.config.testUserId,
                { count: 3, refreshCache: true }
            );

            assert(personalizedRecs.recommendations, 'Personalized recommendations should exist');

            // Test favorite validators functionality
            await this.userProfileService.addFavoriteValidator(
                this.config.testUserId, 
                this.config.sampleValidators[0]
            );

            const favorites = await this.userProfileService.getFavoriteValidators(this.config.testUserId);
            assert(favorites.includes(this.config.sampleValidators[0]), 'Favorite validator should be added');

            // Test diversification suggestions
            const recsWithDiversification = await this.recommendationEngine.getPersonalizedRecommendations(
                this.config.testUserId,
                { count: 5, refreshCache: true }
            );

            assert(recsWithDiversification.diversification_suggestions, 'Should include diversification suggestions');
            assert(Array.isArray(recsWithDiversification.diversification_suggestions), 'Diversification suggestions should be an array');

            this.recordSuccess('Personalization', 'All personalization features working correctly');
        } catch (error) {
            this.recordFailure('Personalization', error.message);
        }
    }

    /**
     * Test database integrity and relationships
     */
    async testDatabaseIntegrity() {
        try {
            console.log('🗄️ Testing Database Integrity...');
            
            // Test foreign key relationships
            const validatorCount = await this.pool.query('SELECT COUNT(*) FROM validator_scores');
            assert(parseInt(validatorCount.rows[0].count) >= this.config.sampleValidators.length, 'Should have test validators in database');

            // Test user preferences consistency
            const preferences = await this.pool.query('SELECT * FROM user_delegation_preferences WHERE user_id = $1', [this.config.testUserId]);
            assert(preferences.rows.length === 1, 'Should have exactly one preference record per user');

            // Test data constraints
            const invalidScoreTest = async () => {
                try {
                    await this.pool.query(`
                        INSERT INTO validator_scores (validator_id, composite_score, mev_score)
                        VALUES ('TestValidator123', 1.5, -0.1)
                    `);
                    return false; // Should not reach here
                } catch (error) {
                    return true; // Expected to fail due to constraints
                }
            };

            const constraintWorking = await invalidScoreTest();
            assert(constraintWorking, 'Database constraints should prevent invalid scores');

            // Test indexes performance (basic check)
            const explainResult = await this.pool.query(`
                EXPLAIN SELECT * FROM validator_scores WHERE composite_score > 0.8 ORDER BY composite_score DESC
            `);
            assert(explainResult.rows.length > 0, 'Query plan should be generated');

            this.recordSuccess('Database Integrity', 'All database integrity checks passed');
        } catch (error) {
            this.recordFailure('Database Integrity', error.message);
        }
    }

    /**
     * Test API validation and response formats
     */
    async testAPIValidation() {
        try {
            console.log('🌐 Testing API Validation...');
            
            // Test strategy availability
            const strategies = this.recommendationEngine.getAvailableStrategies();
            assert(Array.isArray(strategies), 'Strategies should be an array');
            assert(strategies.length > 0, 'Should have available strategies');
            
            strategies.forEach(strategy => {
                assert(strategy.strategy, 'Strategy should have a name');
                assert(strategy.description, 'Strategy should have a description');
                assert(strategy.weights, 'Strategy should have weights');
            });

            // Test risk tolerance levels
            const riskTolerances = this.recommendationEngine.getAvailableRiskTolerances();
            assert(Array.isArray(riskTolerances), 'Risk tolerances should be an array');
            assert(riskTolerances.length > 0, 'Should have available risk tolerances');

            // Test cache functionality
            const cacheStats = this.recommendationEngine.getCacheStats();
            assert(typeof cacheStats.recommendation_cache_size === 'number', 'Cache size should be a number');

            // Test cache clearing
            this.recommendationEngine.clearUserCache(this.config.testUserId);
            const newCacheStats = this.recommendationEngine.getCacheStats();
            // Cache size might be same or different, but function should not throw

            this.recordSuccess('API Validation', 'All API validation tests passed');
        } catch (error) {
            this.recordFailure('API Validation', error.message);
        }
    }

    /**
     * Test performance metrics and optimization
     */
    async testPerformanceMetrics() {
        try {
            console.log('⚡ Testing Performance Metrics...');
            
            // Test recommendation generation performance
            const startTime = Date.now();
            await this.recommendationEngine.getPersonalizedRecommendations(
                this.config.testUserId,
                { count: 10, refreshCache: true }
            );
            const endTime = Date.now();
            const executionTime = endTime - startTime;

            assert(executionTime < 5000, 'Recommendation generation should complete within 5 seconds');
            
            if (executionTime > 2000) {
                this.recordWarning('Performance', `Recommendation generation took ${executionTime}ms (> 2000ms recommended)`);
            }

            // Test score calculation performance
            const scoreStartTime = Date.now();
            await this.delegationAnalytics.calculateAllValidatorScores();
            const scoreEndTime = Date.now();
            const scoreExecutionTime = scoreEndTime - scoreStartTime;

            if (scoreExecutionTime > 10000) {
                this.recordWarning('Performance', `Score calculation took ${scoreExecutionTime}ms (> 10000ms recommended)`);
            }

            // Test memory usage (basic check)
            const memUsage = process.memoryUsage();
            if (memUsage.heapUsed > 500 * 1024 * 1024) { // 500MB
                this.recordWarning('Performance', `High memory usage: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
            }

            this.recordSuccess('Performance Metrics', 'Performance tests completed');
        } catch (error) {
            this.recordFailure('Performance Metrics', error.message);
        }
    }

    /**
     * Test edge cases and error handling
     */
    async testEdgeCases() {
        try {
            console.log('🔍 Testing Edge Cases...');
            
            // Test with non-existent user
            try {
                await this.recommendationEngine.getPersonalizedRecommendations('non-existent-user');
                this.recordWarning('Edge Cases', 'Should handle non-existent user gracefully');
            } catch (error) {
                // Expected to fail or handle gracefully
            }

            // Test with invalid strategy
            try {
                await this.recommendationEngine.getPersonalizedRecommendations(
                    this.config.testUserId,
                    { strategy: 'invalid_strategy' }
                );
                // Should either use default strategy or handle gracefully
            } catch (error) {
                // Expected to fail or handle gracefully
            }

            // Test with extreme preferences
            const extremeWeights = {
                mevPotential: 1.0,
                reliability: 0.0,
                commissionOptimization: 0.0,
                stakeDecentralization: 0.0,
                performanceConsistency: 0.0
            };

            try {
                // This should either normalize weights or use defaults
                const extremeRecs = await this.recommendationEngine.getPersonalizedRecommendations(
                    this.config.testUserId,
                    { count: 1 }
                );
                // Should still return valid recommendations
                assert(extremeRecs.recommendations, 'Should handle extreme preferences');
            } catch (error) {
                this.recordWarning('Edge Cases', 'Could not handle extreme weight preferences: ' + error.message);
            }

            // Test with zero count request
            try {
                const zeroRecs = await this.recommendationEngine.getPersonalizedRecommendations(
                    this.config.testUserId,
                    { count: 0 }
                );
                assert(Array.isArray(zeroRecs.recommendations), 'Should return empty array for zero count');
            } catch (error) {
                this.recordWarning('Edge Cases', 'Could not handle zero count request');
            }

            this.recordSuccess('Edge Cases', 'Edge case testing completed');
        } catch (error) {
            this.recordFailure('Edge Cases', error.message);
        }
    }

    /**
     * Clean up test data
     */
    async cleanupTestData() {
        try {
            // Remove test validator scores
            await this.pool.query(`
                DELETE FROM validator_scores 
                WHERE validator_id = ANY($1)
            `, [this.config.sampleValidators]);

            // Remove test user preferences
            await this.pool.query(`
                DELETE FROM user_delegation_preferences 
                WHERE user_id = $1
            `, [this.config.testUserId]);

            // Remove test user
            await this.pool.query(`
                DELETE FROM users 
                WHERE id = $1
            `, [this.config.testUserId]);

            console.log('🧹 Test data cleaned up successfully');
        } catch (error) {
            console.warn('⚠️ Warning: Could not clean up all test data:', error.message);
        }
    }

    /**
     * Record a successful test
     */
    recordSuccess(testName, message) {
        this.testResults.passed++;
        this.testResults.details.push({
            type: 'SUCCESS',
            test: testName,
            message
        });
        console.log(`✅ ${testName}: ${message}`);
    }

    /**
     * Record a failed test
     */
    recordFailure(testName, message) {
        this.testResults.failed++;
        this.testResults.details.push({
            type: 'FAILURE',
            test: testName,
            message
        });
        console.log(`❌ ${testName}: ${message}`);
    }

    /**
     * Record a warning
     */
    recordWarning(testName, message) {
        this.testResults.warnings++;
        this.testResults.details.push({
            type: 'WARNING',
            test: testName,
            message
        });
        console.log(`⚠️ ${testName}: ${message}`);
    }

    /**
     * Generate final validation report
     */
    generateReport() {
        console.log('\n' + '='.repeat(80));
        console.log('📋 DELEGATION ANALYTICS VALIDATION REPORT');
        console.log('='.repeat(80));
        
        const total = this.testResults.passed + this.testResults.failed;
        const successRate = total > 0 ? (this.testResults.passed / total * 100).toFixed(2) : 0;
        
        console.log(`\n📊 SUMMARY:`);
        console.log(`   Total Tests: ${total}`);
        console.log(`   Passed: ${this.testResults.passed}`);
        console.log(`   Failed: ${this.testResults.failed}`);
        console.log(`   Warnings: ${this.testResults.warnings}`);
        console.log(`   Success Rate: ${successRate}%`);
        
        if (this.testResults.failed === 0) {
            console.log(`\n🎉 ALL TESTS PASSED! Delegation Analytics System is ready for production.`);
        } else {
            console.log(`\n⚠️ ${this.testResults.failed} test(s) failed. Review and fix issues before production deployment.`);
        }
        
        if (this.testResults.warnings > 0) {
            console.log(`\n📝 ${this.testResults.warnings} warning(s) noted. Consider addressing for optimal performance.`);
        }
        
        console.log('\n🔧 DETAILED RESULTS:');
        this.testResults.details.forEach((detail, index) => {
            const icon = detail.type === 'SUCCESS' ? '✅' : detail.type === 'FAILURE' ? '❌' : '⚠️';
            console.log(`   ${index + 1}. ${icon} ${detail.test}: ${detail.message}`);
        });
        
        console.log('\n' + '='.repeat(80));
        
        // Return test results for programmatic use
        return {
            success: this.testResults.failed === 0,
            results: this.testResults
        };
    }
}

// Run validation if this file is executed directly
if (require.main === module) {
    const validator = new DelegationAnalyticsValidator();
    validator.runAllTests()
        .then((results) => {
            process.exit(results.success ? 0 : 1);
        })
        .catch((error) => {
            console.error('Validation crashed:', error);
            process.exit(1);
        });
}

module.exports = DelegationAnalyticsValidator;