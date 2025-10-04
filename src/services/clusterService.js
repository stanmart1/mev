const { Connection, clusterApiUrl } = require('@solana/web3.js');
const logger = require('../config/logger');

const CLUSTERS = {
  'mainnet-beta': {
    name: 'Mainnet Beta',
    rpcUrl: clusterApiUrl('mainnet-beta'),
    wsUrl: 'wss://api.mainnet-beta.solana.com'
  },
  'devnet': {
    name: 'Devnet',
    rpcUrl: clusterApiUrl('devnet'),
    wsUrl: 'wss://api.devnet.solana.com'
  },
  'testnet': {
    name: 'Testnet',
    rpcUrl: clusterApiUrl('testnet'),
    wsUrl: 'wss://api.testnet.solana.com'
  }
};

class ClusterService {
  constructor() {
    this.connections = new Map();
    this.currentCluster = 'mainnet-beta';
  }

  getConnection(cluster = this.currentCluster) {
    if (!CLUSTERS[cluster]) {
      throw new Error(`Invalid cluster: ${cluster}`);
    }

    if (!this.connections.has(cluster)) {
      const config = CLUSTERS[cluster];
      const connection = new Connection(config.rpcUrl, {
        commitment: 'confirmed',
        wsEndpoint: config.wsUrl
      });
      this.connections.set(cluster, connection);
      logger.info(`Created connection for cluster: ${cluster}`);
    }

    return this.connections.get(cluster);
  }

  setCluster(cluster) {
    if (!CLUSTERS[cluster]) {
      throw new Error(`Invalid cluster: ${cluster}`);
    }
    this.currentCluster = cluster;
    logger.info(`Switched to cluster: ${cluster}`);
  }

  getClusterInfo(cluster = this.currentCluster) {
    return CLUSTERS[cluster];
  }

  getAllClusters() {
    return Object.keys(CLUSTERS).map(key => ({
      id: key,
      ...CLUSTERS[key]
    }));
  }
}

module.exports = new ClusterService();
