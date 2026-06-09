import {test} from 'node:test';
import assert from 'node:assert/strict';
import BulletBill from '../../js/sim/BulletBill.js';
import Vec2Fixed from '../../js/core/Vec2Fixed.js';
import {fromPixels} from '../../js/core/Fixed.js';
import {resolvePlayerEnemy} from '../../js/sim/interactions.js';

const player = (x, y, vy = 0) => ({pos: Vec2Fixed.fromPixels(x, y), width: 14, heightSub: fromPixels(16), vy});

test('水平直飞（向左），不受重力', () => {
    const b = new BulletBill({x: 200, y: 100, dir: -1});
    const x0 = b.pixelX, y0 = b.pixelY;
    for (let i = 0; i < 20; i++) b.step();
    assert.ok(b.pixelX < x0, '应向左飞');
    assert.equal(b.pixelY, y0, 'y 不应改变（无重力）');
});

test('可踩：从上方落下踩死', () => {
    const b = new BulletBill({x: 100, y: 100, dir: -1});
    const pl = player(100, 88, 200);
    assert.equal(resolvePlayerEnemy(pl, b), 'stomp');
    assert.equal(b.alive, false);
});

test('侧面接触 → 受伤', () => {
    const b = new BulletBill({x: 100, y: 100, dir: -1});
    const pl = player(92, 100, 0);
    assert.equal(resolvePlayerEnemy(pl, b), 'hurt');
});
