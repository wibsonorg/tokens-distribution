const TokenPoolA = artifacts.require('./TokenPoolA.sol');
const Wibcoin = artifacts.require('../test/utils/Wibcoin.sol');

contract('TokenPoolA', (accounts) => {
  const owner = accounts[0];
  let token;

  beforeEach(async () => {
    token = await Wibcoin.new({ from: owner });
  });

  describe('#constructor', () => {
    it('should pass', async () => {
      const contract = await TokenPoolA.new(token.address, 1000, { from: owner });
      assert.ok(contract !== null);
    });
  });
});
