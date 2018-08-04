const { assertRevert } = require('./utils/helpers');

const TokenVestingPool = artifacts.require('./TokenVestingPool.sol');
const Wibcoin = artifacts.require('../test/utils/Wibcoin.sol');
const TokenVesting = artifacts.require('TokenVesting');

const rpc = (method, arg) => {
  const req = { jsonrpc: '2.0', method, id: new Date().getTime() };
  if (arg) req.params = arg;

  return new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync(req, (err, result) => {
      if (err) return reject(err);
      if (result && result.error) {
        const msg = `RPC Error: ${result.error.message || result.error}`;
        return reject(new Error(msg));
      }
      return resolve(result);
    });
  });
};

const evmSnapshot = async () => {
  const { result } = await rpc('evm_snapshot');
  return result;
};

const evmRevert = id => rpc('evm_revert', [id]);
const evmIncreaseTime = time => rpc('evm_increaseTime', [time]);

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

    it('does not create an instance of the contract when the allowed spending is zero', async () => {
      try {
        await TokenVestingPool.new(token.address, 0, { from: owner });
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('creates an instance of the contract', async () => {
      const contract = await TokenVestingPool.new(token.address, 1000, { from: owner });
      assert.ok(contract !== null);
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
        await contract.addBeneficiary(
          owner, start, oneDay, oneWeek, false, 10,
          { from: owner },
        );
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('does not add a beneficiary when the address is invalid', async () => {
      try {
        await contract.addBeneficiary(
          zeroAddress, start, oneDay, oneWeek, false, 10,
          { from: owner },
        );
        await contract.addBeneficiary(
          contract.address, start, oneDay, oneWeek, false, 10,
          { from: owner },
        );
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('does not add a beneficiary when the duration time is lesser than the cliff time', async () => {
      try {
        await contract.addBeneficiary(
          beneficiary1, start, oneWeek, oneDay, false, 10,
          { from: owner },
        );
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('does not add a beneficiary when the amount of tokens to distribute is no enough', async () => {
      try {
        await contract.addBeneficiary(
          beneficiary1, start, oneDay, oneWeek, false, 1000,
          { from: owner },
        );
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('does not add a beneficiary when the token balance is not enough', async () => {
      const anotherContract = await TokenVestingPool.new(token.address, 100, { from: owner });
      await token.transfer(anotherContract.address, 10);

      try {
        await anotherContract.addBeneficiary(
          beneficiary1, start, oneDay, oneWeek, false, 100,
          { from: owner },
        );
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('does not add a beneficiary when amount of tokens is zero', async () => {
      try {
        await contract.addBeneficiary(
          beneficiary1, start, oneDay, oneWeek, false, 0,
          { from: owner },
        );
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('adds a beneficiary to the token pool', async () => {
      const { receipt: { status } } = await contract.addBeneficiary(
        beneficiary1, start, oneDay, oneWeek, false, 10,
        { from: owner },
      );

      assert.ok(status === '0x1', 'Could not add beneficiary');
    });

    it('adds a beneficiary even if the start date precedes the invocation of this method', async () => {
      const { receipt: { status } } = await contract.addBeneficiary(
        beneficiary1, start - oneWeek, oneDay, oneWeek, false, 10,
        { from: owner },
      );

      assert.ok(status === '0x1', 'Could not add beneficiary');
    });

    it('adds another token vesting contract when the beneficiary exists in the pool', async () => {
      await contract.addBeneficiary(
        beneficiary1, start - oneWeek, oneDay, oneWeek, false, 10,
        { from: owner },
      );
      const { receipt: { status } } = await contract.addBeneficiary(
        beneficiary1, start, oneDay, oneWeek, false, 15,
        { from: owner },
      );

      assert.ok(status === '0x1', 'Could not add vesting contract');
    });

    it('adds a beneficiary to the token pool with revocable tokens', async () => {
      const { receipt: { status } } = await contract.addBeneficiary(
        beneficiary1, start, oneDay, oneWeek, true, 20,
        { from: owner },
      );

      assert.ok(status === '0x1', 'Could not add beneficiary');
    });

    it('adds a beneficiary even if another token vesting contract was revoked for the same beneficiary', async () => {
      await contract.addBeneficiary(
        beneficiary1, start, oneDay, oneWeek, true, 20,
        { from: owner },
      );
      const contracts = await contract.getDistributionContracts(beneficiary1);
      const { receipt: revokeTx } = await contract.revoke(
        beneficiary1, contracts[0],
        { from: owner },
      );
      const { receipt: addTx } = await contract.addBeneficiary(
        beneficiary1, start, oneDay, oneWeek, true, 20,
        { from: owner },
      );

      assert.ok(revokeTx.status === '0x1', 'Could not revoke vesting');
      assert.ok(addTx.status === '0x1', 'Could not add beneficiary');
    });

    it('adds a beneficiary even if another token vesting contract was revoked for the other beneficiary', async () => {
      await contract.addBeneficiary(
        beneficiary2, start, oneDay, oneWeek, true, 20,
        { from: owner },
      );
      const contracts = await contract.getDistributionContracts(beneficiary2);
      const { receipt: revokeTx } = await contract.revoke(
        beneficiary2, contracts[0],
        { from: owner },
      );
      const { receipt: addTx } = await contract.addBeneficiary(
        beneficiary1, start, oneDay, oneWeek, true, 20,
        { from: owner },
      );

      assert.ok(revokeTx.status === '0x1', 'Could not revoke vesting');
      assert.ok(addTx.status === '0x1', 'Could not add beneficiary');
    });
  });

  describe('#revoke', () => {
    let contract;

    beforeEach(async () => {
      contract = await TokenVestingPool.new(token.address, 100, { from: owner });
      await token.transfer(contract.address, 100);
    });

    it('does not revoke the tokens of an invalid beneficiary address', async () => {
      try {
        await contract.revoke(zeroAddress, fakeAddress, { from: owner });
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('does not revoke the tokens of an invalid vesting contract address', async () => {
      await contract.addBeneficiary(
        beneficiary1, start, oneDay, oneWeek, true, 20,
        { from: owner },
      );

      try {
        await contract.revoke(beneficiary1, zeroAddress, { from: owner });
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
      await contract.addBeneficiary(
        beneficiary1, start, oneDay, oneWeek, true, 20,
        { from: owner },
      );

      try {
        await contract.revoke(beneficiary1, fakeAddress, { from: owner });
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('does not revoke the unrevocable tokens', async () => {
      await contract.addBeneficiary(
        beneficiary1, start, oneDay, oneWeek, false, 20,
        { from: owner },
      );
      const contracts = await contract.getDistributionContracts(beneficiary1, 0, 0);

      try {
        await contract.revoke(beneficiary1, contracts[0], { from: owner });
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('revokes tokens', async () => {
      await contract.addBeneficiary(
        beneficiary1, start, oneDay, oneWeek, true, 20,
        { from: owner },
      );
      const contracts = await contract.getDistributionContracts(beneficiary1);
      const revokeTx = await contract.revoke(beneficiary1, contracts[0], { from: owner });
      assert.ok(revokeTx.status === '0x1', 'Could not revoke vesting');
    });

    it('revokes tokens even if another token vesting contract was added for the other beneficiary', async () => {
      await contract.addBeneficiary(
        beneficiary2, start, oneDay, oneWeek, true, 20,
        { from: owner },
      );
      const contracts = await contract.getDistributionContracts(beneficiary1);
      await contract.addBeneficiary(
        beneficiary1, start, oneDay, oneWeek, true, 20,
        { from: owner },
      );
      const revokeTx = await contract.revoke(beneficiary1, contracts[0], { from: owner });
      assert.ok(revokeTx.status === '0x1', 'Could not revoke vesting');
    });

    it('revokes tokens even if another token vesting contract was added for the same beneficiary', async () => {
      await contract.addBeneficiary(
        beneficiary1, start, oneDay, oneWeek, true, 20,
        { from: owner },
      );
      const contracts = await contract.getDistributionContracts(beneficiary1);
      await contract.addBeneficiary(
        beneficiary1, start, oneDay, oneWeek, true, 20,
        { from: owner },
      );
      const revokeTx = await contract.revoke(beneficiary1, contracts[0], { from: owner });
      assert.ok(revokeTx.status === '0x1', 'Could not revoke vesting');
    });

    it('revokes tokens even if another token vesting contract was revoked for the other beneficiary', async () => {
      await contract.addBeneficiary(
        beneficiary1, start, oneDay, oneWeek, true, 20,
        { from: owner },
      );
      await contract.addBeneficiary(
        beneficiary2, start, oneDay, oneWeek, true, 20,
        { from: owner },
      );
      const contracts1 = await contract.getDistributionContracts(beneficiary1);
      const contracts2 = await contract.getDistributionContracts(beneficiary2);
      await contract.revoke(beneficiary2, contracts2[0], { from: owner });
      const revokeTx = await contract.revoke(beneficiary1, contracts1[0], { from: owner });
      assert.ok(revokeTx.status === '0x1', 'Could not revoke vesting');
    });

    it('revokes tokens even if another token vesting contract was revoked for the same beneficiary', async () => {
      await contract.addBeneficiary(
        beneficiary1, start, oneDay, oneWeek, true, 20,
        { from: owner },
      );
      await contract.addBeneficiary(
        beneficiary1, start, oneDay, oneWeek, true, 20,
        { from: owner },
      );
      const contracts = await contract.getDistributionContracts(beneficiary1);
      await contract.revoke(beneficiary1, contracts[1], { from: owner });
      const revokeTx = await contract.revoke(beneficiary1, contracts[0], { from: owner });
      assert.ok(revokeTx.status === '0x1', 'Could not revoke vesting');
    });
  });

  context('when multiple vesting contracts are added', () => {
    let snapshotId;
    let contract;

    beforeEach(async () => {
      snapshotId = await evmSnapshot();
      contract = await TokenVestingPool.new(token.address, 1000, { from: owner });
      await contract.addBeneficiary(
        beneficiary1,
        start,
        oneDay,
        oneDay,
        false,
        100,
      );
      await contract.addBeneficiary(
        beneficiary1,
        start,
        oneDay,
        oneWeek,
        true,
        100,
      );
      await contract.addBeneficiary(
        beneficiary2,
        start,
        oneDay,
        oneWeek,
        false,
        100,
      );
    });

    afterEach(() => evmRevert(snapshotId));

    it('transfers the corresponding tokens to the beneficiaries', async () => {
      await evmIncreaseTime(oneDay * 2);

      const contracts = await contract.getDistributionContracts(beneficiary1);
      const vestingContract0 = TokenVesting.at(contracts[0]);
      const vestingContract1 = TokenVesting.at(contracts[1]);

      const balanceBefore = await token.balanceOf(beneficiary1);
      await vestingContract0.release(token);
      await vestingContract1.release(token);
      const balanceAfter = await token.balanceOf(beneficiary1);

      assert.equal(balanceAfter - balanceBefore, 100);
    });
  });
});
