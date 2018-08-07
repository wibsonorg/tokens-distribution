const DeployUtils = require('../utils/deploymentUtils');

const SafeMath = artifacts.require('openzeppelin-solidity/contracts/math/SafeMath.sol');

const TokenVestingPool = artifacts.require('./TokenVestingPool.sol');
const TokenTimelockPool = artifacts.require('./TokenTimelockPool.sol');

module.exports = (deployer, network) => {
  const {
    tokenVestingPool: vesting,
    tokenTimelockPool: timelock,
  } = DeployUtils.getEnvironmentConfig(network);

  // Will always take the first available account as owner (from mnemonic or ganache).
  // When using a provider, change the account index in deploy.js

  if (DeployUtils.isTest(network)) {
    return;
  }

  return deployer.deploy(SafeMath) // eslint-disable-line consistent-return
    .then(() => deployer.link(SafeMath, TokenVestingPool))
    .then(() => deployer.deploy(TokenVestingPool, vesting.tokenAddress, vesting.totalFunds))
    .then(() => deployer.link(SafeMath, TokenTimelockPool))
    .then(() => deployer.deploy(
      TokenTimelockPool,
      timelock.tokenAddress,
      timelock.totalFunds,
      timelock.releaseDate,
    ));
};
