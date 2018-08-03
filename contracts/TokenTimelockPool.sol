pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Basic.sol";
import "openzeppelin-solidity/contracts/token/ERC20/TokenTimelock.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";


/**
 * @title TokenTimelockPool
 * @author Wibson Development Team <developers@wibson.org>
 * @notice This contract models a pool of tokens to be distributed among beneficiaries,
 * releasing the entire pool on a specific date. There is no need to know the
 * beneficiaries in advance, since the contract allows to add them as time goes by.
 * Note that tokens are NOT revocable.
 * Tokens that were not distributed by the release date will stay in the pool until
 * they are assigned. In which case, the new beneficiary will be able to release
 * them immediately.
 * @dev Total funds and distributed tokens are controlled to avoid refills done
 * by transfering tokens through the ERC20.
 */
contract TokenTimelockPool is Ownable {
  using SafeERC20 for ERC20Basic;
  using SafeMath for uint256;

  // ERC20 token being held
  ERC20Basic token;

  // Timestamp (in seconds) when tokens can be released
  uint256 public releaseDate;

  // Maximum amount of tokens to be distributed
  uint256 public totalFunds;

  // Tokens already distributed
  uint256 public distributedTokens;

  // List of tokens beneficiaries
  address[] public beneficiaries;

  // Mapping of beneficiary to TokenTimelock contracts addresses
  mapping(address => address[]) public beneficiaryDistributionContracts;

  modifier validAddress(address addr) {
    require(addr != address(0));
    require(addr != address(this));
    _;
  }

  /**
   * @notice Contract constructor.
   * @param _token instance of an ERC20 token (e.g.: Wibcoin).
   * @param _totalFunds Maximum amount of tokens to be distributed.
   * @param _releaseDate Timestamp (in seconds) when tokens can be released.
   */
  constructor(
    ERC20Basic _token,
    uint256 _totalFunds,
    uint256 _releaseDate
  ) public {
    token = _token;
    totalFunds = _totalFunds;
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
   * @return address for the new TokenVesting contract instance.
   */
  function addBeneficiary(
    address _beneficiary,
    uint256 _amount
  ) public onlyOwner validAddress(_beneficiary) returns (address) {
    require(_beneficiary != owner);

    // We check there are sufficient funds and actual token balance.
    bool sufficientFunds = (totalFunds - distributedTokens) >= _amount;
    bool sufficientBalance = token.balanceOf(address(this)) >= _amount;
    require(sufficientFunds && sufficientBalance);

    // We assign the tokens to the beneficiary
    address tokenTimelock = new TokenTimelock(
      token,
      _beneficiary,
      releaseDate
    );
    token.safeTransfer(tokenTimelock, _amount);

    // We update our bookkeeping
    distributedTokens.add(_amount);

    if (!beneficiaryExists(_beneficiary)) {
      beneficiaries.push(_beneficiary); // new beneficiary
    }
    beneficiaryDistributionContracts[_beneficiary].push(tokenTimelock);

    return tokenTimelock;
  }

  function beneficiaryExists(address _beneficiary) internal view returns (bool) {
    return beneficiaryDistributionContracts[_beneficiary].length > 0;
  }
}
