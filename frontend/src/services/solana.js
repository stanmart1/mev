import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import config from '../config';

class SolanaService {
  constructor() {
    this.connection = new Connection(config.solana.rpcUrl, 'confirmed');
  }

  async getBalance(publicKey) {
    try {
      const balance = await this.connection.getBalance(new PublicKey(publicKey));
      return balance / 1e9; // Convert lamports to SOL
    } catch (error) {
      console.error('Error getting balance:', error);
      return 0;
    }
  }

  async getTokenAccounts(publicKey) {
    try {
      const accounts = await this.connection.getParsedTokenAccountsByOwner(
        new PublicKey(publicKey),
        { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
      );
      
      return accounts.value.map(account => ({
        mint: account.account.data.parsed.info.mint,
        amount: account.account.data.parsed.info.tokenAmount.uiAmount,
        decimals: account.account.data.parsed.info.tokenAmount.decimals
      }));
    } catch (error) {
      console.error('Error getting token accounts:', error);
      return [];
    }
  }

  async sendTransaction(transaction, wallet) {
    try {
      const { blockhash } = await this.connection.getRecentBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = wallet.publicKey;

      const signed = await wallet.signTransaction(transaction);
      const signature = await this.connection.sendRawTransaction(signed.serialize());
      
      await this.connection.confirmTransaction(signature);
      return signature;
    } catch (error) {
      console.error('Error sending transaction:', error);
      throw error;
    }
  }

  async signMessage(message, wallet) {
    try {
      const encodedMessage = new TextEncoder().encode(message);
      const signature = await wallet.signMessage(encodedMessage);
      return signature;
    } catch (error) {
      console.error('Error signing message:', error);
      throw error;
    }
  }

  async getNetworkInfo() {
    try {
      const [slot, blockTime, epochInfo] = await Promise.all([
        this.connection.getSlot(),
        this.connection.getBlockTime(await this.connection.getSlot()),
        this.connection.getEpochInfo()
      ]);

      return {
        currentSlot: slot,
        blockTime,
        epoch: epochInfo.epoch,
        slotIndex: epochInfo.slotIndex,
        slotsInEpoch: epochInfo.slotsInEpoch
      };
    } catch (error) {
      console.error('Error getting network info:', error);
      return null;
    }
  }
}

export default new SolanaService();