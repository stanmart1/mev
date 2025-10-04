-- Add category column to glossary
ALTER TABLE education_glossary ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'general';

-- Update existing terms with categories
UPDATE education_glossary SET category = 'mev-concepts' WHERE term IN ('MEV', 'Arbitrage', 'Sandwich Attack', 'Bundle', 'Atomic');
UPDATE education_glossary SET category = 'jito' WHERE term IN ('Jito', 'Tip');
UPDATE education_glossary SET category = 'blockchain' WHERE term IN ('Blockchain', 'Solana', 'Transaction', 'Block', 'Validator', 'Gas');
UPDATE education_glossary SET category = 'defi' WHERE term IN ('DEX', 'Liquidity', 'Pool', 'Swap', 'USDC', 'Raydium', 'Orca');
UPDATE education_glossary SET category = 'trading' WHERE term IN ('Slippage', 'Price', 'Profit', 'Fee', 'Opportunity', 'Competition');

-- Add new comprehensive terms
INSERT INTO education_glossary (term, category, simple_definition, detailed_definition, example, analogy, related_terms) VALUES
('Front-Running', 'mev-concepts', 'Placing your transaction before someone else''s', 'A strategy where a searcher detects a pending transaction and submits their own transaction with higher gas to execute first, profiting from the price impact', 'Seeing a large buy order for SOL and buying before it executes', 'Like cutting in line at a store after seeing someone with a cart full of items', '["Sandwich Attack", "MEV", "Gas"]'::jsonb),
('Back-Running', 'mev-concepts', 'Placing your transaction right after someone else''s', 'Executing a transaction immediately after a large trade to profit from the price movement it creates', 'Buying a token right after a whale purchase drives the price up', 'Like buying concert tickets right after a celebrity announces they''re attending', '["Front-Running", "MEV"]'::jsonb),
('Flash Loan', 'defi', 'Borrowing money without collateral for one transaction', 'An uncollateralized loan that must be borrowed and repaid within the same transaction block, enabling large capital strategies', 'Borrow 1M USDC, execute arbitrage, repay loan + fee, keep profit', 'Like borrowing money from a friend but having to pay it back before leaving the room', '["Arbitrage", "Liquidation"]'::jsonb),
('Block Engine', 'jito', 'System that builds blocks with MEV bundles', 'Jito''s infrastructure that receives bundles from searchers and includes them in blocks, distributing MEV rewards', 'Submitting a bundle to Jito Block Engine for execution', 'Like a special express lane at the post office', '["Jito", "Bundle", "Validator"]'::jsonb),
('MEV Kickback', 'jito', 'Sharing MEV profits with users', 'Portion of MEV profits returned to the original transaction sender through Jito', 'Getting 0.001 SOL back from a swap that generated MEV', 'Like getting a rebate on a purchase', '["Jito", "Tip", "MEV"]'::jsonb),
('Priority Fee', 'blockchain', 'Extra fee to prioritize your transaction', 'Additional fee paid to validators to increase transaction priority in the block', 'Adding 0.0001 SOL tip to get faster execution', 'Like paying extra for express shipping', '["Gas", "Tip", "Validator"]'::jsonb),
('AMM', 'defi', 'Automated Market Maker - robot that trades', 'A protocol that uses mathematical formulas to price assets and enable trading without traditional order books', 'Raydium and Orca are AMMs on Solana', 'Like a vending machine that automatically adjusts prices', '["DEX", "Liquidity", "Pool"]'::jsonb),
('Impermanent Loss', 'defi', 'Loss from providing liquidity when prices change', 'Temporary loss experienced by liquidity providers when token prices diverge from their initial ratio', 'Providing SOL/USDC liquidity and losing value as SOL price changes', 'Like losing money on a trade you haven''t closed yet', '["Liquidity", "Pool", "AMM"]'::jsonb),
('TVL', 'defi', 'Total Value Locked - money in a protocol', 'Total amount of assets deposited in a DeFi protocol, indicating its size and popularity', 'Raydium has $500M TVL', 'Like the total amount of money in all bank accounts', '["Liquidity", "Protocol", "DeFi"]'::jsonb),
('Yield Farming', 'defi', 'Earning rewards by providing liquidity', 'Strategy of providing liquidity to DeFi protocols to earn trading fees and token rewards', 'Earning 20% APY by providing liquidity to a pool', 'Like earning interest on a savings account', '["Liquidity", "Pool", "Staking"]'::jsonb),
('Maximal Extractable Value', 'mev-concepts', 'Maximum profit extractable from transaction ordering', 'The maximum value that can be extracted from block production beyond standard block rewards by including, excluding, or reordering transactions', 'Earning 2 SOL from arbitrage by ordering transactions optimally', 'Like a store manager arranging products to maximize sales', '["MEV", "Arbitrage", "Validator"]'::jsonb),
('Searcher', 'mev-concepts', 'Bot that finds MEV opportunities', 'An entity that runs bots to detect and execute MEV opportunities on the blockchain', 'A bot that monitors all DEXs for arbitrage opportunities', 'Like a treasure hunter looking for valuable opportunities', '["MEV", "Bot", "Bundle"]'::jsonb),
('Mempool', 'blockchain', 'Waiting room for pending transactions', 'Pool of unconfirmed transactions waiting to be included in a block', 'Transactions waiting to be processed by validators', 'Like a waiting room at a doctor''s office', '["Transaction", "Block", "Validator"]'::jsonb),
('Rug Pull', 'security', 'Scam where developers steal all funds', 'Fraudulent scheme where project creators drain liquidity or steal funds from investors', 'Token creator removes all liquidity and disappears', 'Like a store owner taking all the money and closing overnight', '["Scam", "Liquidity", "Security"]'::jsonb),
('Smart Contract Risk', 'security', 'Danger of bugs in code', 'Risk that smart contract code contains vulnerabilities or bugs that can be exploited', 'Contract bug allows attacker to drain funds', 'Like a lock with a hidden flaw that thieves can exploit', '["Security", "Audit", "Protocol"]'::jsonb),
('Oracle', 'defi', 'Service that provides external data', 'System that feeds real-world data to smart contracts', 'Pyth provides price data to DeFi protocols', 'Like a news reporter giving information to decision makers', '["Price", "Data", "Protocol"]'::jsonb)
ON CONFLICT (term) DO NOTHING;

-- Create categories table
CREATE TABLE IF NOT EXISTS glossary_categories (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  order_index INTEGER DEFAULT 0
);

INSERT INTO glossary_categories (slug, name, description, icon, order_index) VALUES
('mev-concepts', 'MEV Concepts', 'Core MEV strategies and concepts', '⚡', 1),
('jito', 'Jito', 'Jito-specific terms and features', '🚀', 2),
('blockchain', 'Blockchain', 'General blockchain terminology', '⛓️', 3),
('defi', 'DeFi', 'Decentralized finance concepts', '💰', 4),
('trading', 'Trading', 'Trading and market terms', '📈', 5),
('security', 'Security', 'Security and risk concepts', '🔒', 6)
ON CONFLICT (slug) DO NOTHING;
