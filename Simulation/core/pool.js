const BigNumber = require('bignumber.js');

class Pool {
    constructor(tokenA, tokenB, reserveA, reserveB, fee = 0.003) {
        this.tokenA = tokenA;
        this.tokenB = tokenB;
        this.reserveA = new BigNumber(reserveA);
        this.reserveB = new BigNumber(reserveB);
        this.fee = new BigNumber(fee);
        this.initialReserveA = this.reserveA;
        this.initialReserveB = this.reserveB;
        this.blockNumber = 0;
        this.history = { [this.blockNumber]: { reserveA: this.reserveA, reserveB: this.reserveB } };
    }

    reset() {
        this.reserveA = this.initialReserveA;
        this.reserveB = this.initialReserveB;
        this.blockNumber = 0;
        this.history = { [this.blockNumber]: { reserveA: this.reserveA, reserveB: this.reserveB } };
    }

    getHistory() {
        return this.history;
    }

    getPrice(amountA, tokenIn) {
        try {
            const amountAWithFee = new BigNumber(amountA).times(new BigNumber(1).minus(this.fee));
            let numerator, denominator;
            if (tokenIn === this.tokenA) {
                numerator = amountAWithFee.times(this.reserveB);
                denominator = this.reserveA.plus(amountAWithFee);
            } else {
                numerator = amountAWithFee.times(this.reserveA);
                denominator = this.reserveB.plus(amountAWithFee);
            }
            const price = numerator.div(denominator);
            return price;
        } catch (error) {
            throw new Error(`Error in getPrice: ${error.message}`);
        }
    }

    swap(tokenIn, amountIn, nextBlock = false) {
        try {
            if (amountIn.isLessThanOrEqualTo(0)) {
                throw new Error('Invalid amount');
            }

            let amountOut;

            if (tokenIn === this.tokenA) {
                amountOut = this.getPrice(amountIn, tokenIn);
                this.reserveA = this.reserveA.plus(amountIn);
                this.reserveB = this.reserveB.minus(amountOut);
            } else if (tokenIn === this.tokenB) {
                amountOut = this.getPrice(amountIn, tokenIn);
                this.reserveB = this.reserveB.plus(amountIn);
                this.reserveA = this.reserveA.minus(amountOut);
            } else {
                throw new Error('Invalid token');
            }

            if (nextBlock) {
                this.blockNumber++;
                this.history[this.blockNumber] = { reserveA: this.reserveA, reserveB: this.reserveB };
            } else {
                this.history[this.blockNumber].reserveA = this.reserveA;
                this.history[this.blockNumber].reserveB = this.reserveB;
            }

            return amountOut;
        } catch (error) {
            throw new Error(`Error in swap: ${error.message}`);
        }
    }
}

module.exports = Pool;
