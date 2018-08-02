pragma solidity ^0.4.24;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "zeppelin-solidity/contracts/token/ERC20/ERC20Basic.sol";
import "zeppelin-solidity/contracts/token/ERC20/TokenVesting.sol";


/**
 * @title TokenPoolA
 * @author Wibson Development Team <developers@wibson.org>
 * @notice TODO
 * @dev TODO
 */
contract TokenPoolA is Ownable {
  using SafeERC20 for ERC20Basic;

  ERC20Basic token;

  uint256 public allowedSpending;

  uint256 public totalSpent;

  address[] public beneficiaries;

  mapping(address => address[]) public beneficiaryDistributionContracts;

  /**
   * @notice Contract constructor.
   * @param paramName Description
   */
  constructor(
    ERC20Basic _token,
    uint256 _allowedSpending
  ) {
    token = _token;
    allowedSpending = _allowedSpending;
  }

  /**
   * @notice What does it do.
   * @dev The `msg.sender` must be the owner.
   * @param paramName Description
   * @param paramName Description
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
}
