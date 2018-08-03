const DeployUtils = require('../utils/deploymentUtils');

const Wibcoin = artifacts.require('./Wibcoin.sol');
const TokenPoolA = artifacts.require('./TokenPoolA.sol');

module.exports = (deployer, network, accounts) => {
  const wibcoinAddress = DeployUtils.getWibcoinAddress(network);
  const token = Wibcoin.at(wibcoinAddress || Wibcoin.address);

  if (DeployUtils.isLocal(network)) {
    const { owner } = DeployUtils.getLocalAccounts(accounts);

    return deployer.deploy(TokenPoolA, token.address, 100000, { from: owner });
  }

  const { multisig } = DeployUtils.getEnvironmentAccounts(network);
  // TODO: The amount of tokens should be specified elsewhere
  return deployer.deploy(TokenPoolA, token.address, 1, { from: multisig });
};
