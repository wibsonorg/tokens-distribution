const TokenPoolA = artifacts.require('./TokenPoolA.sol');
const Wibcoin = artifacts.require('./Wibcoin.sol');

contract('TokenPoolA', (accounts) => {
  const token = Wibcoin.at(Wibcoin.address);
  const owner = accounts[0];

  describe('#constructor', () => {
    it('should pass', async () => {
      const contract = await TokenPoolA.new(token.address, 1000, { from: owner });
      assert.ok(contract !== null);
    });
  });
});
