-- Migration: Add Simple Glossary for Beginner Terms
-- Description: Add easy-to-understand definitions for all technical terms used in beginner courses

-- Create glossary table
CREATE TABLE IF NOT EXISTS education_glossary (
  id SERIAL PRIMARY KEY,
  term VARCHAR(255) UNIQUE NOT NULL,
  simple_definition TEXT NOT NULL,
  detailed_definition TEXT,
  example TEXT,
  analogy TEXT,
  related_terms JSONB DEFAULT '[]',
  difficulty VARCHAR(50) DEFAULT 'beginner',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert simple definitions (explained like to a 9-year-old)
INSERT INTO education_glossary (term, simple_definition, detailed_definition, example, analogy, related_terms, difficulty) VALUES

('MEV', 
 'Extra money you can make by choosing which orders to do first, like being first in line at a store.',
 'Maximum Extractable Value - the extra profit someone can make by deciding the order of transactions in a block.',
 'If you see someone wants to buy a toy for $10 and someone else is selling it for $8, you can buy it first and sell it to them for $10, making $2 profit.',
 'Like being the teacher who decides who goes first in the lunch line - you can help your friends get the best food before it runs out.',
 '["Arbitrage", "Block", "Transaction", "Validator"]',
 'beginner'),

('Blockchain',
 'A special notebook that everyone can see and no one can erase or change what''s already written.',
 'A digital ledger that records all transactions in a way that makes them permanent and visible to everyone.',
 'Like a class attendance book where every student can see who came to school, but no one can erase names once they''re written.',
 'Imagine a chain of boxes where each box contains a list of who traded what. Once a box is sealed, you can''t change what''s inside.',
 '["Block", "Transaction", "Solana"]',
 'beginner'),

('Solana',
 'A super-fast blockchain - like a race car compared to a regular car.',
 'A high-speed blockchain that can process thousands of transactions per second.',
 'While other blockchains take 12 seconds to add new information, Solana does it in less than half a second.',
 'If Ethereum is like sending a letter by mail (takes days), Solana is like sending a text message (instant).',
 '["Blockchain", "Transaction", "Validator"]',
 'beginner'),

('Transaction',
 'When you send or trade something, like giving your friend a toy in exchange for their candy.',
 'A record of transferring digital money or items from one person to another.',
 'Sending 5 SOL to your friend is a transaction, just like giving them $5 in real life.',
 'Like writing "I gave Sarah my red crayon" in a notebook that everyone can see.',
 '["Blockchain", "Block", "Fee"]',
 'beginner'),

('Block',
 'A box that holds a bunch of transactions, like a page in a notebook.',
 'A group of transactions bundled together and added to the blockchain.',
 'Every 0.4 seconds on Solana, all the recent transactions get put into a new block.',
 'Like a page in a diary - once the page is full, you turn to a new page and keep writing.',
 '["Blockchain", "Transaction", "Validator"]',
 'beginner'),

('Validator',
 'A person who checks that everyone is playing fair and following the rules.',
 'A computer that verifies transactions and adds new blocks to the blockchain.',
 'Like a referee in a soccer game who makes sure no one cheats and keeps score.',
 'Think of them as teachers who check your homework and give you a gold star if it''s correct.',
 '["Block", "Blockchain", "Jito"]',
 'beginner'),

('Arbitrage',
 'Buying something cheap at one store and selling it for more at another store.',
 'Making profit by buying an asset at a lower price in one place and selling it at a higher price in another.',
 'If apples cost $1 at Store A but $2 at Store B, you buy from A and sell to B, making $1 profit per apple.',
 'Like buying Pokemon cards at a yard sale for $5 and selling them at school for $10.',
 '["MEV", "DEX", "Profit"]',
 'beginner'),

('DEX',
 'A robot store where you can trade coins without needing a person to help you.',
 'Decentralized Exchange - an automated platform where people can trade cryptocurrencies directly with each other.',
 'Raydium and Orca are DEXs where you can swap SOL for USDC automatically.',
 'Like a vending machine for trading - you put in one coin and get another coin out, no cashier needed.',
 '["Raydium", "Orca", "Swap", "Liquidity"]',
 'beginner'),

('Jito',
 'A special helper that lets you do multiple things at once, and if one fails, none of them happen.',
 'A protocol that enables atomic transaction bundles on Solana - all transactions succeed together or all fail together.',
 'You want to buy a toy and sell another toy. Jito makes sure both happen, or neither happens.',
 'Like a magic spell that only works if you say ALL the magic words correctly - miss one word and nothing happens.',
 '["Bundle", "Validator", "Atomic"]',
 'beginner'),

('Bundle',
 'A group of actions tied together with a rope - they all happen together or not at all.',
 'Multiple transactions grouped together that must all execute successfully or none execute.',
 'Buy SOL on one DEX, sell on another DEX, and pay a tip - all three must work or none happen.',
 'Like a combo meal at a restaurant - you get the burger, fries, and drink together, not separately.',
 '["Jito", "Transaction", "Atomic"]',
 'beginner'),

('Atomic',
 'All or nothing - like a light switch that''s either ON or OFF, never in between.',
 'A property where multiple actions either all succeed together or all fail together.',
 'If you''re trading 3 items and one trade fails, all 3 trades are cancelled.',
 'Like a group project - either everyone does their part and you all get an A, or if one person doesn''t do it, the whole project fails.',
 '["Bundle", "Transaction"]',
 'beginner'),

('Tip',
 'Extra money you give to someone to make sure they help you first.',
 'An additional payment to validators to prioritize including your bundle in a block.',
 'If you tip 1 SOL, validators are more likely to include your bundle before others.',
 'Like giving the pizza delivery person extra money so they bring your pizza first.',
 '["Jito", "Bundle", "Validator", "Priority"]',
 'beginner'),

('Profit',
 'The money you have left after you sell something for more than you paid for it.',
 'The amount of money gained after subtracting all costs from revenue.',
 'Buy for $8, sell for $10, pay $0.50 in fees = $1.50 profit.',
 'Like buying lemonade ingredients for $5, selling lemonade for $10, and keeping the $5 difference.',
 '["Arbitrage", "Fee", "Revenue"]',
 'beginner'),

('Fee',
 'A small amount of money you pay to use a service, like paying to ride a bus.',
 'A charge for processing a transaction on the blockchain.',
 'Every time you trade on Solana, you pay a tiny fee (like $0.0001) to the network.',
 'Like paying a quarter to use a gumball machine - the quarter is the fee to use the machine.',
 '["Transaction", "Gas", "Network"]',
 'beginner'),

('Liquidity',
 'How easy it is to buy or sell something quickly without changing the price.',
 'The availability of assets to trade - high liquidity means you can trade large amounts easily.',
 'A pool with lots of SOL and USDC has high liquidity - you can trade big amounts easily.',
 'Like a popular trading card - if lots of kids want it, you can trade it easily. If no one wants it, it''s hard to trade.',
 '["DEX", "Pool", "Slippage"]',
 'beginner'),

('Slippage',
 'When the price changes between when you click "buy" and when the trade actually happens.',
 'The difference between expected price and actual execution price of a trade.',
 'You try to buy at $100 but by the time your order goes through, the price is $101.',
 'Like when you''re about to buy the last cookie, but someone grabs it first, so you have to pay more for a different cookie.',
 '["DEX", "Price", "Trade"]',
 'beginner'),

('Wallet',
 'A digital piggy bank that holds your cryptocurrency and lets you send or receive it.',
 'A software application that stores your private keys and allows you to manage your crypto assets.',
 'Your Phantom or Solflare wallet holds your SOL and lets you trade or send it.',
 'Like a real wallet that holds your money and credit cards, but for digital money.',
 '["Private Key", "Public Key", "SOL"]',
 'beginner'),

('SOL',
 'The money used on the Solana blockchain, like dollars are used in America.',
 'The native cryptocurrency of the Solana blockchain.',
 'You need SOL to pay for transactions on Solana, just like you need dollars to buy things at a store.',
 'Like tickets at an arcade - you need SOL tickets to play games (do transactions) on Solana.',
 '["Solana", "Cryptocurrency", "Token"]',
 'beginner'),

('USDC',
 'Digital dollars - each USDC is always worth $1, like a digital version of a dollar bill.',
 'A stablecoin pegged to the US dollar, meaning 1 USDC = $1 USD.',
 'If you have 100 USDC, you have the digital equivalent of $100.',
 'Like having a $1 bill in your video game - it''s not real money but it represents $1.',
 '["Stablecoin", "Token", "Dollar"]',
 'beginner'),

('Raydium',
 'One of the robot stores (DEX) on Solana where you can trade coins.',
 'A popular decentralized exchange on Solana for swapping tokens.',
 'You can go to Raydium to trade your SOL for USDC or other tokens.',
 'Like a specific vending machine brand - this one is called Raydium and it''s on the Solana playground.',
 '["DEX", "Solana", "Swap"]',
 'beginner'),

('Orca',
 'Another robot store (DEX) on Solana, like Raydium but a different one.',
 'A user-friendly decentralized exchange on Solana known for its simple interface.',
 'Orca is another place to trade tokens, sometimes with different prices than Raydium.',
 'Like having two toy stores in town - sometimes one has better prices than the other.',
 '["DEX", "Solana", "Swap"]',
 'beginner'),

('Swap',
 'Trading one type of coin for another type of coin.',
 'Exchanging one cryptocurrency for another.',
 'Swapping 10 SOL for 1000 USDC means trading your SOL to get USDC.',
 'Like trading your apple for your friend''s orange at lunch.',
 '["DEX", "Trade", "Exchange"]',
 'beginner'),

('Price',
 'How much one thing costs in terms of another thing.',
 'The amount of one asset needed to buy one unit of another asset.',
 'If SOL price is $100, you need $100 to buy 1 SOL.',
 'Like how many quarters you need to buy a candy bar - if it costs 4 quarters, that''s the price.',
 '["Value", "Market", "Trade"]',
 'beginner'),

('Opportunity',
 'A chance to make money by doing something at the right time.',
 'A situation where you can profit by executing a specific strategy.',
 'When SOL costs less on one DEX than another, that''s an arbitrage opportunity.',
 'Like finding a $20 bill on the ground - it''s a chance to get money if you''re quick.',
 '["MEV", "Arbitrage", "Profit"]',
 'beginner'),

('Competition',
 'When multiple people are trying to do the same thing, like racing to be first.',
 'Multiple searchers trying to capture the same MEV opportunity.',
 'If 10 people see the same arbitrage opportunity, they''re competing to do it first.',
 'Like when the teacher says "first person to raise their hand gets a prize" - everyone competes to be fastest.',
 '["Searcher", "MEV", "Speed"]',
 'beginner');

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_glossary_term ON education_glossary(term);
CREATE INDEX IF NOT EXISTS idx_glossary_difficulty ON education_glossary(difficulty);

-- Add glossary reference to module content
ALTER TABLE module_content ADD COLUMN IF NOT EXISTS glossary_terms JSONB DEFAULT '[]';

-- Update Module 1 content to reference glossary terms
UPDATE module_content SET glossary_terms = '["MEV", "Blockchain", "Solana", "Transaction", "Validator"]' WHERE module_id = 1 AND section_order = 1;
UPDATE module_content SET glossary_terms = '["Arbitrage", "DEX", "Liquidation", "Sandwich Attack"]' WHERE module_id = 1 AND section_order = 2;
UPDATE module_content SET glossary_terms = '["Solana", "Block", "Transaction", "Fee"]' WHERE module_id = 1 AND section_order = 3;

-- Update Module 2 content to reference glossary terms
UPDATE module_content SET glossary_terms = '["Jito", "Bundle", "Atomic", "Validator"]' WHERE module_id = 2 AND section_order = 1;
UPDATE module_content SET glossary_terms = '["Bundle", "Transaction", "Tip", "Atomic"]' WHERE module_id = 2 AND section_order = 2;
UPDATE module_content SET glossary_terms = '["Bundle", "Swap", "DEX", "Tip"]' WHERE module_id = 2 AND section_order = 3;
