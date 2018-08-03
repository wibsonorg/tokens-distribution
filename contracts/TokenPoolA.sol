pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Basic.sol";
import "openzeppelin-solidity/contracts/token/ERC20/TokenVesting.sol";

/**
 * @title TokenPoolA
 * @author Wibson Development Team <developers@wibson.org>
 * @notice TODO
 * @dev TODO
 */
contract TokenPoolA is Ownable {
  using SafeERC20 for ERC20Basic;

  // ERC20 token being held
  ERC20Basic token;

  // Maximum amount of tokens to be distributed
  uint256 public allowedSpending;

  // Tokens already distributed
  uint256 public totalSpent;

  // List of tokens beneficiaries
  address[] public beneficiaries;

  // Mapping of beneficiary to TokenVesting contracts addresses
  mapping(address => address[]) public beneficiaryDistributionContracts;

  /**
   * @notice Contract constructor.
   * @param _token instance of an ERC20 token (e.g.: Wibcoin)
   * @param _allowedSpending amount of tokens the contract is allowed to spend
   *        in beneficiaries.
   */
  constructor(
    ERC20Basic _token,
    uint256 _allowedSpending
  ) {
    token = _token;
    allowedSpending = _allowedSpending;
  }

  /**
   * @notice Assigns a token release point to a beneficiary. A beneficiary can have
   *         many token release points.
   *         Example 1 - Hard Cliff mode:
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
   * @dev Invoking this method with _revocable = true will give the ability to the owner
   *      of revoking the token vesting in any time after the _start period. Tokens already
   *      vested remain in the TokenVesting contract instance (if not released), the rest
   *      are returned to this contract.
   * @param _beneficiary address of the beneficiary to whom vested tokens are transferred
   * @param _start the time (as Unix time) at which point vesting starts
   * @param _cliff duration in seconds of the cliff in which tokens will begin to vest
   * @param _duration duration in seconds of the period in which the tokens will vest
   * @param _revocable whether the vesting is revocable or not
   * @param _amount amount of tokens to be released
   */
  function addBeneficiary(
    address _beneficiary,
    uint256 _start,
    uint256 _cliff,
    uint256 _duration,
    bool _revocable,
    uint256 _amount
  ) public onlyOwner {
  }

  /**
   * @notice Revokes the vesting of the remaining tokens. Tokens are returned
   *         to the TokenPoolA contract.
   * @dev The `msg.sender` must be the owner of the contract.
   * @param _beneficiary address of the beneficiary to whom vested tokens are transferred
   * @param _tokenVestingContract address of the TokenVesting contract used to
   *        release tokens to the beneficiary
   */
  function revoke(
    address _beneficiary,
    address _tokenVestingContract
  ) public onlyOwner {
  }
}
