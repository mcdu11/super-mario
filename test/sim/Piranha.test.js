import {test} from 'node:test';
import assert from 'node:assert/strict';
import Piranha from '../../js/sim/Piranha.js';
import Vec2Fixed from '../../js/core/Vec2Fixed.js';
import {fromPixels} from '../../js/core/Fixed.js';
import {resolvePlayerEnemy, resolveFireballEnemy} from '../../js/sim/interactions.js';
import Fireball from '../../js/sim/Fireball.js';
import {PIRANHA_HIDDEN_FRAMES} from '../../js/sim/constants.js';

const player = (x, y, vy = 0) => ({pos: Vec2Fixed.fromPixels(x, y), width: 14, heightSub: fromPixels(16), vy});

test('相位循环：hidden → rising → exposed，探出后变危险', () => {
    const p = new Piranha({x: 100, pipeTopY: 160});
    assert.equal(p.phase, 'hidden');
    assert.equal(p.dangerous, false);
    let sawRising = false, sawExposed = false;
    for (let i = 0; i < 400; i++) {
        p.step(null); // 无玩家靠近
        if (p.phase === 'rising') sawRising = true;
        if (p.phase === 'exposed') { sawExposed = true; assert.ok(p.dangerous); }
    }
    assert.ok(sawRising && sawExposed, '应经历升出与探出相位');
});

test('玩家在管口附近 → 保持缩回', () => {
    const p = new Piranha({x: 100, pipeTopY: 160});
    for (let i = 0; i < PIRANHA_HIDDEN_FRAMES * 3; i++) p.step(100); // 玩家就在管口
    assert.equal(p.phase, 'hidden');
    assert.equal(p.dangerous, false);
});

test('不可踩：从上方落到食人花也受伤（hurt 而非 stomp）', () => {
    const p = new Piranha({x: 100, pipeTopY: 160});
    // 推进到探出
    while (p.phase !== 'exposed') p.step(null);
    const pl = player(p.pixelX, p.pixelY - 12, 200); // 下落踩它
    assert.equal(resolvePlayerEnemy(pl, p), 'hurt');
});

test('火球可消灭食人花', () => {
    const p = new Piranha({x: 100, pipeTopY: 160});
    while (p.phase !== 'exposed') p.step(null);
    const f = new Fireball({x: p.pixelX, y: p.pixelY, dir: 1});
    assert.equal(resolveFireballEnemy(f, p), true);
    assert.equal(p.alive, false);
});
