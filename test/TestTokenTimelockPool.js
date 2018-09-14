const {
  assertRevert, assertEvent, increaseTime, now, advanceBlock,
} = require('./utils/helpers');

const TokenTimelockPool = artifacts.require('./TokenTimelockPool.sol');
const Wibcoin = artifacts.require('../test/utils/Wibcoin.sol');
const TokenTimelock = artifacts.require('TokenTimelock');

contract('TokenTimelockPool', (accounts) => {
  const oneDay = 86400;
  const owner = accounts[0];
  const beneficiary1 = accounts[1];
  const beneficiary1Amount1 = 1000;
  const beneficiary1Amount2 = 2000;
  const beneficiary2 = accounts[2];
  const beneficiary2Amount1 = 1500;
  const newOwner = accounts[3];

  let token;
  let releaseDate;
  let totalFunds;
  let tokenTimelockPool;
  before(async () => {
    await advanceBlock();
  });

  beforeEach(async () => {
    token = await Wibcoin.new({ from: owner });
    releaseDate = now() + oneDay;
    totalFunds = 50000;
    tokenTimelockPool = await TokenTimelockPool.new(token.address, totalFunds, releaseDate, {
      from: owner,
    });
    await token.transfer(tokenTimelockPool.address, totalFunds, { from: owner });
  });

  describe('#constructor', () => {
    it('instantiates the contract', async () => {
      const contract = await TokenTimelockPool.new(token.address, totalFunds, releaseDate, {
        from: owner,
      });
      assert(contract, 'TokenTimelockPool could not be instantiated');
    });

    it('does not instantiate the contract when the token is not a valid address', async () => {
      try {
        await TokenTimelockPool.new('0x0', totalFunds, releaseDate, { from: owner });
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('does not instantiate the contract when the total funds are zero', async () => {
      try {
        await TokenTimelockPool.new(token.address, 0, releaseDate, { from: owner });
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('does not instantiate the contract when the release date is now', async () => {
      try {
        await TokenTimelockPool.new(token.address, totalFunds, Date.now() / 1000, { from: owner });
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('does not instantiate the contract when the release date is in the past', async () => {
      const pastDate = releaseDate - 100000;
      try {
        await TokenTimelockPool.new(token.address, totalFunds, pastDate, { from: owner });
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });
  });

  describe('#addBeneficiary', () => {
    it('adds a beneficiary to the token pool', async () => {
      const tx = await tokenTimelockPool.addBeneficiary(
        beneficiary1, beneficiary1Amount1, { from: owner },
      );
      assertEvent(tx, 'BeneficiaryAdded', 'Did not emit `BeneficiaryAdded` event');
    });

    it('adds a beneficiary when the beneficiary already exists in the pool', async () => {
      const tx1 = await tokenTimelockPool.addBeneficiary(
        beneficiary1, beneficiary1Amount1, { from: owner },
      );
      assertEvent(tx1, 'BeneficiaryAdded', 'Did not emit `BeneficiaryAdded` event');
      const tx2 = await tokenTimelockPool.addBeneficiary(
        beneficiary1, beneficiary1Amount2, { from: owner },
      );
      assertEvent(tx2, 'BeneficiaryAdded', 'Did not emit `BeneficiaryAdded` event');
    });

    it('new owner adds a beneficiary after claiming ownership', async () => {
      await tokenTimelockPool.transferOwnership(newOwner, { from: owner });
      await tokenTimelockPool.claimOwnership({ from: newOwner });

      const tx = await tokenTimelockPool.addBeneficiary(
        beneficiary1, beneficiary1Amount1, { from: newOwner },
      );
      assertEvent(tx, 'BeneficiaryAdded', 'Did not emit `BeneficiaryAdded` event');
    });

    it('adds a beneficiary after transferring ownership if it has not been claimed', async () => {
      await tokenTimelockPool.transferOwnership(newOwner, { from: owner });

      const tx = await tokenTimelockPool.addBeneficiary(
        beneficiary1, beneficiary1Amount1, { from: owner },
      );
      assertEvent(tx, 'BeneficiaryAdded', 'Did not emit `BeneficiaryAdded` event');
    });

    it('previous owner cannot add a beneficiary after the new owner claims ownership', async () => {
      await tokenTimelockPool.transferOwnership(newOwner, { from: owner });
      await tokenTimelockPool.claimOwnership({ from: newOwner });

      try {
        await tokenTimelockPool.addBeneficiary(beneficiary1, beneficiary1Amount1, { from: owner });
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('does not add a beneficiary when the beneficiary is not a valid address', async () => {
      try {
        await tokenTimelockPool.addBeneficiary('0x0', beneficiary1Amount1, { from: owner });
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('does not add a beneficiary when the beneficiary is the owner of the pool', async () => {
      try {
        await tokenTimelockPool.addBeneficiary(owner, beneficiary1Amount1, { from: owner });
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('does not add a beneficiary when the beneficiary is the contract itself', async () => {
      try {
        await tokenTimelockPool.addBeneficiary(tokenTimelockPool.address, beneficiary1Amount1, {
          from: owner,
        });
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('does not add a beneficiary when amount of tokens is zero', async () => {
      try {
        await tokenTimelockPool.addBeneficiary(beneficiary1, 0, { from: owner });
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('does not add a beneficiary when amount of tokens is more than the pool funds', async () => {
      try {
        await tokenTimelockPool.addBeneficiary(beneficiary1, totalFunds + 1, { from: owner });
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('does not add a beneficiary when amount of tokens is more than the pool balance', async () => {
      try {
        const pool = await TokenTimelockPool.new(token.address, totalFunds, releaseDate, {
          from: owner,
        });
        await pool.addBeneficiary(beneficiary1, beneficiary1Amount1, { from: owner });
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('does not add a beneficiary after the release date', async () => {
      await increaseTime(oneDay * 5);

      try {
        await tokenTimelockPool.addBeneficiary(beneficiary1, beneficiary1Amount1, { from: owner });
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });
  });

  describe('#getDistributionContracts', () => {
    it('returns the distribution contracts for a given beneficiary', async () => {
      const tx = await tokenTimelockPool.addBeneficiary(
        beneficiary1, beneficiary1Amount1, { from: owner },
      );
      assertEvent(tx, 'BeneficiaryAdded', 'Did not emit `BeneficiaryAdded` event');

      const contracts = await tokenTimelockPool.getDistributionContracts(beneficiary1);
      const firstContract = await tokenTimelockPool.beneficiaryDistributionContracts(
        beneficiary1,
        0,
      );
      assert.equal(contracts.length, 1);
      assert.equal(contracts[0], firstContract);
    });

    it('returns an empty array if beneficiary has not been added', async () => {
      const contracts = await tokenTimelockPool.getDistributionContracts(beneficiary2);
      assert.equal(contracts.length, 0);
    });

    it('does not return the distribution contracts if beneficiary is not a valid address', async () => {
      try {
        await tokenTimelockPool.getDistributionContracts('0x0');
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });
  });

  describe('#reclaim', () => {
    it('reclaims tokens that were not held', async () => {
      await increaseTime(oneDay * 5);
      assert.equal((await token.balanceOf.call(tokenTimelockPool.address)), totalFunds);

      const tx = await tokenTimelockPool.reclaim({ from: owner });
      assertEvent(tx, 'Reclaim', 'Did not emit `Reclaim` event');
      assert.equal((await token.balanceOf.call(tokenTimelockPool.address)), 0);
    });

    it('reclaims tokens that were not held after adding a beneficiary', async () => {
      const tx1 = await tokenTimelockPool.addBeneficiary(
        beneficiary1, beneficiary1Amount1, { from: owner },
      );
      assertEvent(tx1, 'BeneficiaryAdded', 'Did not emit `BeneficiaryAdded` event');

      await increaseTime(oneDay * 5);

      assert.equal(
        (await token.balanceOf.call(tokenTimelockPool.address)),
        (totalFunds - beneficiary1Amount1),
      );

      const tx2 = await tokenTimelockPool.reclaim({ from: owner });
      assertEvent(tx2, 'Reclaim', 'Did not emit `Reclaim` event');
      assert.equal((await token.balanceOf.call(tokenTimelockPool.address)), 0);
    });

    it('reclaimed tokens are transfered to the owner of the contract', async () => {
      await increaseTime(oneDay * 5);
      const ownerInitialBalance = await token.balanceOf.call(owner);
      const tx = await tokenTimelockPool.reclaim({ from: owner });
      assertEvent(tx, 'Reclaim', 'Did not emit `Reclaim` event');
      const ownerAfterReclaimBalance = await token.balanceOf.call(owner);

      assert.ok(ownerInitialBalance.plus(totalFunds).eq(ownerAfterReclaimBalance));
      assert.equal((await token.balanceOf.call(tokenTimelockPool.address)), 0);
    });

    it('does not reclaim tokens if caller is not the owner', async () => {
      await increaseTime(oneDay * 5);
      try {
        await tokenTimelockPool.reclaim({ from: beneficiary1 });
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('does not reclaim tokens before the release date', async () => {
      try {
        await tokenTimelockPool.reclaim({ from: owner });
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('does not reclaim tokens that are on hold', async () => {
      const tx1 = await tokenTimelockPool.addBeneficiary(
        beneficiary1, beneficiary1Amount1, { from: owner },
      );
      assertEvent(tx1, 'BeneficiaryAdded', 'Did not emit `BeneficiaryAdded` event');

      await increaseTime(oneDay * 5);

      const b1Timelocks = await tokenTimelockPool.getDistributionContracts(beneficiary1);
      const b1Timelock = b1Timelocks[0];
      assert.equal((await token.balanceOf.call(b1Timelock)), beneficiary1Amount1);

      const tx2 = await tokenTimelockPool.reclaim({ from: owner });
      assertEvent(tx2, 'Reclaim', 'Did not emit `Reclaim` event');
      assert.equal((await token.balanceOf.call(tokenTimelockPool.address)), 0);

      assert.equal((await token.balanceOf.call(b1Timelock)), beneficiary1Amount1);
      const b1TimelockContract = TokenTimelock.at(b1Timelock);
      await b1TimelockContract.release({ from: beneficiary1 });
      assert.equal((await token.balanceOf.call(beneficiary1)), beneficiary1Amount1);
    });
  });

  describe('#publicAttributes', () => {
    it('uses the same token address as passed to the constructor', async () => {
      const tokenAddress = await tokenTimelockPool.token();
      assert.equal(tokenAddress, token.address, 'Token address does not match');
    });

    it('does not modify total funds after adding a beneficiary', async () => {
      const tx = await tokenTimelockPool.addBeneficiary(
        beneficiary1, beneficiary1Amount1, { from: owner },
      );
      assertEvent(tx, 'BeneficiaryAdded', 'Did not emit `BeneficiaryAdded` event');

      const funds = await tokenTimelockPool.totalFunds();
      assert.equal(funds, totalFunds, 'Total Funds changed');
    });

    it('updates distributed tokens after adding a beneficiary', async () => {
      const tx = await tokenTimelockPool.addBeneficiary(
        beneficiary1, beneficiary1Amount1, { from: owner },
      );
      assertEvent(tx, 'BeneficiaryAdded', 'Did not emit `BeneficiaryAdded` event');

      const distributedTokens = await tokenTimelockPool.distributedTokens();
      assert.equal(distributedTokens, beneficiary1Amount1, 'Distributed Tokens is not correct');
    });

    it('updates beneficiaries list after adding a beneficiary', async () => {
      const tx = await tokenTimelockPool.addBeneficiary(
        beneficiary1, beneficiary1Amount1, { from: owner },
      );
      assertEvent(tx, 'BeneficiaryAdded', 'Did not emit `BeneficiaryAdded` event');

      const beneficiary = await tokenTimelockPool.beneficiaries(0);
      assert.equal(beneficiary, beneficiary1, 'Beneficiaries list is not correct');
    });

    it('updates beneficiary distribution contracts mapping after adding a beneficiary', async () => {
      const tx = await tokenTimelockPool.addBeneficiary(
        beneficiary1, beneficiary1Amount1, { from: owner },
      );
      assertEvent(tx, 'BeneficiaryAdded', 'Did not emit `BeneficiaryAdded` event');

      const contractAddress = await tokenTimelockPool.beneficiaryDistributionContracts(
        beneficiary1,
        0,
      );
      const contracts = await tokenTimelockPool.getDistributionContracts(beneficiary1);
      const timelockBeneficiary = await TokenTimelock.at(contractAddress).beneficiary();
      assert.equal(contracts.length, 1, 'Distribution contracts list should have one element');
      assert.equal(contractAddress, contracts[0], 'Distribution contracts list should have mapping content');
      assert.equal(timelockBeneficiary, beneficiary1, 'Distribution contract does not belong to beneficiary');
    });

    it('new owner reclaims tokens after claiming ownership ', async () => {
      await increaseTime(oneDay * 5);
      assert.equal((await token.balanceOf.call(tokenTimelockPool.address)), totalFunds);

      await tokenTimelockPool.transferOwnership(newOwner, { from: owner });
      await tokenTimelockPool.claimOwnership({ from: newOwner });

      const tx = await tokenTimelockPool.reclaim({ from: newOwner });
      assertEvent(tx, 'Reclaim', 'Did not emit `Reclaim` event');
      assert.equal((await token.balanceOf.call(tokenTimelockPool.address)), 0);
    });

    it('previous owner reclaims tokens after transferring ownership if it hasnt been claimed', async () => {
      await increaseTime(oneDay * 5);
      assert.equal((await token.balanceOf.call(tokenTimelockPool.address)), totalFunds);

      await tokenTimelockPool.transferOwnership(newOwner, { from: owner });

      const tx = await tokenTimelockPool.reclaim({ from: owner });
      assertEvent(tx, 'Reclaim', 'Did not emit `Reclaim` event');
      assert.equal((await token.balanceOf.call(tokenTimelockPool.address)), 0);
    });

    it('previous owner cannot reclaim tokens after the new owner claims ownership', async () => {
      await increaseTime(oneDay * 5);
      assert.equal((await token.balanceOf.call(tokenTimelockPool.address)), totalFunds);

      await tokenTimelockPool.transferOwnership(newOwner, { from: owner });
      await tokenTimelockPool.claimOwnership({ from: newOwner });

      try {
        await tokenTimelockPool.reclaim({ from: owner });
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });
  });

  context('Integration Test', () => {
    it('performs all actions successfully', async () => {
      const tx1 = await tokenTimelockPool.addBeneficiary(
        beneficiary1, beneficiary1Amount1, { from: owner },
      );
      assertEvent(tx1, 'BeneficiaryAdded', 'Did not emit `BeneficiaryAdded` event');

      const tx2 = await tokenTimelockPool.addBeneficiary(
        beneficiary1, beneficiary1Amount2, { from: owner },
      );
      assertEvent(tx2, 'BeneficiaryAdded', 'Did not emit `BeneficiaryAdded` event');

      const tx3 = await tokenTimelockPool.addBeneficiary(
        beneficiary2, beneficiary2Amount1, { from: owner },
      );
      assertEvent(tx3, 'BeneficiaryAdded', 'Did not emit `BeneficiaryAdded` event');

      assert.equal((await token.balanceOf.call(beneficiary1)), 0);
      assert.equal((await token.balanceOf.call(beneficiary2)), 0);

      await increaseTime(oneDay * 5);

      const beneficiary1Contracts = await tokenTimelockPool.getDistributionContracts(beneficiary1);
      const beneficiary1Contract1 = beneficiary1Contracts[0];
      const beneficiary1Contract2 = beneficiary1Contracts[1];
      assert.equal((await token.balanceOf.call(beneficiary1Contract1)), beneficiary1Amount1);
      assert.equal((await token.balanceOf.call(beneficiary1Contract2)), beneficiary1Amount2);

      const beneficiary2Contracts = await tokenTimelockPool.getDistributionContracts(beneficiary2);
      const beneficiary2Contract1 = beneficiary2Contracts[0];
      assert.equal((await token.balanceOf.call(beneficiary2Contract1)), beneficiary2Amount1);

      const beneficiary1Contract1Timelock = TokenTimelock.at(beneficiary1Contract1);
      await beneficiary1Contract1Timelock.release();
      assert.equal((await token.balanceOf.call(beneficiary1)), beneficiary1Amount1);
      assert.equal((await token.balanceOf.call(beneficiary1Contract1)), 0);

      const beneficiary1Contract2Timelock = TokenTimelock.at(beneficiary1Contract2);
      await beneficiary1Contract2Timelock.release();
      assert.equal(
        (await token.balanceOf.call(beneficiary1)),
        (beneficiary1Amount1 + beneficiary1Amount2),
      );
      assert.equal((await token.balanceOf.call(beneficiary1Contract2)), 0);

      const beneficiary2Contract1Timelock = TokenTimelock.at(beneficiary2Contract1);
      await beneficiary2Contract1Timelock.release();
      assert.equal((await token.balanceOf.call(beneficiary2)), beneficiary2Amount1);
      assert.equal((await token.balanceOf.call(beneficiary2Contract1)), 0);

      const distributedTokens = await tokenTimelockPool.distributedTokens();
      const totalDistributed = beneficiary1Amount1 + beneficiary1Amount2 + beneficiary2Amount1;
      assert.equal(Number(distributedTokens), totalDistributed);
      assert.equal(
        (await token.balanceOf.call(tokenTimelockPool.address)),
        (totalFunds - totalDistributed),
      );

      assert.ok((await token.balanceOf.call(tokenTimelockPool.address)) > 0);
      const tx = await tokenTimelockPool.reclaim();
      assertEvent(tx, 'Reclaim', 'Did not emit `Reclaim` event');
      assert.equal((await token.balanceOf.call(tokenTimelockPool.address)), 0);
    });
  });
});
