pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Basic.sol";
import "openzeppelin-solidity/contracts/token/ERC20/TokenVesting.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";


/**
 * @title TokenVestingPool
 * @author Wibson Development Team <developers@wibson.org>
 * @notice This contract models a pool of tokens to be distributed among beneficiaries
 * with different lock-up and vesting conditions. There is no need to know the
 * beneficiaries in advance, since the contract allows to add them as time goes by.
 * Optionally, when assigning tokens to a specific beneficiary, the contract owner
 * may decide to make them revocable for that particular case. In which case, the
 * tokens would be refunded to the pool (not the contract owner).
 * @dev There is only one method to add a beneficiary. By doing this, not only
 * both modes (lock-up and vesting) can be achieved, but they can also be combined
 * as suitable. Moreover, total funds and distributed tokens are controlled to
 * avoid refills done by transfering tokens through the ERC20.
 */
contract TokenVestingPool is Ownable {
  using SafeERC20 for ERC20Basic;
  using SafeMath for uint256;

  // ERC20 token being held
  ERC20Basic token;

  // Maximum amount of tokens to be distributed
  uint256 public totalFunds;

  // Tokens already distributed
  uint256 public distributedTokens;

  // List of beneficiaries added to the pool
  address[] public beneficiaries;

  // Mapping of beneficiary to TokenVesting contracts addresses
  mapping(address => address[]) public beneficiaryDistributionContracts;

  // Tracks the distribution contracts created by this contract.
  mapping(address => bool) private distributionContracts;

  modifier validAddress(address _addr) {
    require(_addr != address(0));
    require(_addr != address(this));
    _;
  }

  /**
   * @notice Contract constructor. It creates an instance of TokenVestingPool bounded
   * to a specific ERC20 token and a total amount of funds to be given to future
   * beneficiaries.
   * @param _token instance of an ERC20 token (e.g.: Wibcoin)
   * @param _totalFunds amount of tokens the contract is allowed to spend
   *        in beneficiaries.
   */
  constructor(
    ERC20Basic _token,
    uint256 _totalFunds
  ) public validAddress(_token) {
    require(_totalFunds > 0);

    token = _token;
    totalFunds = _totalFunds;
    distributedTokens = 0;
  }

  /**
   * @notice Assigns a token release point to a beneficiary. A beneficiary can have
   *         many token release points.
   *         Example 1 - Lock-up mode:
   *           contract.addBeneficiary(
   *             `0x123..`,  // Beneficiary
   *             1533847025, // The vesting period starts this day
   *             604800,     // Tokens are released after one week
   *             604800,     // Duration of the release period. In this case, once the cliff
   *                         // period is finished, the beneficiary will receive the tokens.
   *             false,      // Vesting cannot be revoked
   *             100         // Amount of tokens to be released
   *           )
   *         Example 2 - Vesting mode:
   *           contract.addBeneficiary(
   *             `0x123..`,  // Beneficiary
   *             1533847025, // The vesting period starts this day
   *             172800,     // Tokens are released after two weeks
   *             345600,     // The release period will start after the cliff period and
   *                         // it will last for two weeks. Tokens will be released uniformly
   *                         // during this period.
   *             true,       // Remaining amount of tokens can be revoked
   *             100         // Amount of tokens to be released
   *           )
   *
   * @dev Invoking this method with _revocable = true will give the owner the ability
   *      of revoking the token vesting in any time after the _start period. Tokens already
   *      vested remain in the TokenVesting contract instance (if not released), the rest
   *      are returned to this contract.
   * @param _beneficiary address of the beneficiary to whom vested tokens are transferred
   * @param _start the time (as Unix time) at which point vesting starts
   * @param _cliff duration in seconds of the cliff in which tokens will begin to vest
   * @param _duration duration in seconds of the period in which the tokens will vest
   * @param _revocable whether the vesting is revocable or not
   * @param _amount amount of tokens to be released
   * @return address for the new TokenVesting contract instance.
   */
  function addBeneficiary(
    address _beneficiary,
    uint256 _start,
    uint256 _cliff,
    uint256 _duration,
    bool _revocable,
    uint256 _amount
  ) public validAddress(_beneficiary) onlyOwner returns (address) {
    require(_beneficiary != owner);

    // Check there are sufficient funds and actual token balance.
    require(SafeMath.sub(totalFunds, distributedTokens) >= _amount);
    require(token.balanceOf(address(this)) >= _amount);

    require(_duration >= _cliff);
    require(_amount > 0);

    // Assign the tokens to the beneficiary
    address tokenVesting = new TokenVesting(
      _beneficiary,
      _start,
      _cliff,
      _duration,
      _revocable
    );
    token.safeTransfer(tokenVesting, _amount);

    if (!beneficiaryExists(_beneficiary)) {
      beneficiaries.push(_beneficiary); // new beneficiary
    }
    beneficiaryDistributionContracts[_beneficiary].push(tokenVesting);
    distributionContracts[tokenVesting] = true;

    // Update our bookkeeping
    distributedTokens.add(_amount);

    return tokenVesting;
  }

  /**
   * @notice Revokes the vesting of the remaining tokens. Tokens are returned
   *         to the TokenVestingPool contract.
   * @dev The `msg.sender` must be the owner of the contract.
   * @param _beneficiary address of the beneficiary to whom vested tokens are transferred
   * @param _tokenVesting address of the TokenVesting contract used to
   *        release tokens to the beneficiary
   * @return true if the tokens were revoked successfully, reverts otherwise.
   */
  function revoke(
    address _beneficiary,
    address _tokenVesting
  ) public onlyOwner validAddress(_beneficiary) validAddress(_tokenVesting)
  returns (bool) {
    TokenVesting tv = TokenVesting(_tokenVesting);
    require(beneficiaryExists(_beneficiary));
    require(distributionContracts[_tokenVesting]);
    require(tv.beneficiary() == _beneficiary);

    tv.revoke(token);
    return true;
  }

  /**
   * @notice Gets an array of all the distribution contracts for a given beneficiary.
   * @param _beneficiary address of the beneficiary to whom vested tokens are transferred.
   * @return List of TokenVesting addresses.
   */
  function getDistributionContracts(
    address _beneficiary
  ) public view validAddress(_beneficiary) returns (address[]) {
    return beneficiaryDistributionContracts[_beneficiary];
  }

  /**
   * @notice Checks if a beneficiary was added to the pool at least once.
   * @param _beneficiary address of the beneficiary to whom vested tokens are transferred.
   * @return true if beneficiary exists, false otherwise.
   */
  function beneficiaryExists(
    address _beneficiary
  ) internal view returns (bool) {
    return beneficiaryDistributionContracts[_beneficiary].length > 0;
  }
}
