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
          },
          throttleLimit: 1
        });
      });
      
      this.currentProviderIndex = 0;
    }

    log(message) {
      if (this.options.debugMode) {
        console.log(`RisyConnector: ${message}`);
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
        this.log('All providers failed or timed out');
        throw new Error("All RPC attempts failed");
      }
    }

    async wrapAsync(func) {
      let attempts = 0;
      while (attempts < this.options.retries) {
        try {
          return await func();
        } catch (error) {
          this.log(`Error in ${func.name}: ${error.message}`);
          attempts++;
          if (attempts >= this.options.retries) {
            throw error;
          }
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
        }
      }
    }

    // Basic blockchain methods
    getBalance(address) {
      return this.wrapAsync(async () => {
        const provider = await this.getProvider();
        return provider.getBalance(address);
      });
    }

    getBlockNumber() {
      return this.wrapAsync(async () => {
        const provider = await this.getProvider();
        return provider.getBlockNumber();
      });
    }

    getGasPrice() {
      return this.wrapAsync(async () => {
        const provider = await this.getProvider();
        return provider.getGasPrice();
      });
    }

    getTransaction(txHash) {
      return this.wrapAsync(async () => {
        const provider = await this.getProvider();
        return provider.getTransaction(txHash);
      });
    }

    getTransactionReceipt(txHash) {
      return this.wrapAsync(async () => {
        const provider = await this.getProvider();
        return provider.getTransactionReceipt(txHash);
      });
    }

    // ERC20 Token methods
    async getERC20Contract(tokenAddress) {
      const provider = await this.getProvider();
      return new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    }

    getTokenName(tokenAddress) {
      return this.wrapAsync(async () => {
        const contract = await this.getERC20Contract(tokenAddress);
        return contract.name();
      });
    }

    getTokenSymbol(tokenAddress) {
      return this.wrapAsync(async () => {
        const contract = await this.getERC20Contract(tokenAddress);
        return contract.symbol();
      });
    }

    getTokenDecimals(tokenAddress) {
      return this.wrapAsync(async () => {
        const contract = await this.getERC20Contract(tokenAddress);
        return contract.decimals();
      });
    }

    getTokenTotalSupply(tokenAddress) {
      return this.wrapAsync(async () => {
        const contract = await this.getERC20Contract(tokenAddress);
        return contract.totalSupply();
      });
    }

    getTokenBalance(tokenAddress, accountAddress) {
      return this.wrapAsync(async () => {
        const contract = await this.getERC20Contract(tokenAddress);
        return contract.balanceOf(accountAddress);
      });
    }

    // Uniswap V2 methods
    async getUniswapV2PairContract(pairAddress) {
      const provider = await this.getProvider();
      return new ethers.Contract(pairAddress, UNISWAP_V2_PAIR_ABI, provider);
    }

    getUniswapV2Reserves(pairAddress) {
      return this.wrapAsync(async () => {
        const contract = await this.getUniswapV2PairContract(pairAddress);
        return contract.getReserves();
      });
    }

    getUniswapV2Tokens(pairAddress) {
      return this.wrapAsync(async () => {
        const contract = await this.getUniswapV2PairContract(pairAddress);
        const [token0, token1] = await Promise.all([contract.token0(), contract.token1()]);
        return { token0, token1 };
      });
    }

    calculateUniswapV2PriceAsNum(pairAddress, baseTokenAddress) {
      return this.wrapAsync(async () => {
        const reserves = await this.getUniswapV2Reserves(pairAddress);
        const tokens = await this.getUniswapV2Tokens(pairAddress);
        const baseTokenDecimals = await this.getTokenDecimals(baseTokenAddress);
        const quoteTokenDecimals = await this.getTokenDecimals(tokens.token0 === baseTokenAddress ? tokens.token1 : tokens.token0);

        const [baseReserve, quoteReserve] = tokens.token0.toLowerCase() === baseTokenAddress.toLowerCase() 
          ? [reserves[0], reserves[1]] 
          : [reserves[1], reserves[0]];
        
        const price = baseReserve.mul(ethers.BigNumber.from(10).pow(quoteTokenDecimals + baseTokenDecimals)).div(quoteReserve);
        return ethers.utils.formatUnits(price, baseTokenDecimals) / 10 ** baseTokenDecimals;
      });
    }

    // RisyDAO specific methods
    async getRisyDAOContract(contractAddress) {
      const provider = await this.getProvider();
      return new ethers.Contract(contractAddress, RISY_DAO_ABI, provider);
    }

    getRisyDAOInfo(contractAddress) {
      return this.wrapAsync(async () => {
        const contract = await this.getRisyDAOContract(contractAddress);
        const [name, symbol, decimals, totalSupply, transferLimit, maxBalance, daoFee, version] = await Promise.all([
          contract.name(),
          contract.symbol(),
          contract.decimals(),
          contract.totalSupply(),
          contract.getTransferLimit(),
          contract.getMaxBalance(),
          contract.getDAOFee(),
          contract.getVersion()
        ]);

        return {
          name,
          symbol,
          decimals,
          totalSupply: ethers.utils.formatUnits(totalSupply, decimals),
          transferLimit: {
            timeWindow: transferLimit[0].toNumber(),
            percent: ethers.utils.formatUnits(transferLimit[1], decimals)
          },
          maxBalance: ethers.utils.formatUnits(maxBalance, decimals),
          daoFee: ethers.utils.formatUnits(daoFee, decimals),
          version: version.toString()
        };
      });
    }
  }

  // Expose the RisyConnector to the global scope
  global.RisyConnector = RisyConnector;

})(typeof window !== 'undefined' ? window : global);