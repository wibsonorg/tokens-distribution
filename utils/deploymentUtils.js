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

exports.getEnvironmentAccounts = function getEnvironmentAccounts(environment) {
  return getEnvironmentConfig(environment);
};
