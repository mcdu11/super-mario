import {test} from 'node:test';
import assert from 'node:assert/strict';
import TileGrid from '../../js/physics/TileGrid.js';
import GridCollider from '../../js/physics/GridCollider.js';
import PowerUp from '../../js/sim/PowerUp.js';
import PowerState, {SUPER, FIRE} from '../../js/sim/PowerState.js';
import Enemy from '../../js/sim/Enemy.js';
import Vec2Fixed from '../../js/core/Vec2Fixed.js';
import {fromPixels} from '../../js/core/Fixed.js';
import {resolvePlayerPowerUp, resolvePlayerEnemy} from '../../js/sim/interactions.js';

const grid = TileGrid.fromStrings([
    '..........',
    '......#...', // col6 row1 墙
    '##########', // row2 地面
]);
const collider = () => new GridCollider(grid);
const player = (x, y, vy = 0) => ({pos: Vec2Fixed.fromPixels(x, y), width: 14, heightSub: fromPixels(16), vy});

test('蘑菇：行走 + 重力落地 + 撞墙折返', () => {
    const m = new PowerUp({kind: 'mushroom', x: 16, y: 0, collider: collider(), dir: 1});
    let reversed = false;
    for (let i = 0; i < 300; i++) {
        m.step();
        if (m.onGround) assert.equal(m.pixelY, 2 * 16 - 16); // 落在地面顶
        if (m.dir === -1) { reversed = true; break; }
    }
    assert.ok(reversed, '蘑菇撞墙应折返');
});

test('火花：静止不动', () => {
    const f = new PowerUp({kind: 'fireflower', x: 32, y: 32, collider: collider()});
    const x0 = f.pixelX, y0 = f.pixelY;
    for (let i = 0; i < 60; i++) f.step();
    assert.equal(f.pixelX, x0);
    assert.equal(f.pixelY, y0);
});

test('星星：落地后反弹（vy 变为负）', () => {
    const s = new PowerUp({kind: 'star', x: 16, y: 0, collider: collider(), dir: 1});
    let bounced = false;
    for (let i = 0; i < 60; i++) {
        s.step();
        if (s.vy < 0) { bounced = true; break; }
    }
    assert.ok(bounced, '星星应落地反弹');
});

test('拾取蘑菇 → 变大并消费', () => {
    const power = new PowerState();
    const item = new PowerUp({kind: 'mushroom', x: 100, y: 100});
    const p = player(100, 100);
    assert.equal(resolvePlayerPowerUp(p, power, item), 'mushroom');
    assert.equal(power.tier, SUPER);
    assert.equal(item.active, false);
    // 已消费 → 再次无效
    assert.equal(resolvePlayerPowerUp(p, power, item), 'none');
});

test('拾取火花 → 变火；拾取星星 → 无敌', () => {
    const power = new PowerState();
    const flower = new PowerUp({kind: 'fireflower', x: 100, y: 100});
    assert.equal(resolvePlayerPowerUp(player(100, 100), power, flower), 'fireflower');
    assert.equal(power.tier, FIRE);

    const star = new PowerUp({kind: 'star', x: 100, y: 100});
    assert.equal(resolvePlayerPowerUp(player(100, 100), power, star), 'star');
    assert.ok(power.starActive);
});

test('星星无敌：接触敌人秒杀（starkill），玩家不受伤', () => {
    const e = new Enemy({type: 'goomba', x: 100, y: 100});
    const p = player(95, 100, 0); // 侧面接触
    assert.equal(resolvePlayerEnemy(p, e, {starActive: true}), 'starkill');
    assert.equal(e.alive, false);
});

test('受伤无敌帧：侧面接触不再受伤（none）', () => {
    const e = new Enemy({type: 'goomba', x: 100, y: 100});
    const p = player(95, 100, 0);
    assert.equal(resolvePlayerEnemy(p, e, {invincible: true}), 'none');
    assert.equal(e.alive, true); // 敌人也没事
});
