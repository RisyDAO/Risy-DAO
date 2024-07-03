class DataFetchr {
    constructor() {
        this.data = {};
    }
    
    async fetch(url) {
        try {
            if (!this.data[url]) {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                this.data[url] = await response.json();
            }
            return this.data[url];
        } catch (error) {
            console.error(`Fetch error for ${url}:`, error);
            return null;
        }
    }

    async getDepth(symbol) {
        const url = `https://www.binance.com/api/v3/depth?symbol=${symbol}`;
        return await this.fetch(url);
    }

    async getTrades(symbol) {
        const url = `https://www.binance.com/api/v3/trades?symbol=${symbol}`;
        return await this.fetch(url);
    }

    async getHistoricalTrades(symbol) {
        const url = `https://www.binance.com/api/v3/historicalTrades?symbol=${symbol}`;
        return await this.fetch(url);
    }

    async getAggTrades(symbol) {
        const url = `https://www.binance.com/api/v3/aggTrades?symbol=${symbol}`;
        return await this.fetch(url);
    }

    async getKlines(symbol, interval, startTime, endTime, limit) {
        const url = `https://www.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&startTime=${startTime}&endTime=${endTime}&limit=${limit}`;
        return await this.fetch(url);
    }

    async getAvgPrice(symbol) {
        const url = `https://www.binance.com/api/v3/avgPrice?symbol=${symbol}`;
        return await this.fetch(url);
    }

    async getTicker(symbol) {
        const url = `https://www.binance.com/api/v3/ticker/24hr?symbol=${symbol}`;
        return await this.fetch(url);
    }

    async getBookTicker(symbol) {
        const url = `https://www.binance.com/api/v3/ticker/bookTicker?symbol=${symbol}`;
        return await this.fetch(url);
    }

    async getTickers() {
        const url = `https://www.binance.com/api/v3/ticker/24hr`;
        return await this.fetch(url);
    }

    async getExchangeInfo() {
        const url = `https://www.binance.com/api/v3/exchangeInfo`;
        return await this.fetch(url);
    }

    async getSystemStatus() {
        const url = `https://www.binance.com/api/v3/systemStatus`;
        return await this.fetch(url);
    }
}

module.exports = new DataFetchr();
