const { assertRevert } = require('./utils/helpers');

const TokenTimelockPool = artifacts.require('./TokenTimelockPool.sol');
const Wibcoin = artifacts.require('../test/utils/Wibcoin.sol');

contract('TokenTimelockPool', (accounts) => {
  const owner = accounts[0];
  const releaseDate = Date.now() / 1000 + 60 * 60 * 24;

  const beneficiary1 = accounts[1];
  const beneficiary1Amount = 1000;
  const beneficiary2 = accounts[2];
  const beneficiary2Amount = 1500;
  const totalFunds = beneficiary1Amount + beneficiary2Amount;

  let token;
  let tokenTimelockPool;
  beforeEach(async () => {
    token = await Wibcoin.new({ from: owner });
    tokenTimelockPool = await TokenTimelockPool.new(token.address, totalFunds, releaseDate, {
      from: owner,
    });
    await token.transfer(tokenTimelockPool.address, totalFunds, { from: owner });
  });

  describe('#constructor', () => {
    it('instantiates the contract', async () => {
      const contract = await TokenTimelockPool.new(token.address, 1000, releaseDate, {
        from: owner,
      });
      assert(contract, 'TokenTimelockPool could not be instantiated');
    });

    it('does not instantiate the contract when the token is not a valid address', async () => {
      try {
        await TokenTimelockPool.new('0x0', 1000, releaseDate, { from: owner });
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
        await TokenTimelockPool.new(token.address, 1000, Date.now() / 1000, { from: owner });
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('does not instantiate the contract when the release date is in the past', async () => {
      try {
        await TokenTimelockPool.new(token.address, 1000, releaseDate - 100000, { from: owner });
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });
  });

  describe('#addBeneficiary', () => {
    it('adds a beneficiary to the token pool', async () => {
      await tokenTimelockPool.addBeneficiary(beneficiary1, beneficiary1Amount, { from: owner });
    });

    it('adds a beneficiary when the beneficiary already exists in the pool', async () => {
      await tokenTimelockPool.addBeneficiary(beneficiary1, beneficiary1Amount, { from: owner });
      await tokenTimelockPool.addBeneficiary(beneficiary1, beneficiary1Amount, { from: owner });
    });

    it('does not add a beneficiary when the beneficiary is not a valid address', async () => {
      try {
        await tokenTimelockPool.addBeneficiary('0x0', beneficiary1Amount, { from: owner });
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('does not add a beneficiary when the beneficiary is the owner of the pool', async () => {
      try {
        await tokenTimelockPool.addBeneficiary(owner, beneficiary1Amount, { from: owner });
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });

    it('does not add a beneficiary when the beneficiary is the contract itself', async () => {
      try {
        await tokenTimelockPool.addBeneficiary(tokenTimelockPool.address, beneficiary1Amount, {
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
        await pool.addBeneficiary(beneficiary1, beneficiary1Amount, { from: owner });
        assert.fail();
      } catch (error) {
        assertRevert(error);
      }
    });
  });

  describe('#getDistributionContracts', () => {
    it('returns the distribution contracts for a given beneficiary', async () => {
      await tokenTimelockPool.addBeneficiary(beneficiary1, beneficiary1Amount, { from: owner });
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
});
