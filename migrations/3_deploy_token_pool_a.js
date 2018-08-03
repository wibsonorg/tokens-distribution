const DeployUtils = require('../utils/deploymentUtils');

const TokenPoolA = artifacts.require('./TokenPoolA.sol');

module.exports = (deployer, network, accounts) => {
  const wibcoinAddress = DeployUtils.getWibcoinAddress(network);

  if (DeployUtils.isLocal(network)) {
    const { owner } = DeployUtils.getLocalAccounts(accounts);

    return deployer.deploy(TokenPoolA, wibcoinAddress, 100000, { from: owner });
  }

  const { multisig } = DeployUtils.getEnvironmentAccounts(network);
  // TODO: The amount of tokens should be specified elsewhere
  return deployer.deploy(TokenPoolA, wibcoinAddress, 1, { from: multisig });
};
