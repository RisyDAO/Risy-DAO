const assert = require('assert');
const Pool = require('./core/pool');
const DEX = require('./core/dex');
const PoolSim = require('./core/poolSim');

async function tests() {
    /* ############################## TESTS ############################## */

    let fee = 0;

    console.log('Running tests...');

    let dex = new DEX();
    let pool1 = new Pool('A', 'B', 1000, 1000, fee);
    let pool2 = new Pool('B', 'C', 1000, 1000, fee);
    let pool3 = new Pool('D', 'E', 1000, 1000, fee);
    let pool4 = new Pool('D', 'B', 2000, 500, fee);
    let pool5 = new Pool('E', 'C', 1000, 1000, fee);
    dex.addPool(pool1);
    dex.addPool(pool2);
    dex.addPool(pool3);
    dex.addPool(pool4);
    dex.addPool(pool5);

    // Pool price test
    let price = pool1.getPrice(1, 'A');
    assert.strictEqual(parseFloat(price.toString()), 0.999000999000999, `Pool price test failed: ${parseFloat(price.toString())}`);

    // Multi-step swap test
    dex.resetPools();
    let val1 = dex.swap('A', 'C', 1000);
    dex.resetPools();
    let val2 = dex.swap('B', 'C', dex.swap('A', 'B', 1000));
    assert.strictEqual(val1.toString(), val2.toString(), `Multi-step swap test failed: ${val1.toString()} ${val2.toString()}`);

    // Reverse of multi-step swap test
    dex.resetPools();
    val1 = dex.swap('C', 'A', 1000);
    val2 = dex.swap('A', 'C', val1);
    assert.strictEqual(val2.toString(), '1000', `Reverse of multi-step swap test failed: ${val2.toString()}`);

    // Best price test
    dex.resetPools();
    let { bestPrice, bestPath } = dex.getBestPrice('A', 'C', 1);
    assert.strictEqual(bestPath.join(' -> '), 'A -> B -> D -> E -> C', `Best path test failed: ${bestPath.join(' -> ')}`);
    assert.strictEqual(parseFloat(bestPrice.toString()), 3.9564787339268053, `Best price test failed: ${parseFloat(bestPrice.toString())}`);

    console.log(dex.toString());

    // Rebalance test
    let lastAmount = dex.rebalance('B', 1000);
    assert(parseFloat(lastAmount.toString()) > 1000, `Rebalance test failed: ${parseFloat(lastAmount.toString())}`);

    console.log(dex.toString());

    // Pool simulation test
    let poolSim = new PoolSim();
    await poolSim.init();
    console.log(poolSim.toString());

    console.log('All tests passed!');
    /* ########################### END OF TESTS ########################### */
}

tests().catch(error => {
    console.error('Test run failed:', error);
});
