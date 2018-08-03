pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Basic.sol";
import "openzeppelin-solidity/contracts/token/ERC20/TokenTimelock.sol";

/**
 * @title TokenPoolB
 * @author Wibson Development Team <developers@wibson.org>
 * @notice TODO
 * @dev TODO
 */
contract TokenPoolB is Ownable {
  using SafeERC20 for ERC20Basic;

  // ERC20 token being held
  ERC20Basic token;

  // Timestamp (in seconds) when tokens can be released
  uint256 public releaseDate;

  // Maximum amount of tokens to be distributed
  uint256 public allowedSpending;

  // Tokens already distributed
  uint256 public totalSpent;

  // List of tokens beneficiaries
  address[] public beneficiaries;

  // Mapping of beneficiary to TokenTimelock contracts addresses
  mapping(address => address[]) public beneficiaryDistributionContracts;

  /**
   * @notice Contract constructor.
   * @param _token instance of an ERC20 token (e.g.: Wibcoin)
   * @param _allowedSpending Maximum amount of token to be distributed.
   * @param _releaseDate Timestamp (in seconds) when tokens can be released.
   */
  constructor(
    ERC20Basic _token,
    uint256 _allowedSpending,
    uint256 _releaseDate
  ) {
    token = _token;
    allowedSpending = _allowedSpending;
    releaseDate = _releaseDate;
  }

  /**
   * @notice Adds a beneficiary that will be allowed to extract the tokens after
   *         the release date.
   * @notice Example:
             addBeneficiary(`0x123..`, 100)
             Will create a TokenTimelock instance on which if the `release()` method
             is called after the release date (specified in this contract constructor),
             the amount of tokens (100) will be transferred to the
             beneficiary (`0x123..`).
   * @dev The `msg.sender` must be the owner of the contract.
   * @param _beneficiary Beneficiary that will receive the tokens after the
   * release date.
   * @param _amount of tokens to be released.
   */
  function addBeneficiary(
    address _beneficiary,
    uint256 _amount
  ) public onlyOwner {
  }
}
