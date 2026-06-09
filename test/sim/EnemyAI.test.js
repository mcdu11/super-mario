import {test} from 'node:test';
import assert from 'node:assert/strict';
import TileGrid from '../../js/physics/TileGrid.js';
import GridCollider from '../../js/physics/GridCollider.js';
import Enemy from '../../js/sim/Enemy.js';

test('Paratroopa：落地反复起跳（离地）', () => {
    // 平地
    const grid = TileGrid.fromStrings(['..........', '..........', '##########']);
    const e = new Enemy({type: 'paratroopa', x: 32, y: 0, collider: new GridCollider(grid)});
    assert.equal(e.type, 'koopa');
    assert.equal(e.winged, true);
    let airborneFrames = 0;
    for (let i = 0; i < 120; i++) { e.step(); if (!e.onGround) airborneFrames++; }
    assert.ok(airborneFrames > 30, 'Paratroopa 应大量时间在空中蹦跳');
});

test('Paratroopa：第一次踩 → 失翅变普通龟；第二次踩 → 缩壳', () => {
    const e = new Enemy({type: 'paratroopa', x: 32, y: 32});
    e.stomp();
    assert.equal(e.winged, false);
    assert.equal(e.state, 'walking'); // 仍在巡逻
    e.stomp();
    assert.equal(e.state, 'shell');
});

test('红龟 ledgeAware：走到平台边缘前折返，不掉下去', () => {
    // 一段悬空平台：row2 的 col2..5 是地面，两侧是空（坑）
    const grid = TileGrid.fromStrings([
        '..........',
        '..........',
        '..####....',
    ]);
    const e = new Enemy({type: 'koopa', x: 4 * 16, y: 0, collider: new GridCollider(grid),
        dir: 1, ledgeAware: true});
    let reversed = false;
    for (let i = 0; i < 200; i++) {
        e.step();
        // 不应掉出平台（y 不应大幅下落）
        assert.ok(e.pixelY < 3 * 16, '红龟不应掉下平台');
        if (e.dir === -1) reversed = true;
    }
    assert.ok(reversed, '红龟应在边缘折返');
});

test('对照：非 ledgeAware 的龟会走下平台坠落', () => {
    const grid = TileGrid.fromStrings([
        '..........',
        '..........',
        '..####....',
    ]);
    const e = new Enemy({type: 'koopa', x: 4 * 16, y: 0, collider: new GridCollider(grid),
        dir: 1, ledgeAware: false});
    let fell = false;
    for (let i = 0; i < 200; i++) {
        e.step();
        if (e.pixelY > 4 * 16) { fell = true; break; }
    }
    assert.ok(fell, '普通龟应走下平台坠落');
});
