require('babel-register'); // eslint-disable-line import/no-extraneous-dependencies
require('babel-polyfill'); // eslint-disable-line import/no-extraneous-dependencies
const DeployUtils = require('./utils/deploymentUtils');

module.exports = {
  migrations_directory: './migrations',
  networks: {
    development: {
      host: 'localhost',
      port: 8545,
      network_id: '*',
    },
    test: {
      host: 'localhost',
      port: 8545,
      network_id: '*',
    },
    coverage: {
      host: 'localhost',
      port: 8555,
      network_id: '*',
      gas: 0xfffffffffff,
      gasPrice: 0x01,
    },
    remoteDevelopment: {
      provider: () => DeployUtils.getProvider('ropsten', 'remoteDevelopment'),
      network_id: 3, // 1: Mainnet, 3: Ropsten
      gas: 4600000,
    },
    staging: {
      provider: () => DeployUtils.getProvider('ropsten', 'staging'),
      network_id: 3, // 1: Mainnet, 3: Ropsten
      gas: 4600000,
    },
    production: {
      provider: () => DeployUtils.getProvider('mainnet', 'production'),
      network_id: 1, // 1: Mainnet, 3: Ropsten
      gas: 7500000,
    },
  },
  solc: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
  },
};
