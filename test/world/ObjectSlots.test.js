import {test} from 'node:test';
import assert from 'node:assert/strict';
import ObjectSlots from '../../js/world/ObjectSlots.js';

test('spawn 填充空槽并返回下标', () => {
    const s = new ObjectSlots(3);
    assert.equal(s.spawn({n: 1}), 0);
    assert.equal(s.spawn({n: 2}), 1);
    assert.equal(s.size, 2);
});

test('槽满返回 -1（对象被丢弃）', () => {
    const s = new ObjectSlots(2);
    s.spawn({}); s.spawn({});
    assert.equal(s.freeIndex(), -1);
    assert.equal(s.spawn({}), -1);
    assert.equal(s.size, 2);
});

test('release 释放槽并可被复用（填回最低空位）', () => {
    const s = new ObjectSlots(3);
    s.spawn({n: 'a'}); s.spawn({n: 'b'}); s.spawn({n: 'c'});
    s.release(1);
    assert.equal(s.size, 2);
    assert.equal(s.spawn({n: 'd'}), 1); // 复用下标 1
});

test('active 返回 [下标, 对象] 列表', () => {
    const s = new ObjectSlots(3);
    s.spawn({n: 'a'}); s.spawn({n: 'b'});
    s.release(0);
    assert.deepEqual(s.active(), [[1, {n: 'b'}]]);
});
