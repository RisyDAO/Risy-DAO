const BigNumber = require('bignumber.js');

class DEX {
    constructor() {
        this.pools = [];
    }

    addPool(pool) {
        this.pools.push(pool);
    }

    getBestPrice(tokenA, tokenB, amountA, maxDepth = 6) {
        const visited = new Set();
        const queue = [{ path: [tokenA], amount: new BigNumber(amountA) }];
        let bestPrice = new BigNumber(0);
        let bestPath = [];

        while (queue.length > 0) {
            const { path, amount } = queue.shift();
            const currentToken = path[path.length - 1];

            if (currentToken === tokenB && path.length > 1) {
                if (amount.isGreaterThan(bestPrice)) {
                    bestPrice = amount;
                    bestPath = path;
                }
                continue;
            }

            if (visited.has(currentToken + path.join())) continue;
            visited.add(currentToken + path.join());

            if (path.length > maxDepth) continue;

            this.getPools(currentToken).forEach(pool => {
                const nextToken = pool.tokenA === currentToken ? pool.tokenB : pool.tokenA;
                if (path.length === 1 || !path.includes(nextToken) || nextToken === tokenB) {
                    const nextAmount = pool.getPrice(amount, currentToken);
                    queue.push({ path: [...path, nextToken], amount: nextAmount });
                }
            });
        }

        return { bestPrice, bestPath };
    }

    getPools(token) {
        return this.pools.filter(pool => pool.tokenA === token || pool.tokenB === token);
    }

    swap(tokenA, tokenB, amountA, nextBlock = false, maxDepth = 6) {
        const { bestPath } = this.getBestPrice(tokenA, tokenB, amountA, maxDepth);
        let currentAmount = new BigNumber(amountA);
        for (let i = 0; i < bestPath.length - 1; i++) {
            const tokenIn = bestPath[i];
            const tokenOut = bestPath[i + 1];
            const pool = this.pools.find(pool => (pool.tokenA === tokenIn && pool.tokenB === tokenOut) || (pool.tokenA === tokenOut && pool.tokenB === tokenIn));
            if (!pool) {
                throw new Error(`Pool not found for pair ${tokenIn}-${tokenOut}`);
            }
            currentAmount = pool.swap(tokenIn, currentAmount, nextBlock);
        }
        return currentAmount;
    }

    resetPools() {
        this.pools.forEach(pool => pool.reset());
    }

    // Rebalance pools using back and forth swaps for arbitrage opportunities
    rebalance(baseToken, amount = 1000000000, threshold = 0, maxDepth = Infinity) {
        let bigNumAmount = new BigNumber(amount);
        let depth = 0;
        for (let i = amount; i > threshold; i/=2) {
            let bp = this.getBestPrice(baseToken, baseToken, i);
            if (bp.bestPrice.isGreaterThan(new BigNumber(i))) {
                bigNumAmount = bigNumAmount.plus(this.swap(baseToken, baseToken, i).minus(i));
            }
            if (depth++ > maxDepth) {
                break;
            }
        }

        console.log(`Rebalanced ${baseToken}: ${bigNumAmount.minus(amount).toString()}`);

        return bigNumAmount.toNumber();
    }

    toString() {
        return '\n' + this.pools.map(pool => `${pool.tokenA}-${pool.tokenB}: ${
            parseFloat(pool.reserveA.toString()).toFixed(2) + ' (' + parseFloat(pool.getPrice(1, pool.tokenA)).toFixed(2) + ' ' + pool.tokenB + ') | ' +
            parseFloat(pool.reserveB.toString()).toFixed(2) + ' (' + parseFloat(pool.getPrice(1, pool.tokenB)).toFixed(2) + ' ' + pool.tokenA + ')'}`)
            .join('\n') + '\n';
    }
}

module.exports = DEX;
