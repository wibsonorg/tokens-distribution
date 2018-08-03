const DeployUtils = require('../utils/deploymentUtils');

const TokenVestingPool = artifacts.require('./TokenVestingPool.sol');
const TokenTimelockPool = artifacts.require('./TokenTimelockPool.sol');

module.exports = (deployer, network) => {
  const {
    tokenVestingPool: vesting,
    tokenTimelockPool: timelock,
  } = DeployUtils.getEnvironmentConfig(network);

  if (!DeployUtils.isLocal(network)) {
    const owner = DeployUtils.getEnvironmentAccounts(network);

    deployer
      .deploy(TokenVestingPool, vesting.tokenAdress, vesting.totalFunds, {
        from: owner,
      })
      .then(() => deployer.deploy(
        TokenTimelockPool,
        timelock.tokenAdress,
        timelock.totalFunds,
        timelock.releaseDate,
        { from: owner },
      ));
  }
};
