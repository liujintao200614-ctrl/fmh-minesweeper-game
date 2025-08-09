import { ethers } from 'ethers';
import { TransactionResult } from '../../types/web3';
import { Web3ProviderManager } from './provider';

export interface TransactionStatus {
  hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  confirmations: number;
  blockNumber?: number;
  gasUsed?: string;
  error?: string;
}

export interface PendingTransaction {
  hash: string;
  description: string;
  timestamp: number;
  type: 'start_game' | 'submit_game' | 'claim_reward';
}

export class TransactionManager {
  private static instance: TransactionManager;
  private pendingTransactions: Map<string, PendingTransaction> = new Map();
  private transactionCallbacks: Map<string, (status: TransactionStatus) => void> = new Map();

  static getInstance(): TransactionManager {
    if (!TransactionManager.instance) {
      TransactionManager.instance = new TransactionManager();
    }
    return TransactionManager.instance;
  }

  async waitForTransaction(
    txHash: string,
    confirmations: number = 1,
    timeout: number = 300000 // 5 minutes
  ): Promise<TransactionStatus> {
    const providerManager = Web3ProviderManager.getInstance();
    const provider = providerManager.getProvider();
    
    if (!provider) {
      throw new Error('Provider not available');
    }

    try {
      const receipt = await provider.waitForTransaction(txHash, confirmations, timeout);
      
      if (!receipt) {
        return {
          hash: txHash,
          status: 'failed',
          confirmations: 0,
          error: 'Transaction timeout'
        };
      }

      const status: TransactionStatus = {
        hash: txHash,
        status: receipt.status === 1 ? 'confirmed' : 'failed',
        confirmations: receipt.confirmations,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };

      // Notify callbacks
      const callback = this.transactionCallbacks.get(txHash);
      if (callback) {
        callback(status);
        this.transactionCallbacks.delete(txHash);
      }

      // Remove from pending if completed
      if (status.status !== 'pending') {
        this.pendingTransactions.delete(txHash);
      }

      return status;
    } catch (error: any) {
      const failedStatus: TransactionStatus = {
        hash: txHash,
        status: 'failed',
        confirmations: 0,
        error: error.message
      };

      // Notify callbacks
      const callback = this.transactionCallbacks.get(txHash);
      if (callback) {
        callback(failedStatus);
        this.transactionCallbacks.delete(txHash);
      }

      this.pendingTransactions.delete(txHash);
      throw error;
    }
  }

  async getTransactionStatus(txHash: string): Promise<TransactionStatus> {
    const providerManager = Web3ProviderManager.getInstance();
    const provider = providerManager.getProvider();
    
    if (!provider) {
      throw new Error('Provider not available');
    }

    try {
      const receipt = await provider.getTransactionReceipt(txHash);
      
      if (!receipt) {
        // Transaction is still pending
        return {
          hash: txHash,
          status: 'pending',
          confirmations: 0
        };
      }

      return {
        hash: txHash,
        status: receipt.status === 1 ? 'confirmed' : 'failed',
        confirmations: receipt.confirmations,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error: any) {
      throw new Error(`Failed to get transaction status: ${error.message}`);
    }
  }

  addPendingTransaction(
    hash: string, 
    description: string, 
    type: PendingTransaction['type']
  ): void {
    this.pendingTransactions.set(hash, {
      hash,
      description,
      timestamp: Date.now(),
      type
    });
  }

  getPendingTransactions(): PendingTransaction[] {
    return Array.from(this.pendingTransactions.values());
  }

  onTransactionUpdate(
    txHash: string, 
    callback: (status: TransactionStatus) => void
  ): void {
    this.transactionCallbacks.set(txHash, callback);
  }

  async estimateGas(
    to: string,
    data: string,
    value?: string
  ): Promise<string> {
    const providerManager = Web3ProviderManager.getInstance();
    const provider = providerManager.getProvider();
    const account = providerManager.getCurrentAccount();
    
    if (!provider || !account) {
      throw new Error('Provider or account not available');
    }

    try {
      const gasEstimate = await provider.estimateGas({
        from: account,
        to,
        data,
        value: value ? ethers.parseEther(value) : undefined
      });

      return gasEstimate.toString();
    } catch (error: any) {
      throw new Error(`Gas estimation failed: ${error.message}`);
    }
  }

  async getCurrentGasPrice(): Promise<string> {
    const providerManager = Web3ProviderManager.getInstance();
    const provider = providerManager.getProvider();
    
    if (!provider) {
      throw new Error('Provider not available');
    }

    try {
      const feeData = await provider.getFeeData();
      return feeData.gasPrice?.toString() || '0';
    } catch (error: any) {
      throw new Error(`Failed to get gas price: ${error.message}`);
    }
  }

  async getOptimalGasPrice(): Promise<{
    slow: string;
    standard: string;
    fast: string;
  }> {
    try {
      const currentPrice = await this.getCurrentGasPrice();
      const basePrice = BigInt(currentPrice);
      
      return {
        slow: (basePrice * 90n / 100n).toString(),     // 90% of current
        standard: basePrice.toString(),                 // Current price
        fast: (basePrice * 120n / 100n).toString()     // 120% of current
      };
    } catch (error: any) {
      throw new Error(`Failed to get optimal gas prices: ${error.message}`);
    }
  }

  clearPendingTransactions(): void {
    this.pendingTransactions.clear();
    this.transactionCallbacks.clear();
  }

  removePendingTransaction(txHash: string): void {
    this.pendingTransactions.delete(txHash);
    this.transactionCallbacks.delete(txHash);
  }

  async getTransactionHistory(address: string, limit: number = 10): Promise<any[]> {
    const providerManager = Web3ProviderManager.getInstance();
    const provider = providerManager.getProvider();
    
    if (!provider) {
      throw new Error('Provider not available');
    }

    try {
      // This is a simplified version - in production you'd use a proper indexing service
      const currentBlock = await provider.getBlockNumber();
      const transactions: any[] = [];
      
      // Search recent blocks for transactions from this address
      const searchBlocks = Math.min(1000, currentBlock);
      
      for (let i = 0; i < searchBlocks && transactions.length < limit; i++) {
        try {
          const block = await provider.getBlock(currentBlock - i, true);
          if (block && block.transactions) {
            for (const tx of block.transactions) {
              if (typeof tx === 'object' && tx.from?.toLowerCase() === address.toLowerCase()) {
                transactions.push({
                  hash: tx.hash,
                  from: tx.from,
                  to: tx.to,
                  value: ethers.formatEther(tx.value),
                  gasPrice: tx.gasPrice?.toString(),
                  gasLimit: tx.gasLimit?.toString(),
                  blockNumber: block.number,
                  timestamp: block.timestamp
                });
                
                if (transactions.length >= limit) break;
              }
            }
          }
        } catch (blockError) {
          // Skip blocks that can't be fetched
          continue;
        }
      }
      
      return transactions;
    } catch (error: any) {
      throw new Error(`Failed to get transaction history: ${error.message}`);
    }
  }
}