import {test} from 'node:test';
import assert from 'node:assert/strict';
import Vec2Fixed from '../../js/core/Vec2Fixed.js';
import {fromPixels} from '../../js/core/Fixed.js';
import Enemy from '../../js/sim/Enemy.js';
import {resolvePlayerEnemy, resolveShellEnemy} from '../../js/sim/interactions.js';

// 简化的玩家体（交互只读 pos/width/heightSub/vy，写 vy）
const player = (x, y, vy) => ({pos: Vec2Fixed.fromPixels(x, y), width: 14, heightSub: fromPixels(16), vy});
const enemyAt = (type, x, y) => new Enemy({type, x, y});

test('从上方下落踩 goomba → stomp + 压扁 + 玩家弹起', () => {
    const e = enemyAt('goomba', 100, 100);
    const p = player(100, 88, 200); // 脚底=104，落在敌人头上，vy>0
    const r = resolvePlayerEnemy(p, e);
    assert.equal(r, 'stomp');
    assert.equal(e.state, 'squashed');
    assert.ok(p.vy < 0, '玩家应弹起');
});

test('侧面接触巡逻 goomba → hurt', () => {
    const e = enemyAt('goomba', 100, 100);
    const p = player(90, 100, 0); // 同高、从左侧重叠、未下落
    assert.equal(resolvePlayerEnemy(p, e), 'hurt');
});

test('下落踩 koopa → stomp + 缩壳', () => {
    const e = enemyAt('koopa', 100, 100);
    const p = player(100, 88, 200);
    assert.equal(resolvePlayerEnemy(p, e), 'stomp');
    assert.equal(e.state, 'shell');
});

test('侧面碰静止壳 → kick（不受伤），壳朝远离玩家方向滑', () => {
    const e = enemyAt('koopa', 100, 100);
    e.stomp(); // → shell
    const p = player(90, 100, 0); // 玩家在壳左侧
    assert.equal(resolvePlayerEnemy(p, e), 'kick');
    assert.equal(e.state, 'sliding');
    assert.equal(e.dir, 1); // 玩家在左 → 向右踢
});

test('滑壳侧面撞玩家 → hurt', () => {
    const e = enemyAt('koopa', 100, 100);
    e.stomp(); e.kick(1); // 滑行
    const p = player(96, 100, 0); // 与滑壳侧面重叠
    assert.equal(resolvePlayerEnemy(p, e), 'hurt');
});

test('已压扁/死亡的敌人不再交互', () => {
    const e = enemyAt('goomba', 100, 100);
    e.stomp(); // squashed
    const p = player(100, 88, 200);
    assert.equal(resolvePlayerEnemy(p, e), 'none');
    e.die();
    assert.equal(resolvePlayerEnemy(p, e), 'none');
});

test('滑壳连杀：撞到另一敌人将其击杀', () => {
    const shell = enemyAt('koopa', 100, 100);
    shell.stomp(); shell.kick(1);
    const goomba = enemyAt('goomba', 104, 100); // 与滑壳重叠
    assert.equal(resolveShellEnemy(shell, goomba), true);
    assert.equal(goomba.alive, false);
});

test('静止壳不连杀（必须在滑行中）', () => {
    const shell = enemyAt('koopa', 100, 100);
    shell.stomp(); // shell idle，未踢
    const goomba = enemyAt('goomba', 104, 100);
    assert.equal(resolveShellEnemy(shell, goomba), false);
    assert.equal(goomba.alive, true);
});
