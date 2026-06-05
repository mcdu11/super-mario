import {test} from 'node:test';
import assert from 'node:assert/strict';
import TileGrid from '../../js/physics/TileGrid.js';
import GridCollider from '../../js/physics/GridCollider.js';
import Fireball from '../../js/sim/Fireball.js';
import Enemy from '../../js/sim/Enemy.js';
import {resolveFireballEnemy} from '../../js/sim/interactions.js';
import {FIREBALL_EXPLODE_FRAMES} from '../../js/sim/constants.js';

// col8 row2 墙；row3 地面
const grid = TileGrid.fromStrings([
    '..........',
    '..........',
    '........#.',
    '##########',
]);
const collider = () => new GridCollider(grid);

test('飞行：按方向水平移动', () => {
    const f = new Fireball({x: 16, y: 16, dir: 1, collider: collider()});
    const x0 = f.pixelX;
    for (let i = 0; i < 5; i++) f.step();
    assert.ok(f.pixelX > x0, '火球应向右飞');
});

test('落地反弹：触地后 vy 变为负', () => {
    const f = new Fireball({x: 16, y: 0, dir: 1, collider: collider()});
    let bounced = false;
    for (let i = 0; i < 30; i++) {
        f.step();
        if (f.vy < 0) { bounced = true; break; }
    }
    assert.ok(bounced, '火球落地应反弹');
});

test('撞墙即爆：撞到 col8 墙后进入 exploding → dead', () => {
    const f = new Fireball({x: 16, y: 32, dir: 1, collider: collider()});
    let exploded = false;
    for (let i = 0; i < 60; i++) {
        f.step();
        if (f.state === 'exploding') { exploded = true; break; }
    }
    assert.ok(exploded, '撞墙应爆炸');
    for (let i = 0; i < FIREBALL_EXPLODE_FRAMES; i++) f.step();
    assert.equal(f.state, 'dead');
});

test('命中敌人：杀敌 + 火球引爆', () => {
    const f = new Fireball({x: 100, y: 100, dir: 1});
    const e = new Enemy({type: 'goomba', x: 102, y: 100});
    assert.equal(resolveFireballEnemy(f, e), true);
    assert.equal(e.alive, false);
    assert.equal(f.state, 'exploding');
    // 已爆的火球不再命中
    const e2 = new Enemy({type: 'goomba', x: 102, y: 100});
    assert.equal(resolveFireballEnemy(f, e2), false);
});
