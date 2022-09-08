//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "../common/hedera/HederaResponseCodes.sol";
import "../common/IBaseHTS.sol";
import "../AbstractLPToken.sol";

contract LPTokenTest is AbstractLPToken {
    
    constructor(address _lpToken, IBaseHTS _tokenService) {
         // instantiate the list of keys we'll use for token create
         lpToken = _lpToken;
         tokenService = _tokenService;
    }

    function mintToken(uint64 amount) override internal virtual 
     returns (int responseCode, uint64 newTotalSupply, int64[] memory serialNumbers) {
            (int response, uint64 _newTotalSupply, int64[] memory _serialNumbers) = tokenService.mintTokenPublic(lpToken, amount);

             if (response != HederaResponseCodes.SUCCESS) {
                revert ("Mint Failed");
             }
            return (response, _newTotalSupply, _serialNumbers);
    }

    function associateTokenInternal(address account,  address _token) internal override  virtual returns(int) {
        return tokenService.associateTokenPublic(account, _token);
    }

    function transferTokenInternal(address _token, address sender, address receiver, int64 amount) internal override virtual returns(int) {
        int responseCode = tokenService.transferTokenPublic(_token, sender, receiver, amount);
        if (responseCode != HederaResponseCodes.SUCCESS) {
                revert ("LP Token Transfer Fail");
        }
        return responseCode;
    }
}