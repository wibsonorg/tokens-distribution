const TokenVestingPool = artifacts.require('./TokenVestingPool.sol');
const Wibcoin = artifacts.require('../test/utils/Wibcoin.sol');

contract('TokenVestingPool', (accounts) => {
  const owner = accounts[0];
  let token;

  beforeEach(async () => {
    token = await Wibcoin.new({ from: owner });
  });

  describe('#constructor', () => {
    it('should pass', async () => {
      const contract = await TokenVestingPool.new(token.address, 1000, { from: owner });
      assert.ok(contract !== null);
    });
  });
});
