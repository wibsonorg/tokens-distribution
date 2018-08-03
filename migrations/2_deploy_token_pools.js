const DeployUtils = require('../utils/deploymentUtils');

const TokenVestingPool = artifacts.require('./TokenVestingPool.sol');
const TokenTimelockPool = artifacts.require('./TokenTimelockPool.sol');

module.exports = (deployer, network) => {
  const {
    tokenVestingPool: vesting,
    tokenTimelockPool: timelock,
  } = DeployUtils.getEnvironmentConfig(network);

  const { owner } = DeployUtils.getEnvironmentAccounts(network);

  if (owner) {
    deployer
      .deploy(TokenVestingPool, vesting.tokenAddress, vesting.totalFunds, {
        from: owner,
      })
      .then(() => deployer.deploy(
        TokenTimelockPool,
        timelock.tokenAddress,
        timelock.totalFunds,
        timelock.releaseDate,
        { from: owner },
      ));
  }
};
