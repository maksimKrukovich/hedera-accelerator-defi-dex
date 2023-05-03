// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.4;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../common/IERC721.sol";
import "../common/IBaseHTS.sol";
import "../common/hedera/HederaResponseCodes.sol";
import "./TokenHolder.sol";

contract NFTHolder is TokenHolder {
    mapping(address => uint256) nftTokenForUsers;

    function balanceOfVoter(
        address voter
    ) external view override returns (uint256) {
        return nftTokenForUsers[voter] > 0 ? 1 : 0;
    }

    function revertTokensForVoter(
        uint256
    ) external payable override returns (int32) {
        require(
            activeProposalsForUsers[msg.sender].length == 0,
            "User's Proposals are active"
        );
        uint256 tokenId = nftTokenForUsers[msg.sender];
        require(tokenId > 0, "NFTHolder: No amount for the Voter.");
        _transferNFTToken(
            address(_token),
            address(this),
            msg.sender,
            int64(int256(tokenId))
        );
        delete (nftTokenForUsers[msg.sender]);
        return HederaResponseCodes.SUCCESS;
    }

    function grabTokensFromUser(
        address user,
        uint256 tokenId
    ) external override {
        if (nftTokenForUsers[user] > 0) {
            return;
        }
        nftTokenForUsers[user] = uint256(tokenId);
        _transferNFTToken(
            address(_token),
            address(user),
            address(this),
            int64(int256(tokenId))
        );
    }

    function isNFTType() external pure returns (bool) {
        return true;
    }
}