const BigNumber = require('bignumber.js');
const DEX = require('./dex');
const Pool = require('./pool');
const dataFetchr = require('./dataFetchr');

class PoolSim {
    constructor() {
        this.dex = new DEX();
        this.pools = [];
    }

    async init(filter = ["BNBBTC", "BNBETH", "BTCUSDC", "ETHUSDC", "BNBUSDC", "ETHBTC", "BNBBTC"]) {
        try {
            const exInfo = await dataFetchr.getExchangeInfo();
            const tickers = await dataFetchr.getTickers();
            if (!tickers || !tickers.length) {
                throw new Error('Failed to fetch exchange info');
            }

            for (var i = 0; i < tickers.length; i++) {
                if (!filter.includes(tickers[i].symbol)) {
                    continue;
                }
                const symbol = exInfo.symbols.find(s => s.symbol === tickers[i].symbol);
                if (!symbol) {
                    console.error(`Failed to fetch symbol for ${tickers[i].symbol}`);
                    continue;
                }
                const ticker = tickers[i];
                console.log((i + 1) + '/' + tickers.length + ' ' + symbol.symbol);
                if (!ticker || !ticker.lastPrice) {
                    console.error(`Failed to fetch price for ${symbol.symbol}`);
                    continue;
                }

                const price = new BigNumber(ticker.lastPrice > 0 ? ticker.lastPrice : ticker.prevClosePrice);
                const reserveA = new BigNumber(symbol.filters.find(f => f.filterType === 'LOT_SIZE').maxQty);
                const reserveB = reserveA.minus(1).times(price);

                const pool = new Pool(symbol.baseAsset, symbol.quoteAsset, reserveA, reserveB);
                this.dex.addPool(pool);
                this.pools.push(pool);

                this.dex.rebalance(symbol.baseAsset, reserveA);
                this.dex.rebalance(symbol.quoteAsset, reserveB);
            }
        } catch (error) {
            console.error('Error in init:', error);
        }
    }

    toString() {
        return this.dex.toString();
    }
}

module.exports = PoolSim;
