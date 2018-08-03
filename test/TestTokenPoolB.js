const TokenPoolB = artifacts.require('./TokenPoolB.sol');
const Wibcoin = artifacts.require('./Wibcoin.sol');

contract('TokenPoolB', (accounts) => {
  const token = Wibcoin.at(Wibcoin.address);
  const owner = accounts[0];
  const releaseDate = (Date.now() / 1000) + 60 * 60 * 24;

  describe('#constructor', () => {
    it('should pass', async () => {
      const contract = await TokenPoolB.new(token.address, 1000, releaseDate, { from: owner });
      assert.ok(contract !== null);
    });
  });
});
