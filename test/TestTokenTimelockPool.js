const TokenTimelockPool = artifacts.require('./TokenTimelockPool.sol');
const Wibcoin = artifacts.require('../test/utils/Wibcoin.sol');

contract('TokenTimelockPool', (accounts) => {
  const owner = accounts[0];
  const releaseDate = Date.now() / 1000 + 60 * 60 * 24;
  let token;

  beforeEach(async () => {
    token = await Wibcoin.new({ from: owner });
  });

  describe('#constructor', () => {
    it('should pass', async () => {
      const contract = await TokenTimelockPool.new(token.address, 1000, releaseDate, {
        from: owner,
      });
      assert.ok(contract !== null);
    });
  });
});
