import {test} from 'node:test';
import assert from 'node:assert/strict';
import TileGrid from '../../js/physics/TileGrid.js';
import GridCollider from '../../js/physics/GridCollider.js';
import Enemy from '../../js/sim/Enemy.js';
import {SQUASH_FRAMES} from '../../js/sim/constants.js';

// 关卡：col6 row2 一堵墙；row3 地面
const LINES = [
    '..........',
    '..........',
    '......#...',
    '##########',
];
const grid = TileGrid.fromStrings(LINES);
const collider = () => new GridCollider(grid);

test('巡逻 + 重力：落到地面 row3 顶面（y=32）', () => {
    const e = new Enemy({type: 'goomba', x: 16, y: 0, collider: collider(), dir: -1});
    for (let i = 0; i < 60; i++) e.step();
    assert.equal(e.onGround, true);
    assert.equal(e.pixelY, 3 * 16 - 16); // 32
});

test('撞墙折返：向右走撞到 col6 墙后 dir 翻转为 -1', () => {
    const e = new Enemy({type: 'goomba', x: 16, y: 0, collider: collider(), dir: 1});
    let reversed = false;
    for (let i = 0; i < 300; i++) {
        e.step();
        if (e.dir === -1) { reversed = true; break; }
    }
    assert.ok(reversed, '撞墙后应折返');
});

test('踩 goomba → squashed → SQUASH_FRAMES 后 dead', () => {
    const e = new Enemy({type: 'goomba', x: 16, y: 32, collider: collider()});
    e.stomp();
    assert.equal(e.state, 'squashed');
    for (let i = 0; i < SQUASH_FRAMES; i++) e.step();
    assert.equal(e.state, 'dead');
    assert.equal(e.alive, false);
});

test('踩巡逻 koopa → 缩成静止壳', () => {
    const e = new Enemy({type: 'koopa', x: 16, y: 32, collider: collider()});
    e.stomp();
    assert.equal(e.state, 'shell');
    assert.equal(e.dangerous, false); // 静止壳不伤人
});

test('踢壳 → 滑行并移动', () => {
    const e = new Enemy({type: 'koopa', x: 32, y: 32, collider: collider()});
    e.stomp();          // → shell
    e.kick(1);          // 向右踢
    assert.equal(e.state, 'sliding');
    const x0 = e.pixelX;
    for (let i = 0; i < 10; i++) e.step();
    assert.ok(e.pixelX > x0, '滑壳应向右移动');
    assert.equal(e.dangerous, true); // 滑壳会伤人
});

test('滑壳撞墙折返', () => {
    const e = new Enemy({type: 'koopa', x: 16, y: 32, collider: collider()});
    e.stomp();
    e.kick(1); // 向右滑向 col6 墙
    let reversed = false;
    for (let i = 0; i < 120; i++) {
        e.step();
        if (e.dir === -1) { reversed = true; break; }
    }
    assert.ok(reversed, '滑壳撞墙应折返');
});
