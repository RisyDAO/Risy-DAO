(function(global) {
  'use strict';

  if (typeof ethers === 'undefined') {
    throw new Error('Ethers library is not loaded. Please include ethers before RisyConnector.');
  }

  const ERC20_ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function transferFrom(address from, address to, uint256 amount) returns (bool)"
  ];

  const UNISWAP_V2_PAIR_ABI = [
    "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
    "function token0() view returns (address)",
    "function token1() view returns (address)"
  ];

  const RISY_DAO_ABI = [
    ...ERC20_ABI,
    "function getTransferLimit() view returns (uint256, uint256)",
    "function getMaxBalance() view returns (uint256)",
    "function getDAOFee() view returns (uint256)",
    "function getVersion() view returns (uint256)"
  ];

  class RisyConnector {
    constructor(rpcList, options = {}) {
      if (!Array.isArray(rpcList) || rpcList.length === 0) {
        throw new Error('RPC list must be a non-empty array');
      }

      this.rpcList = rpcList;
      this.options = {
        timeout: 5000,
        retries: 3,
        debugMode: false,
        cacheExpiry: 60000, // 1 minute default
        providerUpdateInterval: 60000, // 1 minute
        ...options
      };

      this.providers = this.rpcList.map(this.createProvider.bind(this));
      this.currentProvider = null;
      this.cache = new Map();
      this.lastProviderUpdate = 0;
      this.providerFailures = new Map();
    }

    createProvider(url) {
      return new ethers.providers.JsonRpcProvider({
        url,
        timeout: this.options.timeout,
        staticNetwork: true,
        headers: { 'User-Agent': 'RisyDAO' },
      });
    }

    log(message, level = 'info') {
      if (this.options.debugMode) {
        console[level](`RisyConnector: ${message}`);
      }
    }

    async updateCurrentProvider() {
      const now = Date.now();
      if (now - this.lastProviderUpdate < this.options.providerUpdateInterval && this.currentProvider) {
        return this.currentProvider;
      }

      this.log('Updating current provider');
      
      const providerPromises = this.providers.map(async (provider, index) => {
        if (this.providerFailures.get(index) > 5) {
          return null; // Skip providers that have failed too many times
        }
        try {
          await provider.getBlockNumber();
          this.providerFailures.set(index, 0); // Reset failure count on success
          return provider;
        } catch (error) {
          this.providerFailures.set(index, (this.providerFailures.get(index) || 0) + 1);
          return null;
        }
      });

      const results = await Promise.all(providerPromises);
      const workingProviders = results.filter(provider => provider !== null);

      if (workingProviders.length > 0) {
        this.currentProvider = workingProviders[0];
        this.lastProviderUpdate = now;
        this.log(`Successfully updated current provider`);
      } else {
        throw new Error("All providers failed");
      }

      return this.currentProvider;
    }

    async getProvider() {
      if (!this.currentProvider) {
        await this.updateCurrentProvider();
      }
      return this.currentProvider;
    }

    async wrapAsync(func, cacheKey = null) {
      if (cacheKey) {
        const cachedResult = this.getFromCache(cacheKey);
        if (cachedResult) return cachedResult;
      }

      let attempts = 0;
      while (attempts < this.options.retries) {
        try {
          const result = await func();
          if (cacheKey) this.setInCache(cacheKey, result);
          return result;
        } catch (error) {
          this.log(`Error in ${func.name}: ${error.message}`, 'error');
          attempts++;
          if (attempts >= this.options.retries) {
            throw error;
          }
          await this.updateCurrentProvider();
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempts)));
        }
      }
    }

    getFromCache(key) {
      const cached = this.cache.get(key);
      if (cached && Date.now() - cached.timestamp < this.options.cacheExpiry) {
        return cached.value;
      }
      return null;
    }

    setInCache(key, value) {
      this.cache.set(key, { value, timestamp: Date.now() });
    }

    // Basic blockchain methods
    getBalance(address) {
      return this.wrapAsync(async () => {
        const provider = await this.getProvider();
        return provider.getBalance(address);
      }, `balance:${address}`);
    }

    getBlockNumber() {
      return this.wrapAsync(async () => {
        const provider = await this.getProvider();
        return provider.getBlockNumber();
      }, 'blockNumber');
    }

    getGasPrice() {
      return this.wrapAsync(async () => {
        const provider = await this.getProvider();
        return provider.getGasPrice();
      }, 'gasPrice');
    }

    getTransaction(txHash) {
      return this.wrapAsync(async () => {
        const provider = await this.getProvider();
        return provider.getTransaction(txHash);
      }, `transaction:${txHash}`);
    }

    getTransactionReceipt(txHash) {
      return this.wrapAsync(async () => {
        const provider = await this.getProvider();
        return provider.getTransactionReceipt(txHash);
      }, `transactionReceipt:${txHash}`);
    }

    // ERC20 Token methods
    async getERC20Contract(tokenAddress) {
      return this.wrapAsync(async () => {
        const provider = await this.getProvider();
        return new ethers.Contract(tokenAddress, ERC20_ABI, provider);
      }, `contract:erc20:${tokenAddress}`);
    }

    getTokenName(tokenAddress) {
      return this.wrapAsync(async () => {
        const contract = await this.getERC20Contract(tokenAddress);
        return contract.name();
      }, `tokenName:${tokenAddress}`);
    }

    getTokenSymbol(tokenAddress) {
      return this.wrapAsync(async () => {
        const contract = await this.getERC20Contract(tokenAddress);
        return contract.symbol();
      }, `tokenSymbol:${tokenAddress}`);
    }

    getTokenDecimals(tokenAddress) {
      return this.wrapAsync(async () => {
        const contract = await this.getERC20Contract(tokenAddress);
        return contract.decimals();
      }, `tokenDecimals:${tokenAddress}`);
    }

    getTokenTotalSupply(tokenAddress) {
      return this.wrapAsync(async () => {
        const contract = await this.getERC20Contract(tokenAddress);
        return contract.totalSupply();
      }, `tokenTotalSupply:${tokenAddress}`);
    }

    getTokenBalance(tokenAddress, accountAddress) {
      return this.wrapAsync(async () => {
        const contract = await this.getERC20Contract(tokenAddress);
        return contract.balanceOf(accountAddress);
      }, `tokenBalance:${tokenAddress}:${accountAddress}`);
    }

    // Uniswap V2 methods
    async getUniswapV2PairContract(pairAddress) {
      return this.wrapAsync(async () => {
        const provider = await this.getProvider();
        return new ethers.Contract(pairAddress, UNISWAP_V2_PAIR_ABI, provider);
      }, `contract:uniswapv2:${pairAddress}`);
    }

    getUniswapV2Reserves(pairAddress) {
      return this.wrapAsync(async () => {
        const contract = await this.getUniswapV2PairContract(pairAddress);
        return contract.getReserves();
      }, `uniswapv2reserves:${pairAddress}`);
    }

    getUniswapV2Tokens(pairAddress) {
      return this.wrapAsync(async () => {
        const contract = await this.getUniswapV2PairContract(pairAddress);
        const [token0, token1] = await Promise.all([contract.token0(), contract.token1()]);
        return { token0, token1 };
      }, `uniswapv2tokens:${pairAddress}`);
    }

    async calculateUniswapV2PriceAsNum(pairAddress, baseTokenAddress) {
      return this.wrapAsync(async () => {
        const [reserves, tokens, baseTokenDecimals] = await Promise.all([
          this.getUniswapV2Reserves(pairAddress),
          this.getUniswapV2Tokens(pairAddress),
          this.getTokenDecimals(baseTokenAddress)
        ]);

        const quoteTokenAddress = tokens.token0.toLowerCase() === baseTokenAddress.toLowerCase() ? tokens.token1 : tokens.token0;
        const quoteTokenDecimals = await this.getTokenDecimals(quoteTokenAddress);

        const [baseReserve, quoteReserve] = tokens.token0.toLowerCase() === baseTokenAddress.toLowerCase() 
          ? [reserves[0], reserves[1]] 
          : [reserves[1], reserves[0]];
        
        const price = baseReserve.mul(ethers.BigNumber.from(10).pow(quoteTokenDecimals + baseTokenDecimals)).div(quoteReserve);
        return ethers.utils.formatUnits(price, baseTokenDecimals) / 10 ** baseTokenDecimals;
      }, `uniswapv2price:${pairAddress}:${baseTokenAddress}`);
    }

    // RisyDAO specific methods
    async getRisyDAOContract(contractAddress) {
      return this.wrapAsync(async () => {
        const provider = await this.getProvider();
        return new ethers.Contract(contractAddress, RISY_DAO_ABI, provider);
      }, `contract:risydao:${contractAddress}`);
    }

    async getRisyDAOInfo(contractAddress) {
      try {
        const contract = await this.getRisyDAOContract(contractAddress);
        
        const [basicInfo, limits, financials] = await Promise.all([
          this.getRisyDAOBasicInfo(contract),
          this.getRisyDAOLimits(contract),
          this.getRisyDAOFinancials(contract)
        ]);

        return {
          ...basicInfo,
          ...limits,
          ...financials
        };
      } catch (error) {
        this.log(`Error fetching RisyDAO info: ${error.message}`, 'error');
        throw error;
      }
    }

    async getRisyDAOBasicInfo(contract) {
      return this.wrapAsync(async () => {
        const [name, symbol, decimals, version] = await Promise.all([
          contract.name(),
          contract.symbol(),
          contract.decimals(),
          contract.getVersion()
        ]);

        return { name, symbol, decimals, version: version.toString() };
      }, `risydaobasicinfo:${contract.address}`);
    }

    async getRisyDAOLimits(contract) {
      return this.wrapAsync(async () => {
        const [transferLimit, maxBalance] = await Promise.all([
          contract.getTransferLimit(),
          contract.getMaxBalance()
        ]);

        const decimals = await contract.decimals();

        return {
          transferLimit: {
            timeWindow: transferLimit[0].toNumber(),
            percent: ethers.utils.formatUnits(transferLimit[1], decimals)
          },
          maxBalance: ethers.utils.formatUnits(maxBalance, decimals)
        };
      }, `risydaolimits:${contract.address}`);
    }

    async getRisyDAOFinancials(contract) {
      return this.wrapAsync(async () => {
        const [totalSupply, daoFee] = await Promise.all([
          contract.totalSupply(),
          contract.getDAOFee()
        ]);

        const decimals = await contract.decimals();

        return {
          totalSupply: ethers.utils.formatUnits(totalSupply, decimals),
          daoFee: ethers.utils.formatUnits(daoFee, decimals)
        };
      }, `risydaofinancials:${contract.address}`);
    }
  }

  // Expose the RisyConnector to the global scope
  global.RisyConnector = RisyConnector;

})(typeof window !== 'undefined' ? window : global);