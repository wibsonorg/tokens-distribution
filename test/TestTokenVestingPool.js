const { assertRevert, increaseTime } = require('./utils/helpers');

const TokenVestingPool = artifacts.require('./TokenVestingPool.sol');
const Wibcoin = artifacts.require('../test/utils/Wibcoin.sol');
const TokenVesting = artifacts.require('TokenVesting');

contract('TokenVestingPool', (accounts) => {
  const owner = accounts[0];
  const beneficiary1 = accounts[1];
  const beneficiary2 = accounts[2];
  const zeroAddress = '0x0000000000000000000000000000000000000000';
  const fakeAddress = '0x0123123123123123123123123123123123123123';

  const start = Date.now() / 1000;
  const oneDay = 86400;
  const oneWeek = oneDay * 7;

  let token;

  beforeEach(async () => {
    token = await Wibcoin.new({ from: owner });
  });

  describe('#constructor', () => {
    it('does not create an instance of the contract when the token argument is invalid', async () => {
      try {
        await TokenVestingPool.new(zeroAddress, 1000, { from: owner });
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
      const contract = await TokenVestingPool.new(token.address, 1000, { from: owner });
      assert.ok(contract);
    });
  });

  describe('#addBeneficiary', () => {
    let contract;

    beforeEach(async () => {
      contract = await TokenVestingPool.new(token.address, 100, { from: owner });
      await token.transfer(contract.address, 100);
    });

    it('does not add a beneficiary when the beneficiary is the owner', async () => {
      try {
        await contract.addBeneficiary(owner, start, oneDay, oneWeek, false, 10, { from: owner });
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('does not add a beneficiary when the address is invalid', async () => {
      try {
        await contract.addBeneficiary(zeroAddress, start, oneDay, oneWeek, false, 10, {
          from: owner,
        });
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('does not add a beneficiary when the beneficiary is the contract itself', async () => {
      try {
        await contract.addBeneficiary(contract.address, start, oneDay, oneWeek, false, 10, {
          from: owner,
        });
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('does not add a beneficiary when the duration time is lesser than the cliff time', async () => {
      try {
        await contract.addBeneficiary(beneficiary1, start, oneWeek, oneDay, false, 10, {
          from: owner,
        });
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('does not add a beneficiary when the amount of tokens to distribute is more than the total funds', async () => {
      try {
        await contract.addBeneficiary(beneficiary1, start, oneDay, oneWeek, false, 1000, {
          from: owner,
        });
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('does not add a beneficiary when the token balance is not enough', async () => {
      const anotherContract = await TokenVestingPool.new(token.address, 100, { from: owner });
      await token.transfer(anotherContract.address, 10);

      try {
        await anotherContract.addBeneficiary(beneficiary1, start, oneDay, oneWeek, false, 100, {
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
      } = await contract.addBeneficiary(beneficiary1, start, oneDay, oneWeek, false, 10, {
        from: owner,
      });

      assert.equal(status, 1, 'Could not add beneficiary');
    });

    it('adds a beneficiary even if the start date precedes the invocation of this method', async () => {
      const {
        receipt: { status },
      } = await contract.addBeneficiary(beneficiary1, start - oneWeek, oneDay, oneWeek, false, 10, {
        from: owner,
      });

      assert.equal(status, 1, 'Could not add beneficiary');
    });

    it('adds another token vesting contract when the beneficiary exists in the pool', async () => {
      await contract.addBeneficiary(beneficiary1, start - oneWeek, oneDay, oneWeek, false, 10, {
        from: owner,
      });
      const {
        receipt: { status },
      } = await contract.addBeneficiary(beneficiary1, start, oneDay, oneWeek, false, 15, {
        from: owner,
      });

      assert.equal(status, 1, 'Could not add vesting contract');
    });

    it('adds a beneficiary to the token pool with revocable tokens', async () => {
      const {
        receipt: { status },
      } = await contract.addBeneficiary(beneficiary1, start, oneDay, oneWeek, true, 20, {
        from: owner,
      });

      assert.equal(status, 1, 'Could not add beneficiary');
    });

    it('adds a beneficiary even if another token vesting contract was revoked for the same beneficiary', async () => {
      await contract.addBeneficiary(beneficiary1, start, oneDay, oneWeek, true, 20, {
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
        20,
        { from: owner },
      );

      assert.equal(revokeTx.status, 1, 'Could not revoke vesting');
      assert.equal(addTx.status, 1, 'Could not add beneficiary');
    });

    it('adds a beneficiary even if another token vesting contract was revoked for the other beneficiary', async () => {
      await contract.addBeneficiary(beneficiary2, start, oneDay, oneWeek, true, 20, {
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
        20,
        { from: owner },
      );

      assert.equal(revokeTx.status, 1, 'Could not revoke vesting');
      assert.equal(addTx.status, 1, 'Could not add beneficiary');
    });
  });

  describe('#revoke', () => {
    let contract;

    beforeEach(async () => {
      contract = await TokenVestingPool.new(token.address, 100, { from: owner });
      await token.transfer(contract.address, 100);
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
      await contract.addBeneficiary(beneficiary1, start, oneDay, oneWeek, true, 20, {
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
      await contract.addBeneficiary(beneficiary1, start, oneDay, oneWeek, true, 20, {
        from: owner,
      });

      try {
        await contract.revoke(beneficiary1, contract.address, { from: owner });
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('does not revoke the tokens of unexistent beneficiary', async () => {
      try {
        await contract.revoke(beneficiary1, fakeAddress, { from: owner });
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('does not revoke the tokens of unexistent vesting contract', async () => {
      await contract.addBeneficiary(beneficiary1, start, oneDay, oneWeek, true, 20, {
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
      await contract.addBeneficiary(beneficiary1, start, oneDay, oneWeek, true, 20, {
        from: owner,
      });
      await contract.addBeneficiary(beneficiary2, start, oneDay, oneWeek, true, 20, {
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

    it('does not revoke the unrevocable tokens', async () => {
      await contract.addBeneficiary(beneficiary1, start, oneDay, oneWeek, false, 20, {
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
      await contract.addBeneficiary(beneficiary1, start, oneDay, oneWeek, true, 20, {
        from: owner,
      });
      const contracts = await contract.getDistributionContracts(beneficiary1);
      const revokeTx = await contract.revoke(beneficiary1, contracts[0], { from: owner });
      assert.equal(revokeTx.receipt.status, 1, 'Could not revoke vesting');
    });

    it('revokes tokens even if another token vesting contract was added for another beneficiary', async () => {
      await contract.addBeneficiary(beneficiary2, start, oneDay, oneWeek, true, 20, {
        from: owner,
      });
      await contract.addBeneficiary(beneficiary1, start, oneDay, oneWeek, true, 20, {
        from: owner,
      });
      const contracts = await contract.getDistributionContracts(beneficiary2);
      const revokeTx = await contract.revoke(beneficiary2, contracts[0], { from: owner });
      assert.equal(revokeTx.receipt.status, 1, 'Could not revoke vesting');
    });

    it('revokes tokens even if another token vesting contract was added for the same beneficiary', async () => {
      await contract.addBeneficiary(beneficiary1, start, oneDay, oneWeek, true, 20, {
        from: owner,
      });
      const contracts = await contract.getDistributionContracts(beneficiary1);
      await contract.addBeneficiary(beneficiary1, start, oneDay, oneWeek, true, 20, {
        from: owner,
      });
      const revokeTx = await contract.revoke(beneficiary1, contracts[0], { from: owner });
      assert.equal(revokeTx.receipt.status, 1, 'Could not revoke vesting');
    });

    it('revokes tokens even if another token vesting contract was revoked for the other beneficiary', async () => {
      await contract.addBeneficiary(beneficiary1, start, oneDay, oneWeek, true, 20, {
        from: owner,
      });
      await contract.addBeneficiary(beneficiary2, start, oneDay, oneWeek, true, 20, {
        from: owner,
      });
      const contracts1 = await contract.getDistributionContracts(beneficiary1);
      const contracts2 = await contract.getDistributionContracts(beneficiary2);
      await contract.revoke(beneficiary2, contracts2[0], { from: owner });
      const revokeTx = await contract.revoke(beneficiary1, contracts1[0], { from: owner });
      assert.equal(revokeTx.receipt.status, 1, 'Could not revoke vesting');
    });

    it('revokes tokens even if another token vesting contract was revoked for the same beneficiary', async () => {
      await contract.addBeneficiary(beneficiary1, start, oneDay, oneWeek, true, 20, {
        from: owner,
      });
      await contract.addBeneficiary(beneficiary1, start, oneDay, oneWeek, true, 20, {
        from: owner,
      });
      const contracts = await contract.getDistributionContracts(beneficiary1);
      await contract.revoke(beneficiary1, contracts[1], { from: owner });
      const revokeTx = await contract.revoke(beneficiary1, contracts[0], { from: owner });
      assert.equal(revokeTx.receipt.status, 1, 'Could not revoke vesting');
    });
  });

  context('when multiple vesting contracts are added', () => {
    let contract;

    beforeEach(async () => {
      contract = await TokenVestingPool.new(token.address, 1000, { from: owner });
      await token.transfer(contract.address, 1000);
      await contract.addBeneficiary(beneficiary1, start, oneDay, oneDay, false, 100);
      await contract.addBeneficiary(beneficiary1, start, oneDay, oneWeek, true, 100);
      await contract.addBeneficiary(beneficiary2, start, oneDay, oneWeek, false, 100);
    });

    it('transfers the corresponding tokens to the beneficiaries', async () => {
      await increaseTime(oneDay * 2);

      const contracts = await contract.getDistributionContracts(beneficiary1);
      const vestingContract0 = TokenVesting.at(contracts[0]);
      const vestingContract1 = TokenVesting.at(contracts[1]);

      const balanceBefore = await token.balanceOf.call(beneficiary1);
      await vestingContract0.release(token.address);
      await vestingContract1.release(token.address);
      const balanceAfter = await token.balanceOf.call(beneficiary1);

      // the first is released entirely (100 tokens)
      // the second releases one out of seven days (100 / 7 ~= 14 tokens)
      // the third releases one out of seven days (100 / 7 ~= 14 tokens)
      assert.ok((Number(balanceAfter) - Number(balanceBefore)) >= 128);
    });
  });
});
