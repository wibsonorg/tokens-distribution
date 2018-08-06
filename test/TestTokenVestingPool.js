const BigNumber = require('bignumber.js');
const {
  assertRevert, increaseTime, now, advanceBlock,
} = require('./utils/helpers');

const TokenVestingPool = artifacts.require('./TokenVestingPool.sol');
const Wibcoin = artifacts.require('../test/utils/Wibcoin.sol');
const TokenVesting = artifacts.require('TokenVesting');

contract('TokenVestingPool', (accounts) => {
  const owner = accounts[0];
  const beneficiary1 = accounts[1];
  const beneficiary2 = accounts[2];
  const zeroAddress = '0x0000000000000000000000000000000000000000';
  const fakeAddress = '0x0123123123123123123123123123123123123123';

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
        await contract.addBeneficiary(owner, start, oneDay, oneWeek, false, '1e10', { from: owner });
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('does not add a beneficiary when the address is invalid', async () => {
      try {
        await contract.addBeneficiary(zeroAddress, start, oneDay, oneWeek, false, '1e10', {
          from: owner,
        });
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('does not add a beneficiary when the beneficiary is the contract itself', async () => {
      try {
        await contract.addBeneficiary(contract.address, start, oneDay, oneWeek, false, '1e10', {
          from: owner,
        });
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('does not add a beneficiary when the duration time is lesser than the cliff time', async () => {
      try {
        await contract.addBeneficiary(beneficiary1, start, oneWeek, oneDay, false, '1e10', {
          from: owner,
        });
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('does not add a beneficiary when the amount of tokens to distribute is more than the total funds', async () => {
      try {
        await contract.addBeneficiary(beneficiary1, start, oneDay, oneWeek, false, '1e+12', {
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
        await anotherContract.addBeneficiary(beneficiary1, start, oneDay, oneWeek, false, '1e+11', {
          from: owner,
        });
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('does not add a beneficiary when amount of tokens is zero', async () => {
      try {
        await contract.addBeneficiary(beneficiary1, start, oneDay, oneWeek, false, 0, {
          from: owner,
        });
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('adds a beneficiary to the token pool', async () => {
      const {
        receipt: { status },
      } = await contract.addBeneficiary(beneficiary1, start, oneDay, oneWeek, false, '1e10', {
        from: owner,
      });

      assert.equal(status, 1, 'Could not add beneficiary');
    });

    it('adds a beneficiary even if the start date precedes the invocation of this method', async () => {
      const {
        receipt: { status },
      } = await contract.addBeneficiary(beneficiary1, start - oneWeek, oneDay, oneWeek, false, '1e10', {
        from: owner,
      });

      assert.equal(status, 1, 'Could not add beneficiary');
    });

    it('adds another token vesting contract when the beneficiary exists in the pool', async () => {
      await contract.addBeneficiary(beneficiary1, start - oneWeek, oneDay, oneWeek, false, '1e10', {
        from: owner,
      });
      const {
        receipt: { status },
      } = await contract.addBeneficiary(beneficiary1, start, oneDay, oneWeek, false, '1.5e10', {
        from: owner,
      });

      assert.equal(status, 1, 'Could not add vesting contract');
    });

    it('adds a beneficiary to the token pool with revocable tokens', async () => {
      const {
        receipt: { status },
      } = await contract.addBeneficiary(beneficiary1, start, oneDay, oneWeek, true, '2e+10', {
        from: owner,
      });

      assert.equal(status, 1, 'Could not add beneficiary');
    });

    it('adds a beneficiary even if another token vesting contract was revoked for the same beneficiary', async () => {
      await contract.addBeneficiary(beneficiary1, start, oneDay, oneWeek, true, '2e+10', {
        from: owner,
      });
      const contracts = await contract.getDistributionContracts(beneficiary1);
      const { receipt: revokeTx } = await contract.revoke(beneficiary1, contracts[0], {
        from: owner,
      });
      const { receipt: addTx } = await contract.addBeneficiary(
        beneficiary1,
        start,
        oneDay,
        oneWeek,
        true,
        '2e+10',
        { from: owner },
      );

      assert.equal(revokeTx.status, 1, 'Could not revoke vesting');
      assert.equal(addTx.status, 1, 'Could not add beneficiary');
    });

    it('adds a beneficiary even if another token vesting contract was revoked for the other beneficiary', async () => {
      await contract.addBeneficiary(beneficiary2, start, oneDay, oneWeek, true, '2e+10', {
        from: owner,
      });
      const contracts = await contract.getDistributionContracts(beneficiary2);
      const { receipt: revokeTx } = await contract.revoke(beneficiary2, contracts[0], {
        from: owner,
      });
      const { receipt: addTx } = await contract.addBeneficiary(
        beneficiary1,
        start,
        oneDay,
        oneWeek,
        true,
        '2e+10',
        { from: owner },
      );

      assert.equal(revokeTx.status, 1, 'Could not revoke vesting');
      assert.equal(addTx.status, 1, 'Could not add beneficiary');
    });
  });

  describe('#revoke', () => {
    let contract;

    beforeEach(async () => {
      contract = await TokenVestingPool.new(token.address, '1e+11', { from: owner });
      await token.transfer(contract.address, '1e+11');
    });

    it('does not revoke the tokens of a beneficiary with zero as address', async () => {
      try {
        await contract.revoke(zeroAddress, fakeAddress, { from: owner });
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('does not revoke the tokens of a beneficiary with the address of the pool', async () => {
      try {
        await contract.revoke(contract.address, fakeAddress, { from: owner });
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('does not revoke the tokens of a vesting contract with zero as address', async () => {
      await contract.addBeneficiary(beneficiary1, start, oneDay, oneWeek, true, '2e+10', {
        from: owner,
      });

      try {
        await contract.revoke(beneficiary1, zeroAddress, { from: owner });
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('does not revoke the tokens of a vesting contract with the address of the pool', async () => {
      await contract.addBeneficiary(beneficiary1, start, oneDay, oneWeek, true, '2e+10', {
        from: owner,
      });

      try {
        await contract.revoke(beneficiary1, contract.address, { from: owner });
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('does not revoke the tokens of nonexistent beneficiary', async () => {
      try {
        await contract.revoke(beneficiary1, fakeAddress, { from: owner });
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('does not revoke the tokens of nonexistent vesting contract', async () => {
      await contract.addBeneficiary(beneficiary1, start, oneDay, oneWeek, true, '2e+10', {
        from: owner,
      });

      try {
        await contract.revoke(beneficiary1, fakeAddress, { from: owner });
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('does not revoke the tokens of an existing beneficiary with a vesting contract that does not belong to him/her', async () => {
      await contract.addBeneficiary(beneficiary1, start, oneDay, oneWeek, true, '2e+10', {
        from: owner,
      });
      await contract.addBeneficiary(beneficiary2, start, oneDay, oneWeek, true, '2e+10', {
        from: owner,
      });
      const contracts = await contract.getDistributionContracts(beneficiary2);

      try {
        await contract.revoke(beneficiary1, contracts[0], { from: owner });
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('does not revoke the irrevocable tokens', async () => {
      await contract.addBeneficiary(beneficiary1, start, oneDay, oneWeek, false, '2e+10', {
        from: owner,
      });
      const contracts = await contract.getDistributionContracts(beneficiary1);

      try {
        await contract.revoke(beneficiary1, contracts[0], { from: owner });
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('revokes tokens', async () => {
      await contract.addBeneficiary(beneficiary1, start, oneDay, oneWeek, true, '2e+10', {
        from: owner,
      });
      const contracts = await contract.getDistributionContracts(beneficiary1);
      const revokeTx = await contract.revoke(beneficiary1, contracts[0], { from: owner });
      assert.equal(revokeTx.receipt.status, 1, 'Could not revoke vesting');
    });

    it('revokes tokens even if another token vesting contract was added for another beneficiary', async () => {
      await contract.addBeneficiary(beneficiary2, start, oneDay, oneWeek, true, '2e+10', {
        from: owner,
      });
      await contract.addBeneficiary(beneficiary1, start, oneDay, oneWeek, true, '2e+10', {
        from: owner,
      });
      const contracts = await contract.getDistributionContracts(beneficiary2);
      const revokeTx = await contract.revoke(beneficiary2, contracts[0], { from: owner });
      assert.equal(revokeTx.receipt.status, 1, 'Could not revoke vesting');
    });

    it('revokes tokens even if another token vesting contract was added for the same beneficiary', async () => {
      await contract.addBeneficiary(beneficiary1, start, oneDay, oneWeek, true, '2e+10', {
        from: owner,
      });
      const contracts = await contract.getDistributionContracts(beneficiary1);
      await contract.addBeneficiary(beneficiary1, start, oneDay, oneWeek, true, '2e+10', {
        from: owner,
      });
      const revokeTx = await contract.revoke(beneficiary1, contracts[0], { from: owner });
      assert.equal(revokeTx.receipt.status, 1, 'Could not revoke vesting');
    });

    it('revokes tokens even if another token vesting contract was revoked for the other beneficiary', async () => {
      await contract.addBeneficiary(beneficiary1, start, oneDay, oneWeek, true, '2e+10', {
        from: owner,
      });
      await contract.addBeneficiary(beneficiary2, start, oneDay, oneWeek, true, '2e+10', {
        from: owner,
      });
      const contracts1 = await contract.getDistributionContracts(beneficiary1);
      const contracts2 = await contract.getDistributionContracts(beneficiary2);
      await contract.revoke(beneficiary2, contracts2[0], { from: owner });
      const revokeTx = await contract.revoke(beneficiary1, contracts1[0], { from: owner });
      assert.equal(revokeTx.receipt.status, 1, 'Could not revoke vesting');
    });

    it('revokes tokens even if another token vesting contract was revoked for the same beneficiary', async () => {
      await contract.addBeneficiary(beneficiary1, start, oneDay, oneWeek, true, '2e+10', {
        from: owner,
      });
      await contract.addBeneficiary(beneficiary1, start, oneDay, oneWeek, true, '2e+10', {
        from: owner,
      });
      const contracts = await contract.getDistributionContracts(beneficiary1);
      await contract.revoke(beneficiary1, contracts[1], { from: owner });
      const revokeTx = await contract.revoke(beneficiary1, contracts[0], { from: owner });
      assert.equal(revokeTx.receipt.status, 1, 'Could not revoke vesting');
    });
  });

  describe('#getDistributionContracts', () => {
    let contract;

    beforeEach(async () => {
      contract = await TokenVestingPool.new(token.address, '1e+12', { from: owner });
      await token.transfer(contract.address, '1e+12');
    });

    it('returns the distribution contracts for a given beneficiary', async () => {
      await contract.addBeneficiary(beneficiary1, start, oneDay, oneDay, false, '1e+10', { from: owner });
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

  context('integrtion testing', () => {
    let contract;

    beforeEach(async () => {
      contract = await TokenVestingPool.new(token.address, '1e+12', { from: owner });
      await token.transfer(contract.address, '1e+12');
    });

    it('transfers the corresponding tokens to the beneficiaries', async () => {
      await contract.addBeneficiary(beneficiary1, start, oneDay, oneDay, false, '1e+11', { from: owner });
      await contract.addBeneficiary(beneficiary1, start, oneDay, oneWeek, true, '1e+11', { from: owner });

      await increaseTime(oneDay * 2);

      const contracts = await contract.getDistributionContracts(beneficiary1);
      const vestingContract0 = TokenVesting.at(contracts[0]);
      const vestingContract1 = TokenVesting.at(contracts[1]);

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
      await contract.addBeneficiary(beneficiary1, start, oneWeek, oneWeek, false, '1e+10', { from: owner });
      await contract.addBeneficiary(beneficiary1, start, oneMonth, oneMonth, false, '3e+10', { from: owner });
      await contract.addBeneficiary(beneficiary1, start, oneMonth * 3, oneMonth * 3, false, '6e+10', { from: owner });

      const contracts = await contract.getDistributionContracts(beneficiary1);

      // 1 week
      let tokenVesting = TokenVesting.at(contracts[0]);
      // Travel to one hour before the cliff period ends.
      await increaseTime(oneWeek - oneHour);

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

      await contract.addBeneficiary(beneficiary1, start, oneMonth, oneMonth, false, '1e+10', { from: owner });
      await contract.addBeneficiary(beneficiary1, start, oneMonth * 2, oneMonth * 2, false, '1e+10', { from: owner });
      await contract.addBeneficiary(beneficiary1, start, oneMonth * 3, oneMonth * 3, false, '1e+10', { from: owner });

      const contracts = await contract.getDistributionContracts(beneficiary1);

      // 1 month
      let tokenVesting = TokenVesting.at(contracts[0]);
      // Travel to one hour before the cliff period ends.
      await increaseTime(oneMonth - oneHour);

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
