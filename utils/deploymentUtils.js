const fs = require('fs');
const path = require('path');
const PrivKeyWalletProvider = require('./PrivKeyWalletProvider');

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
  const privKeys = [envConfig.deployPrivateKey];
  return new PrivKeyWalletProvider(privKeys, infura);
};

exports.getEnvironmentAccounts = function getEnvironmentAccounts(environment) {
  return getEnvironmentConfig(environment);
};

exports.isTest = function isDevelop(network) { return ['test', 'coverage'].includes(network); };
