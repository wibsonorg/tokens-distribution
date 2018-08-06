/**
 * @param {Object} transaction the transaction where the event was emitted.
 * @param {String} eventName the name of emitted event.
 * @param {String} message to display on error.
 * @throws {AssertionError} when the error is not originated from a revert.
 */
export function assertEvent(transaction, eventName, message = '') {
  const hasEvent = transaction.logs.some(log => log.event === eventName);
  assert(hasEvent, message);
}

/**
 * @param {Object} transaction the transaction where the event was emitted.
 */
export function extractEventArgs(transaction) {
  return transaction.logs[0].args;
}

/**
 * @param {Error} error the error where the assertion is made.
 * @throws {AssertionError} when the error is not originated from a revert.
 */
export function assertRevert(error) {
  assert(error.toString().includes('revert'), error.toString());
}

/**
 * @param {Number} Number of seconds to increase EVM time.
 * @throws {Error} when it fails to increase time or mine the block after.
 */
// export function increaseTime(duration) {
//   return new Promise((resolve, reject) => {
//     web3.currentProvider.sendAsync({
//       jsonrpc: '2.0',
//       method: 'evm_increaseTime',
//       params: [duration],
//       id: new Date().getSeconds(),
//     }, (errIncreaseTime) => { // eslint-disable-line consistent-return
//       if (errIncreaseTime) return reject(errIncreaseTime);

//       web3.currentProvider.sendAsync({
//         jsonrpc: '2.0',
//         method: 'evm_mine',
//         id: new Date().getSeconds(),
//       }, (errMine, res) => (errMine ? reject(errMine) : resolve(res)));
//     });
//   });
// }

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

export const snapshot = async () => {
  const { result } = await rpc('evm_snapshot');
  return result;
};

export const revert = id => rpc('evm_revert', [id]);
export const increaseTime = time => rpc('evm_increaseTime', [time]);
