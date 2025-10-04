import React, { useState } from 'react';
import { Search, Filter, BookOpen } from 'lucide-react';

const CATEGORIES = [
  { slug: 'mev', name: 'MEV Basics', icon: '⚡' },
  { slug: 'defi', name: 'DeFi', icon: '💰' },
  { slug: 'solana', name: 'Solana', icon: '◎' },
  { slug: 'trading', name: 'Trading', icon: '📈' }
];

const TERMS = [
  {
    id: 1,
    term: 'MEV',
    category: 'mev',
    simple_definition: 'Maximum Extractable Value - profit extracted by reordering, including, or excluding transactions in a block.',
    detailed_definition: 'MEV represents the maximum value that can be extracted from block production in excess of the standard block reward and gas fees by including, excluding, and changing the order of transactions in a block.',
    example: 'A searcher spots a large swap on a DEX and places their own transaction before it to profit from the price movement.',
    related_terms: ['Arbitrage', 'Front-running', 'Sandwich Attack']
  },
  {
    id: 2,
    term: 'Arbitrage',
    category: 'trading',
    simple_definition: 'Buying and selling the same asset on different markets to profit from price differences.',
    detailed_definition: 'In MEV context, arbitrage involves detecting price discrepancies for the same token pair across different DEXs and executing trades to capture the price difference as profit.',
    example: 'SOL/USDC trades at $100 on Raydium but $102 on Orca. Buy on Raydium, sell on Orca for $2 profit per SOL.',
    related_terms: ['DEX', 'Liquidity Pool', 'Slippage']
  },
  {
    id: 3,
    term: 'Sandwich Attack',
    category: 'mev',
    simple_definition: 'Placing transactions before and after a target transaction to profit from its price impact.',
    detailed_definition: 'A sandwich attack involves front-running a victim\'s transaction with a buy order, letting the victim\'s transaction execute (pushing the price up), then immediately selling at the higher price.',
    example: 'User wants to buy 100 SOL. Attacker buys 50 SOL first, user buys at higher price, attacker sells 50 SOL for profit.',
    related_terms: ['Front-running', 'Slippage', 'MEV']
  },
  {
    id: 4,
    term: 'Jito',
    category: 'solana',
    simple_definition: 'A Solana MEV infrastructure that allows validators to accept bundles of transactions.',
    detailed_definition: 'Jito provides a block engine that enables searchers to submit transaction bundles with tips to validators, ensuring atomic execution and fair MEV distribution.',
    example: 'A searcher submits an arbitrage bundle through Jito with a 0.01 SOL tip to ensure execution.',
    related_terms: ['Bundle', 'Validator', 'Block Engine']
  },
  {
    id: 5,
    term: 'Liquidation',
    category: 'defi',
    simple_definition: 'Closing an undercollateralized loan position by selling the collateral.',
    detailed_definition: 'When a borrower\'s collateral value falls below the required threshold, their position can be liquidated. Liquidators repay the debt and receive the collateral plus a bonus.',
    example: 'User borrows 1000 USDC with 2 SOL collateral. SOL price drops, position becomes liquidatable. Liquidator repays debt and gets 2 SOL plus 5% bonus.',
    related_terms: ['Collateral', 'Lending Protocol', 'Health Factor']
  },
  {
    id: 6,
    term: 'Slippage',
    category: 'trading',
    simple_definition: 'The difference between expected and actual execution price of a trade.',
    detailed_definition: 'Slippage occurs when market conditions change between transaction submission and execution, resulting in a different price than expected. Larger trades typically experience more slippage.',
    example: 'You expect to buy SOL at $100 but due to slippage, you actually pay $101.',
    related_terms: ['Liquidity', 'Price Impact', 'AMM']
  },
  {
    id: 7,
    term: 'Bundle',
    category: 'mev',
    simple_definition: 'A group of transactions submitted together to execute atomically.',
    detailed_definition: 'Bundles ensure multiple transactions execute in a specific order without other transactions in between. If any transaction fails, the entire bundle reverts.',
    example: 'An arbitrage bundle: 1) Borrow flash loan, 2) Buy on DEX A, 3) Sell on DEX B, 4) Repay loan.',
    related_terms: ['Atomic Execution', 'Jito', 'Transaction Ordering']
  },
  {
    id: 8,
    term: 'DEX',
    category: 'defi',
    simple_definition: 'Decentralized Exchange - a platform for trading tokens without intermediaries.',
    detailed_definition: 'DEXs use smart contracts and liquidity pools to enable peer-to-peer token swaps. Popular Solana DEXs include Raydium, Orca, and Jupiter.',
    example: 'Raydium is a DEX where you can swap SOL for USDC directly from your wallet.',
    related_terms: ['AMM', 'Liquidity Pool', 'Swap']
  },
  {
    id: 9,
    term: 'Front-running',
    category: 'mev',
    simple_definition: 'Placing your transaction before someone else\'s to profit from their action.',
    detailed_definition: 'Front-running involves observing pending transactions and submitting your own transaction with higher priority to execute first and profit from the price movement.',
    example: 'Seeing a large buy order pending, you buy first, then sell after their order pushes the price up.',
    related_terms: ['MEV', 'Transaction Ordering', 'Sandwich Attack']
  },
  {
    id: 10,
    term: 'Validator',
    category: 'solana',
    simple_definition: 'A node that processes transactions and produces blocks on the Solana network.',
    detailed_definition: 'Validators stake SOL to participate in consensus, validate transactions, and produce blocks. They earn rewards from transaction fees and can accept MEV tips through Jito.',
    example: 'A validator running Jito can accept bundles from searchers and earn additional tips.',
    related_terms: ['Staking', 'Jito', 'Block Production']
  },
  {
    id: 11,
    term: 'AMM',
    category: 'defi',
    simple_definition: 'Automated Market Maker - algorithm that prices assets in a liquidity pool.',
    detailed_definition: 'AMMs use mathematical formulas (like x*y=k) to determine token prices based on pool reserves, enabling decentralized trading without order books.',
    example: 'Raydium uses an AMM model where prices adjust automatically based on supply and demand.',
    related_terms: ['DEX', 'Liquidity Pool', 'Constant Product']
  },
  {
    id: 12,
    term: 'Gas Fees',
    category: 'solana',
    simple_definition: 'Transaction fees paid to validators for processing transactions.',
    detailed_definition: 'On Solana, gas fees are very low (typically 0.000005 SOL) compared to other blockchains. Fees are paid in SOL and go to validators.',
    example: 'A swap transaction on Solana costs about 0.000005 SOL in gas fees.',
    related_terms: ['Transaction', 'Validator', 'Priority Fee']
  }
];

export default function Glossary() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredTerms = TERMS.filter(term => {
    const matchesSearch = term.term.toLowerCase().includes(search.toLowerCase()) ||
                         term.simple_definition.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || term.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });



  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">MEV Glossary</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Comprehensive dictionary of MEV and DeFi terms
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search terms..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map(cat => (
                <option key={cat.slug} value={cat.slug}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredTerms.map(term => (
          <div key={term.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {term.term}
                </h3>
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  {CATEGORIES.find(c => c.slug === term.category)?.name || term.category}
                </p>
              </div>
              <BookOpen className="w-5 h-5 text-gray-400" />
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Simple Definition:
                </p>
                <p className="text-gray-600 dark:text-gray-400">{term.simple_definition}</p>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Detailed:
                </p>
                <p className="text-gray-600 dark:text-gray-400">{term.detailed_definition}</p>
              </div>

              {term.example && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-3">
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-1">
                    Example:
                  </p>
                  <p className="text-sm text-blue-800 dark:text-blue-400">{term.example}</p>
                </div>
              )}

              {term.analogy && (
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded p-3">
                  <p className="text-sm font-semibold text-purple-900 dark:text-purple-300 mb-1">
                    Analogy:
                  </p>
                  <p className="text-sm text-purple-800 dark:text-purple-400">{term.analogy}</p>
                </div>
              )}

              {term.related_terms && term.related_terms.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Related:</span>
                  {term.related_terms.map(related => (
                    <span
                      key={related}
                      className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm text-gray-700 dark:text-gray-300"
                    >
                      {related}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredTerms.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No terms found matching your search
        </div>
      )}
    </div>
  );
}
