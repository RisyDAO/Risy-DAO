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
        timeout: 10000,
        retries: 3,
        debugMode: false,
        cacheExpiry: 60000, // 1 minute default
        ...options
      };

      this.providers = this.rpcList.map((url) => {
        return new ethers.providers.JsonRpcProvider({
          url,
          name: url,
          chainId: 137,
          staticNetwork: true,
          skipFetchSetup: true,
          errorPassThrough: false,
          
          headers: {
            'User-Agent': 'RisyDAO'
          },

          fetchOptions: {
            mode: 'cors',
            cache: "no-cache",
            credentials: "same-origin",
            redirect: "follow",
            referrer: "client"
          },
          
          throttleCallback: (attempt, url) => {
            // Implement throttling logic if needed
          },
          throttleLimit: 1
        });
      });
      
      this.currentProviderIndex = 0;
      this.cache = new Map();
    }

    log(message, level = 'info') {
      if (this.options.debugMode) {
        console[level](`RisyConnector: ${message}`);
      }
    }

    async getProvider() {
      this.log('Starting provider race');
      
      const providerPromises = this.providers.map((provider, index) => {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Provider request timed out')), this.options.timeout);
        });

        return Promise.race([
          provider.getBlockNumber().then(() => ({ provider, index })).catch(error => ({ error, index })),
          timeoutPromise
        ]).catch(error => ({ error, index }));
      });

      try {
        const { provider, index } = await Promise.race(providerPromises);
        this.currentProviderIndex = index;
        this.log(`Successfully connected to provider at index ${index}`);
        return provider;
      } catch (error) {
        this.log('All providers failed or timed out', 'error');
        throw new Error("All RPC attempts failed");
      }
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
          this.log(`Stack trace: ${error.stack}`, 'error');

          if (error.message.includes("Cannot read properties of null (reading 'call')")) {
            this.log("Contract initialization error detected. Possible network issue or incorrect contract address.", 'error');
            // Clear the cache for this contract to force re-initialization on next attempt
            if (cacheKey && cacheKey.startsWith('contract:')) {
              this.cache.delete(cacheKey);
            }
          }

          attempts++;
          if (attempts >= this.options.retries) {
            throw error;
          }
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
        const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
        // Perform a simple call to check if the contract is initialized correctly
        await contract.name();
        return contract;
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
        const contract = new ethers.Contract(pairAddress, UNISWAP_V2_PAIR_ABI, provider);
        // Perform a simple call to check if the contract is initialized correctly
        await contract.token0();
        return contract;
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
        const contract = new ethers.Contract(contractAddress, RISY_DAO_ABI, provider);
        // Perform a simple call to check if the contract is initialized correctly
        await contract.name();
        return contract;
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