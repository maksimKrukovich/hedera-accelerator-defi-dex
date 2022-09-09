//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./hedera/HederaTokenService.sol";
import "./hedera/HederaResponseCodes.sol";

contract BaseHTS is HederaTokenService {
    function transferTokenPublic(address token, address sender, address receiver, int64 amount) 
        external returns (int responseCode) {
            return HederaTokenService.transferToken(token, sender, receiver, amount);
        }
    
    function associateTokenPublic(address account, address token) external returns (int responseCode) {
        return HederaTokenService.associateToken(account, token);
    }
    
    function associateTokensPublic(address account, address[] memory tokens) 
        external returns (int responseCode) {
            return HederaTokenService.associateTokens(account, tokens);
        }
}