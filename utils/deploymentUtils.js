const fs = require('fs');
const path = require('path');
const HDWalletProvider = require('truffle-hdwallet-provider'); // eslint-disable-line import/no-extraneous-dependencies

const getConfig = function getConfig() {
  try {
    const configFile = path.resolve(__dirname, '../deploy.json');
    return JSON.parse(fs.readFileSync(configFile, 'utf8'));
  } catch (err) {
    console.error('\n--> Missing deploy.json.\n\n'); // eslint-disable-line no-console
    throw err;
  }
};

const getEnvironmentConfig = function getEnvironmentConfig(environment) {
  const config = getConfig();
  return config.environments[environment] || {};
};
exports.getEnvironmentConfig = getEnvironmentConfig;

// --- ( Truffle Deployment ) ---
exports.getProvider = function getProvider(network, environment) {
  const config = getConfig();
  const envConfig = getEnvironmentConfig(environment);
  const infura = `https://${network}.infura.io/v3/${config.infuraToken}`;
  return new HDWalletProvider(envConfig.mnemonic, infura);
};

exports.isLocal = function isLocal(environment) { return environment === 'development' || environment === 'test'; };

exports.getEnvironmentAccounts = function getEnvironmentAccounts(environment) {
  const config = getEnvironmentConfig(environment);
  return config.accounts;
};

exports.getLocalAccounts = function getLocalAccounts(accounts) {
  return {
    owner: accounts[0],
    beneficiary1: accounts[1],
    beneficiary2: accounts[2],
    beneficiary3: accounts[3],
  };
};
