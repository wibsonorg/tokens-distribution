const DeployUtils = require('../utils/deploymentUtils');

const TokenPoolA = artifacts.require('./TokenPoolA.sol');
const TokenPoolB = artifacts.require('./TokenPoolB.sol');

module.exports = (deployer, network) => {
  const { tokenPoolA: a, tokenPoolB: b } = DeployUtils.getEnvironmentConfig(network);

  if (!DeployUtils.isLocal(network)) {
    const owner = DeployUtils.getEnvironmentAccounts(network);

    deployer.deploy(
      TokenPoolA,
      a.tokenAdress,
      a.totalFunds,
      { from: owner },
    ).then(() => deployer.deploy(
      TokenPoolB,
      b.tokenAdress,
      b.totalFunds,
      b.releaseDate,
      { from: owner },
    ));
  }
};
