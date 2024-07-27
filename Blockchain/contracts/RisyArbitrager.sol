// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ITrigger {
    function trigger() external;
    function triggerSpecificArbitrage(address[] calldata path, uint256 routerIndex) external;
}

interface IUniswapV2Router02 {
    function factory() external view returns (address);
    function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts);
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}

contract RisyArbitrager is Ownable, ReentrancyGuard, Pausable, ITrigger {
    struct Router {
        address routerAddress;
        address factoryAddress;
        bool isActive;
    }

    struct ArbitrageOpportunity {
        uint256 profit;
        address[] path;
        uint256 routerIndex;
        uint256 maxProfitableAmount;
        bool exists;
    }

    Router[] public routers;
    address[] public tokens;
    address[] public stables;

    uint256 public callerRewardRatio;
    uint256 public constant MAX_TOKENS_IN_PATH = 6;
    address public defaultBaseAsset;
    uint256 public minProfitThreshold;
    uint256 public maxGasPrice;
    ArbitrageOpportunity private bestOpportunity;
    uint256 public lastSearchIndex;
    uint256 public constant BATCH_SIZE = 10;

    mapping(bytes32 => address[]) private simplifiedPathCache;
    mapping(address => bool) public tokenBlacklist;
    mapping(address => uint256) public routerToIndex;

    event ArbitrageExecuted(address indexed caller, uint256 profit, uint256 callerReward);
    event RouterAdded(address indexed routerAddress, address indexed factoryAddress);
    event RouterRemoved(address indexed routerAddress);
    event RouterStatusChanged(address indexed routerAddress, bool isActive);
    event TokenAdded(address indexed tokenAddress);
    event TokenRemoved(address indexed tokenAddress);
    event TokenBlacklisted(address indexed tokenAddress);
    event TokenWhitelisted(address indexed tokenAddress);
    event StableAdded(address indexed stableAddress);
    event StableRemoved(address indexed stableAddress);
    event CallerRewardRatioUpdated(uint256 newRatio);
    event DefaultBaseAssetUpdated(address indexed newDefaultBaseAsset);
    event MinProfitThresholdUpdated(uint256 newThreshold);
    event MaxGasPriceUpdated(uint256 newMaxGasPrice);
    event ArbitrageOpportunityFound(uint256 profit);
    event ArbitrageOpportunityUpdated(uint256 profit);
    event ArbitrageExecutionFailed(string reason);
    event SpecificArbitrageExecuted(address indexed caller, uint256 profit, uint256 callerReward);
    event SpecificArbitrageRejected(address indexed caller, string reason);

    constructor(address _defaultBaseAsset) Ownable(msg.sender) {
        require(_defaultBaseAsset != address(0), "Invalid default base asset address");
        callerRewardRatio = 0.05 ether; // 5% represented as 0.05 ether
        defaultBaseAsset = _defaultBaseAsset;
        minProfitThreshold = 0.001 ether; // 0.1% minimum profit
        maxGasPrice = 500 gwei; // Example max gas price
    }

    function trigger() external override whenNotPaused {
        require(tx.gasprice <= maxGasPrice, "Gas price too high");
        batchedSearch();
        if (bestOpportunity.exists) {
            try this.executeArbitrage() {
                // Arbitrage executed successfully
            } catch Error(string memory reason) {
                emit ArbitrageExecutionFailed(reason);
                delete bestOpportunity;
            } catch (bytes memory) {
                emit ArbitrageExecutionFailed("Execution failed");
                delete bestOpportunity;
            }
        }
    }

    function triggerSpecificArbitrage(address[] calldata path, uint256 routerIndex) external override whenNotPaused {
        require(tx.gasprice <= maxGasPrice, "Gas price too high");
        require(routerIndex < routers.length, "Invalid router index");
        require(path.length >= 2 && path.length <= MAX_TOKENS_IN_PATH, "Invalid path length");
        require(path[0] == path[path.length - 1], "Path must start and end with the same token");

        Router memory router = routers[routerIndex];
        require(router.isActive, "Selected router is inactive");

        for (uint256 i = 0; i < path.length; i++) {
            require(!tokenBlacklist[path[i]], "Path contains blacklisted token");
        }

        address baseAsset = path[0];
        uint256 ownerBalance = IERC20(baseAsset).balanceOf(owner());
        (uint256 profit, uint256 optimalAmount) = findOptimalAmount(router.routerAddress, path, ownerBalance);

        if (profit > minProfitThreshold) {
            ArbitrageOpportunity memory opportunity = ArbitrageOpportunity(profit, path, routerIndex, optimalAmount, true);
            try this.executeSpecificArbitrage(opportunity) {
                // Arbitrage executed successfully
            } catch Error(string memory reason) {
                emit SpecificArbitrageRejected(msg.sender, reason);
            } catch (bytes memory) {
                emit SpecificArbitrageRejected(msg.sender, "Execution failed");
            }
        } else {
            emit SpecificArbitrageRejected(msg.sender, "Not profitable");
        }
    }

    function executeArbitrage() external nonReentrant whenNotPaused {
        require(bestOpportunity.exists, "No arbitrage opportunity exists");
        require(bestOpportunity.profit > minProfitThreshold, "Arbitrage not profitable enough");
        
        ArbitrageOpportunity memory opportunityToExecute = bestOpportunity;
        delete bestOpportunity;

        _executeArbitrage(opportunityToExecute.path[0], opportunityToExecute);
    }

    function executeSpecificArbitrage(ArbitrageOpportunity memory opportunity) external nonReentrant whenNotPaused {
        require(opportunity.profit > minProfitThreshold, "Arbitrage not profitable enough");
        _executeArbitrage(opportunity.path[0], opportunity);
        emit SpecificArbitrageExecuted(msg.sender, opportunity.profit, (opportunity.profit * callerRewardRatio) / 1 ether);
    }

    function _executeArbitrage(address _baseAsset, ArbitrageOpportunity memory opportunity) private {
        address owner = owner();
        uint256 ownerBalance = IERC20(_baseAsset).balanceOf(owner);
        require(ownerBalance > 0, "Owner has no balance of base asset");

        Router memory router = routers[opportunity.routerIndex];
        require(router.isActive, "Selected router is inactive");

        uint256 amountToUse = opportunity.maxProfitableAmount < ownerBalance ? opportunity.maxProfitableAmount : ownerBalance;
        
        require(IERC20(_baseAsset).transferFrom(owner, address(this), amountToUse), "Transfer from owner failed");

        require(IERC20(_baseAsset).approve(router.routerAddress, 0), "Failed to reset approval");
        require(IERC20(_baseAsset).approve(router.routerAddress, amountToUse), "Failed to approve router");

        uint256 minAmountOut = amountToUse + (amountToUse * minProfitThreshold / 1 ether);

        uint256[] memory amounts = IUniswapV2Router02(router.routerAddress).swapExactTokensForTokens(
            amountToUse,
            minAmountOut,
            opportunity.path,
            address(this),
            block.timestamp + 300
        );

        uint256 finalAmount = amounts[amounts.length - 1];
        require(finalAmount > amountToUse, "Arbitrage didn't yield profit");

        uint256 actualProfit = finalAmount - amountToUse;
        uint256 callerReward = (actualProfit * callerRewardRatio) / 1 ether;

        require(IERC20(_baseAsset).transfer(msg.sender, callerReward), "Failed to transfer caller reward");
        require(IERC20(_baseAsset).transfer(owner, finalAmount - callerReward), "Failed to transfer profit to owner");
        
        emit ArbitrageExecuted(msg.sender, actualProfit, callerReward);
    }

    function batchedSearch() public {
        uint256 totalCombinations = routers.length * stables.length * stables.length * tokens.length * tokens.length;
        uint256 endIndex = lastSearchIndex + BATCH_SIZE;
        
        if (endIndex > totalCombinations) {
            endIndex = totalCombinations;
        }

        for (uint256 i = lastSearchIndex; i < endIndex; i++) {
            (uint256 r, uint256 s1, uint256 s2, uint256 t1, uint256 t2) = _deconstructIndex(i);
            _checkArbitrage(r, s1, s2, t1, t2);
        }

        lastSearchIndex = endIndex;

        if (lastSearchIndex == totalCombinations) {
            lastSearchIndex = 0; // Reset for next round
        }
    }

    function _deconstructIndex(uint256 index) private view returns (uint256, uint256, uint256, uint256, uint256) {
        uint256 r = index / (stables.length * stables.length * tokens.length * tokens.length);
        uint256 remainder = index % (stables.length * stables.length * tokens.length * tokens.length);
        uint256 s1 = remainder / (stables.length * tokens.length * tokens.length);
        remainder = remainder % (stables.length * tokens.length * tokens.length);
        uint256 s2 = remainder / (tokens.length * tokens.length);
        remainder = remainder % (tokens.length * tokens.length);
        uint256 t1 = remainder / tokens.length;
        uint256 t2 = remainder % tokens.length;
        return (r, s1, s2, t1, t2);
    }

    function _checkArbitrage(uint256 r, uint256 s1, uint256 s2, uint256 t1, uint256 t2) private {
        if (s1 == s2 && t1 == t2) return; // Skip if both stables and tokens are the same
        if (!routers[r].isActive) return; // Skip if router is inactive

        address[] memory path = new address[](6);
        path[0] = defaultBaseAsset;
        path[1] = stables[s1];
        path[2] = tokens[t1];
        path[3] = tokens[t2];
        path[4] = stables[s2];
        path[5] = defaultBaseAsset;

        for (uint256 i = 0; i < path.length; i++) {
            if (tokenBlacklist[path[i]]) return; // Skip if any token in path is blacklisted
        }

        path = _simplifyPath(path);

        if (path.length <= 2) return; // Skip if path is trivial after simplification

        uint256 ownerBalance = IERC20(defaultBaseAsset).balanceOf(owner());
        (uint256 profit, uint256 optimalAmount) = findOptimalAmount(routers[r].routerAddress, path, ownerBalance);

        if (profit == 0) return; // Path is not valid or not profitable

        bool isCurrentBestPath = bestOpportunity.exists && 
            keccak256(abi.encodePacked(bestOpportunity.path)) == keccak256(abi.encodePacked(path));

        if (isCurrentBestPath) {
            // Update the current best opportunity
            bestOpportunity.profit = profit;
            bestOpportunity.maxProfitableAmount = optimalAmount;
            emit ArbitrageOpportunityUpdated(profit);
        } else if (profit > bestOpportunity.profit && profit > minProfitThreshold) {
            // New best opportunity found
            bestOpportunity = ArbitrageOpportunity(profit, path, r, optimalAmount, true);
            emit ArbitrageOpportunityFound(profit);
        }
    }

    function _simplifyPath(address[] memory path) private returns (address[] memory) {
        bytes32 pathHash = keccak256(abi.encodePacked(path));
        
        // Check if we have a cached simplified path
        if (simplifiedPathCache[pathHash].length > 0) {
            return simplifiedPathCache[pathHash];
        }

        if (path.length <= 3) {
            simplifiedPathCache[pathHash] = path;
            return path;
        }

        address[] memory simplifiedPath = new address[](path.length);
        uint256 simplifiedLength = 0;

        for (uint256 i = 0; i < path.length; i++) {
            // Skip if it's the same as the previous token
            if (simplifiedLength > 0 && path[i] == simplifiedPath[simplifiedLength - 1]) {
                continue;
            }
            
            // Check for "round trips"
            if (simplifiedLength > 1 && path[i] == simplifiedPath[simplifiedLength - 2]) {
                // Remove the previous token as well
                simplifiedLength--;
                continue;
            }

            simplifiedPath[simplifiedLength] = path[i];
            simplifiedLength++;
        }

        // Check if the simplified path is valid (length > 1)
        if (simplifiedLength <= 1) {
            // If the path is invalid, return the original path
            simplifiedPathCache[pathHash] = path;
            return path;
        }

        // Create a new array with the correct length
        address[] memory result = new address[](simplifiedLength);
        for (uint256 i = 0; i < simplifiedLength; i++) {
            result[i] = simplifiedPath[i];
        }
        
        simplifiedPathCache[pathHash] = result;
        return result;
    }

    function findOptimalAmount(address _routerAddress, address[] memory _path, uint256 _maxAmount) internal view returns (uint256, uint256) {
        uint256 left = 1;
        uint256 right = _maxAmount;
        uint256 bestProfit = 0;
        uint256 bestAmount = 0;

        for (uint256 i = 0; i < 100; i++) { // Limit iterations to prevent infinite loops
            if (left > right) break;
            
            uint256 mid = (left + right) / 2;
            uint256 amountOut = getAmountOutMultiHop(_routerAddress, _path, mid);
            
            if (amountOut > mid) {
                uint256 profit = amountOut - mid;
                if (profit > bestProfit) {
                    bestProfit = profit;
                    bestAmount = mid;
                }
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }

        return (bestProfit, bestAmount);
    }

    function getAmountOutMultiHop(address _routerAddress, address[] memory _path, uint256 _amountIn) public view returns (uint256) {
        require(_path.length >= 2, "Invalid path");
        
        try IUniswapV2Router02(_routerAddress).getAmountsOut(_amountIn, _path) returns (uint256[] memory amounts) {
            return amounts[amounts.length - 1];
        } catch {
            return 0;
        }
    }

    function setDefaultBaseAsset(address _newDefaultBaseAsset) external onlyOwner {
        require(_newDefaultBaseAsset != address(0), "Invalid default base asset address");
        defaultBaseAsset = _newDefaultBaseAsset;
        emit DefaultBaseAssetUpdated(_newDefaultBaseAsset);
    }

    function setCallerRewardRatio(uint256 _newRatio) external onlyOwner {
        require(_newRatio <= 1 ether, "Ratio must be <= 1 ether");
        callerRewardRatio = _newRatio;
        emit CallerRewardRatioUpdated(_newRatio);
    }

    function setMinProfitThreshold(uint256 _newThreshold) external onlyOwner {
        minProfitThreshold = _newThreshold;
        emit MinProfitThresholdUpdated(_newThreshold);
    }

    function setMaxGasPrice(uint256 _newMaxGasPrice) external onlyOwner {
        maxGasPrice = _newMaxGasPrice;
        emit MaxGasPriceUpdated(_newMaxGasPrice);
    }

    function addRouter(address _routerAddress) external onlyOwner {
        require(_routerAddress != address(0), "Invalid router address");
        require(routerToIndex[_routerAddress] == 0, "Router already exists");
        address factoryAddress = IUniswapV2Router02(_routerAddress).factory();
        require(factoryAddress != address(0), "Invalid factory address");
        routers.push(Router(_routerAddress, factoryAddress, true));
        routerToIndex[_routerAddress] = routers.length;
        emit RouterAdded(_routerAddress, factoryAddress);
    }

    function removeRouter(uint256 _index) external onlyOwner {
        require(_index < routers.length, "Invalid index");
        address routerAddress = routers[_index].routerAddress;
        emit RouterRemoved(routerAddress);
        delete routerToIndex[routerAddress];
        routers[_index] = routers[routers.length - 1];
        routerToIndex[routers[_index].routerAddress] = _index + 1;
        routers.pop();
    }

    function setRouterStatus(uint256 _index, bool _isActive) external onlyOwner {
        require(_index < routers.length, "Invalid index");
        routers[_index].isActive = _isActive;
        emit RouterStatusChanged(routers[_index].routerAddress, _isActive);
    }

    function addToken(address _tokenAddress) external onlyOwner {
        require(_tokenAddress != address(0), "Invalid token address");
        require(!tokenBlacklist[_tokenAddress], "Token is blacklisted");
        tokens.push(_tokenAddress);
        emit TokenAdded(_tokenAddress);
    }

    function removeToken(uint256 _index) external onlyOwner {
        require(_index < tokens.length, "Invalid index");
        emit TokenRemoved(tokens[_index]);
        tokens[_index] = tokens[tokens.length - 1];
        tokens.pop();
    }

    function blacklistToken(address _tokenAddress) external onlyOwner {
        tokenBlacklist[_tokenAddress] = true;
        emit TokenBlacklisted(_tokenAddress);
    }

    function whitelistToken(address _tokenAddress) external onlyOwner {
        tokenBlacklist[_tokenAddress] = false;
        emit TokenWhitelisted(_tokenAddress);
    }

    function addStable(address _stableAddress) external onlyOwner {
        require(_stableAddress != address(0), "Invalid stable address");
        require(!tokenBlacklist[_stableAddress], "Token is blacklisted");
        stables.push(_stableAddress);
        emit StableAdded(_stableAddress);
    }

    function removeStable(uint256 _index) external onlyOwner {
        require(_index < stables.length, "Invalid index");
        emit StableRemoved(stables[_index]);
        stables[_index] = stables[stables.length - 1];
        stables.pop();
    }

    function clearSimplifiedPathCache() external onlyOwner {
        for (uint256 i = 0; i < simplifiedPathCache.length; i++) {
            delete simplifiedPathCache[bytes32(i)];
        }
    }

    function getBestOpportunityProfit() external view returns (uint256) {
        return bestOpportunity.profit;
    }

    function isBestOpportunityAvailable() external view returns (bool) {
        return bestOpportunity.exists;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function recoverEth() external onlyOwner {
        payable(msg.sender).transfer(address(this).balance);
    }

    function recoverTokens(address _tokenAddress) external onlyOwner {
        IERC20 token = IERC20(_tokenAddress);
        uint256 balance = token.balanceOf(address(this));
        require(token.transfer(msg.sender, balance), "Token recovery failed");
    }
}
