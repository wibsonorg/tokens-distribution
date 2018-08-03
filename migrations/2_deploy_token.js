const DeployUtils = require('../utils/deploymentUtils');

const Wibcoin = artifacts.require('../test/utils/Wibcoin.sol');

/**
 * Deploy Token to ganache network.
 */
const deployLocal = (deployer, tokenContract, accounts) => {
  const from = { from: accounts.owner };

  return deployer.deploy(tokenContract, from)
    .then(() => tokenContract.deployed())
    .then((instance) => {
      instance.transfer(accounts.owner, 1000000000, from);
      instance.transfer(accounts.beneficiary1, 10, from);
      instance.transfer(accounts.beneficiary2, 10, from);
      instance.transfer(accounts.beneficiary3, 10, from);
    });
};

module.exports = function deploy(deployer, network, accounts) {
  const wibcoinAddress = DeployUtils.getWibcoinAddress(network);
  if (wibcoinAddress) {
    return;
  }

  // Deploy token only for local environment
  if (DeployUtils.isLocal(network)) {
    const localAccounts = DeployUtils.getLocalAccounts(accounts);
    deployLocal(deployer, Wibcoin, localAccounts);
  }
};
