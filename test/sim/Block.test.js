import {test} from 'node:test';
import assert from 'node:assert/strict';
import Block from '../../js/sim/Block.js';

const big = {tier: 1};
const small = {tier: 0};

test('? 砖：顶出内容物一次后变空', () => {
    const b = new Block({kind: 'question', contents: 'mushroom'});
    assert.equal(b.bump(small), 'mushroom');
    assert.equal(b.state, 'empty');
    assert.equal(b.bump(small), 'none'); // 已空
});

test('? 砖：无内容物默认吐金币', () => {
    const b = new Block({kind: 'question'});
    assert.equal(b.bump(small), 'coin');
    assert.equal(b.state, 'empty');
});

test('普通砖：小马里奥仅弹动，大马里奥顶碎', () => {
    const b1 = new Block({kind: 'brick'});
    assert.equal(b1.bump(small), 'bump');
    assert.equal(b1.state, 'idle'); // 弹动后仍在

    const b2 = new Block({kind: 'brick'});
    assert.equal(b2.bump(big), 'break');
    assert.equal(b2.state, 'broken');
});

test('普通砖含内容物：先吐物（不碎）', () => {
    const b = new Block({kind: 'brick', contents: 'oneup'});
    assert.equal(b.bump(big), 'oneup');
    assert.equal(b.state, 'empty');
});

test('多金币砖：连续顶出金币直到耗尽', () => {
    const b = new Block({kind: 'brick', coins: 3});
    assert.equal(b.bump(small), 'coin');
    assert.equal(b.bump(small), 'coin');
    assert.equal(b.state, 'idle'); // 还有
    assert.equal(b.bump(small), 'coin');
    assert.equal(b.state, 'empty'); // 耗尽
    assert.equal(b.bump(small), 'none');
});
