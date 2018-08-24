const BigNumber = require('bignumber.js');
const {
  assertRevert, assertEvent, increaseTime, now, advanceBlock,
} = require('./utils/helpers');

const TokenVestingPool = artifacts.require('./TokenVestingPool.sol');
const Wibcoin = artifacts.require('../test/utils/Wibcoin.sol');
const TokenVesting = artifacts.require('TokenVesting');

contract('TokenVestingPool', (accounts) => {
  const owner = accounts[0];
  const beneficiary1 = accounts[1];
  const beneficiary2 = accounts[2];
  const zeroAddress = '0x0000000000000000000000000000000000000000';

  const oneHour = 3600;
  const oneDay = 86400;
  const oneWeek = oneDay * 7;
  const oneMonth = oneDay * 30;

  let token;
  let start;

  before(async () => {
    await advanceBlock();
  });

  beforeEach(async () => {
    start = now();
    token = await Wibcoin.new({ from: owner });
  });

  describe('#constructor', () => {
    it('does not create an instance of the contract when the token argument is invalid', async () => {
      try {
        await TokenVestingPool.new(zeroAddress, '1e+12', { from: owner });
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('does not create an instance of the contract when the total funds are zero', async () => {
      try {
        await TokenVestingPool.new(token.address, 0, { from: owner });
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('creates an instance of the contract', async () => {
      const contract = await TokenVestingPool.new(token.address, '1e+12', { from: owner });
      assert.ok(contract);
    });
  });

  describe('#addBeneficiary', () => {
    let contract;

    beforeEach(async () => {
      contract = await TokenVestingPool.new(token.address, '1e+11', { from: owner });
      await token.transfer(contract.address, '1e+11');
    });

    it('does not add a beneficiary when the beneficiary is the owner', async () => {
      try {
        await contract.addBeneficiary(owner, start, oneDay, oneWeek, '1e10', { from: owner });
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('does not add a beneficiary when the address is invalid', async () => {
      try {
        await contract.addBeneficiary(zeroAddress, start, oneDay, oneWeek, '1e10', {
          from: owner,
        });
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('does not add a beneficiary when the beneficiary is the contract itself', async () => {
      try {
        await contract.addBeneficiary(contract.address, start, oneDay, oneWeek, '1e10', {
          from: owner,
        });
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('does not add a beneficiary when the duration time is lesser than the cliff time', async () => {
      try {
        await contract.addBeneficiary(beneficiary1, start, oneWeek, oneDay, '1e10', {
          from: owner,
        });
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('does not add a beneficiary when the amount of tokens to distribute is more than the total funds', async () => {
      try {
        await contract.addBeneficiary(beneficiary1, start, oneDay, oneWeek, '1e+12', {
          from: owner,
        });
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('does not add a beneficiary when the token balance is not enough', async () => {
      const anotherContract = await TokenVestingPool.new(token.address, '1e+11', { from: owner });
      await token.transfer(anotherContract.address, '1e10');

      try {
        await anotherContract.addBeneficiary(beneficiary1, start, oneDay, oneWeek, '1e+11', {
          from: owner,
        });
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('does not add a beneficiary when amount of tokens is zero', async () => {
      try {
        await contract.addBeneficiary(beneficiary1, start, oneDay, oneWeek, 0, {
          from: owner,
        });
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('adds a beneficiary to the token pool', async () => {
      const tx = await contract.addBeneficiary(beneficiary1, start, oneDay, oneWeek, '1e10', {
        from: owner,
      });
      assertEvent(tx, 'BeneficiaryAdded', 'Did not emit `BeneficiaryAdded` event');

      const { receipt: { status } } = tx;
      assert.equal(status, 1, 'Could not add beneficiary');
    });

    it('adds a beneficiary even if the start date precedes the invocation of this method', async () => {
      const tx = await contract.addBeneficiary(beneficiary1, start - oneWeek, oneDay, oneWeek, '1e10', {
        from: owner,
      });
      assertEvent(tx, 'BeneficiaryAdded', 'Did not emit `BeneficiaryAdded` event');

      const { receipt: { status } } = tx;
      assert.equal(status, 1, 'Could not add beneficiary');
    });

    it('adds another token vesting contract when the beneficiary exists in the pool', async () => {
      const tx1 = await contract.addBeneficiary(beneficiary1, start - oneWeek, oneDay, oneWeek, '1e10', {
        from: owner,
      });
      assertEvent(tx1, 'BeneficiaryAdded', 'Did not emit `BeneficiaryAdded` event');

      const tx2 = await contract.addBeneficiary(beneficiary1, start, oneDay, oneWeek, '1.5e10', {
        from: owner,
      });
      assertEvent(tx2, 'BeneficiaryAdded', 'Did not emit `BeneficiaryAdded` event');

      const { receipt: { status } } = tx2;
      assert.equal(status, 1, 'Could not add vesting contract');
    });
  });

  describe('#publicAttributes', () => {
    let contract;
    const totalFunds = 100;
    const beneficiaryAmount = 10;

    beforeEach(async () => {
      contract = await TokenVestingPool.new(token.address, totalFunds, { from: owner });
      await token.transfer(contract.address, totalFunds);

      const tx = await contract.addBeneficiary(
        beneficiary1,
        start,
        oneDay,
        oneWeek,
        beneficiaryAmount,
        {
          from: owner,
        },
      );
      assertEvent(tx, 'BeneficiaryAdded', 'Did not emit `BeneficiaryAdded` event');
    });

    it('uses the same token address as passed to the constructor', async () => {
      const tokenAddress = await contract.token();
      assert.equal(tokenAddress, token.address, 'Token address does not match');
    });

    it('does not modify total funds after adding a beneficiary', async () => {
      const funds = await contract.totalFunds();
      assert.equal(funds, totalFunds, 'Total Funds changed');
    });

    it('does updates distributed tokens after adding a beneficiary', async () => {
      const distributedTokens = await contract.distributedTokens();
      assert.equal(distributedTokens, beneficiaryAmount, 'Distributed Tokens is not correct');
    });

    it('does updates beneficiaries list after adding a beneficiary', async () => {
      const beneficiary = await contract.beneficiaries(0);
      assert.equal(beneficiary, beneficiary1, 'Beneficiaries list is not correct');
    });

    it('does updates beneficiary distribution contracts mapping after adding a beneficiary', async () => {
      const contractAddress = await contract.beneficiaryDistributionContracts(beneficiary1, 0);
      const contracts = await contract.getDistributionContracts(beneficiary1);
      const vestingBeneficiary = await TokenVesting.at(contractAddress).beneficiary();
      assert.equal(contracts.length, 1, 'Distribution contracts list should have one element');
      assert.equal(contractAddress, contracts[0], 'Distribution contracts list should have mapping content');
      assert.equal(vestingBeneficiary, beneficiary1, 'Distribution contract does not belong to beneficiary');
    });
  });

  describe('#getDistributionContracts', () => {
    let contract;

    beforeEach(async () => {
      contract = await TokenVestingPool.new(token.address, '1e+12', { from: owner });
      await token.transfer(contract.address, '1e+12');
    });

    it('returns the distribution contracts for a given beneficiary', async () => {
      const tx = await contract.addBeneficiary(beneficiary1, start, oneDay, oneDay, '1e+10', { from: owner });
      assertEvent(tx, 'BeneficiaryAdded', 'Did not emit `BeneficiaryAdded` event');

      const contracts = await contract.getDistributionContracts(beneficiary1);
      const firstContract = await contract.beneficiaryDistributionContracts(
        beneficiary1,
        0,
      );
      assert.equal(contracts.length, 1);
      assert.equal(contracts[0], firstContract);
    });

    it('returns an empty array if beneficiary has not been added', async () => {
      const contracts = await contract.getDistributionContracts(beneficiary2);
      assert.equal(contracts.length, 0);
    });

    it('does not return the distribution contracts if beneficiary is not a valid address', async () => {
      try {
        await contract.getDistributionContracts(zeroAddress);
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });
  });

  context('Integration Test', () => {
    let contract;

    beforeEach(async () => {
      contract = await TokenVestingPool.new(token.address, '1e+12', { from: owner });
      await token.transfer(contract.address, '1e+12');
    });

    it('transfers the corresponding tokens to the beneficiaries', async () => {
      const tx1 = await contract.addBeneficiary(beneficiary1, start, oneDay, oneDay, '1e+11', { from: owner });
      assertEvent(tx1, 'BeneficiaryAdded', 'Did not emit `BeneficiaryAdded` event');

      const tx2 = await contract.addBeneficiary(beneficiary1, start, oneDay, oneWeek, '1e+11', { from: owner });
      assertEvent(tx2, 'BeneficiaryAdded', 'Did not emit `BeneficiaryAdded` event');

      await increaseTime(oneDay * 2);

      const contracts = await contract.getDistributionContracts(beneficiary1);
      const vestingContract0 = TokenVesting.at(contracts[0]);
      const vestingContract1 = TokenVesting.at(contracts[1]);

      assert.equal(await vestingContract0.revocable(), false, 'TokenVesting contract should not be revocable');
      assert.equal(await vestingContract1.revocable(), false, 'TokenVesting contract should not be revocable');

      const balanceBefore = await token.balanceOf.call(beneficiary1);
      await vestingContract0.release(token.address);
      await vestingContract1.release(token.address);
      const balanceAfter = await token.balanceOf.call(beneficiary1);

      // the first is released entirely ('1e+11' tokens)
      // the second releases one out of seven days ('1e+11' / 7 ~= 14 tokens)
      // the third releases one out of seven days ('1e+11' / 7 ~= 14 tokens)
      assert.ok(balanceAfter.minus(balanceBefore).greaterThan(BigNumber('1.28e+11')));
    });


    it('transfers the corresponding tokens in a 10%-30%-60% scheme', async () => {
      const tx1 = await contract.addBeneficiary(beneficiary1, start, oneWeek, oneWeek, '1e+10', { from: owner });
      assertEvent(tx1, 'BeneficiaryAdded', 'Did not emit `BeneficiaryAdded` event');

      const tx2 = await contract.addBeneficiary(beneficiary1, start, oneMonth, oneMonth, '3e+10', { from: owner });
      assertEvent(tx2, 'BeneficiaryAdded', 'Did not emit `BeneficiaryAdded` event');

      const tx3 = await contract.addBeneficiary(beneficiary1, start, oneMonth * 3, oneMonth * 3, '6e+10', { from: owner });
      assertEvent(tx3, 'BeneficiaryAdded', 'Did not emit `BeneficiaryAdded` event');

      const contracts = await contract.getDistributionContracts(beneficiary1);

      // 1 week
      let tokenVesting = TokenVesting.at(contracts[0]);
      // Travel to one hour before the cliff period ends.
      await increaseTime(oneWeek - oneHour);

      assert.equal(await tokenVesting.revocable(), false, 'TokenVesting contract should not be revocable');

      try {
        await tokenVesting.release(token.address);
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }

      // Travel to the exact moment when the cliff ends.
      await increaseTime(oneHour);
      const balanceBefore = await token.balanceOf.call(beneficiary1);
      await tokenVesting.release(token.address);
      let balanceAfterCliff = await token.balanceOf.call(beneficiary1);
      assert.ok(balanceAfterCliff.minus(balanceBefore).eq(BigNumber('1e+10')));

      // 1 month
      tokenVesting = TokenVesting.at(contracts[1]);
      // Travel to one hour before the cliff period ends.
      await increaseTime(oneMonth - oneWeek - oneHour);

      assert.equal(await tokenVesting.revocable(), false, 'TokenVesting contract should not be revocable');

      try {
        await tokenVesting.release(token.address);
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }

      await increaseTime(oneHour);
      await tokenVesting.release(token.address);
      balanceAfterCliff = await token.balanceOf.call(beneficiary1);
      assert.ok(balanceAfterCliff.minus(balanceBefore).eq(BigNumber('4e+10')));

      // 3 months
      tokenVesting = TokenVesting.at(contracts[2]);
      // Travel to one hour before the cliff period ends.
      await increaseTime(oneMonth * 2 - oneHour);

      assert.equal(await tokenVesting.revocable(), false, 'TokenVesting contract should not be revocable');

      try {
        await tokenVesting.release(token.address);
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }

      await increaseTime(oneHour);
      await tokenVesting.release(token.address);
      balanceAfterCliff = await token.balanceOf.call(beneficiary1);
      assert.ok(balanceAfterCliff.minus(balanceBefore).eq(BigNumber('1e+11')));
    });

    it('transfers the corresponding tokens in a 33%-33%-33% scheme', async () => {
      contract = await TokenVestingPool.new(token.address, '3e+10', { from: owner });
      await token.transfer(contract.address, '3e+10');

      const tx1 = await contract.addBeneficiary(beneficiary1, start, oneMonth, oneMonth, '1e+10', { from: owner });
      assertEvent(tx1, 'BeneficiaryAdded', 'Did not emit `BeneficiaryAdded` event');

      const tx2 = await contract.addBeneficiary(beneficiary1, start, oneMonth * 2, oneMonth * 2, '1e+10', { from: owner });
      assertEvent(tx2, 'BeneficiaryAdded', 'Did not emit `BeneficiaryAdded` event');

      const tx3 = await contract.addBeneficiary(beneficiary1, start, oneMonth * 3, oneMonth * 3, '1e+10', { from: owner });
      assertEvent(tx3, 'BeneficiaryAdded', 'Did not emit `BeneficiaryAdded` event');

      const contracts = await contract.getDistributionContracts(beneficiary1);

      // 1 month
      let tokenVesting = TokenVesting.at(contracts[0]);
      // Travel to one hour before the cliff period ends.
      await increaseTime(oneMonth - oneHour);

      assert.equal(await tokenVesting.revocable(), false, 'TokenVesting contract should not be revocable');

      try {
        await tokenVesting.release(token.address);
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }

      // Travel to the exact moment when the cliff ends.
      await increaseTime(oneHour);
      const balanceBefore = await token.balanceOf.call(beneficiary1);
      await tokenVesting.release(token.address);
      let balanceAfterCliff = await token.balanceOf.call(beneficiary1);
      assert.ok(balanceAfterCliff.minus(balanceBefore).eq(BigNumber('1e+10')));

      // 2 months
      tokenVesting = TokenVesting.at(contracts[1]);
      // Travel to one hour before the cliff period ends.
      await increaseTime(oneMonth - oneHour);

      assert.equal(await tokenVesting.revocable(), false, 'TokenVesting contract should not be revocable');

      try {
        await tokenVesting.release(token.address);
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }

      await increaseTime(oneHour);
      await tokenVesting.release(token.address);
      balanceAfterCliff = await token.balanceOf.call(beneficiary1);
      assert.ok(balanceAfterCliff.minus(balanceBefore).eq(BigNumber('2e+10')));

      // 3 months
      tokenVesting = TokenVesting.at(contracts[2]);
      // Travel to one hour before the cliff period ends.
      await increaseTime(oneMonth - oneHour);

      assert.equal(await tokenVesting.revocable(), false, 'TokenVesting contract should not be revocable');

      try {
        await tokenVesting.release(token.address);
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }

      await increaseTime(oneHour);
      await tokenVesting.release(token.address);
      balanceAfterCliff = await token.balanceOf.call(beneficiary1);
      assert.ok(balanceAfterCliff.minus(balanceBefore).eq(BigNumber('3e+10')));
    });
  });
});
