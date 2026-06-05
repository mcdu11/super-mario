import {test} from 'node:test';
import assert from 'node:assert/strict';
import TileGrid, {TILE_SIZE} from '../../js/physics/TileGrid.js';
import GridCollider from '../../js/physics/GridCollider.js';
import PlayerMotion from '../../js/physics/PlayerMotion.js';
import {Button} from '../../js/input/Buttons.js';
import {toPixels} from '../../js/core/Fixed.js';

/**
 * 测试关卡（每格 16px）：
 *   col: 0123456789
 * row0 ..........
 * row1 ..........
 * row2 ....#.....   ← (4,2) 一块悬空砖，用于顶头测试
 * row3 ..........
 * row4 ..#.......   ← (2,4) 一堵墙
 * row5 ##########   ← 地面
 */
const LINES = [
    '..........',
    '..........',
    '....#.....',
    '..........',
    '..#.......',
    '##########',
];
const grid = TileGrid.fromStrings(LINES);

function newWorld(opts) {
    return new PlayerMotion({world: new GridCollider(grid), width: 14, height: 16, ...opts});
}

test('TileGrid.fromStrings 正确标记固体', () => {
    assert.equal(grid.isSolid(4, 2), true);
    assert.equal(grid.isSolid(2, 4), true);
    assert.equal(grid.isSolid(0, 5), true);
    assert.equal(grid.isSolid(0, 0), false);
});

test('落到地面：站在 row5 顶面（y = 5*16 - 16 = 64）', () => {
    const m = newWorld({x: 80, y: 0}); // 从空中落下
    for (let i = 0; i < 120; i++) m.step(0);
    assert.equal(m.onGround, true);
    assert.equal(m.vy, 0);
    assert.equal(m.pixelY, 5 * TILE_SIZE - 16); // 64
});

test('向右撞墙：被 (2,4) 的墙挡住，右边缘贴到列 2 左沿', () => {
    // 放在墙左侧的地面上，向右跑
    const m = newWorld({x: 0, y: 64});
    for (let i = 0; i < 120; i++) m.step(Button.RIGHT | Button.B);
    assert.equal(m.vx, 0);
    // 右边缘应停在 col2 左沿：x + width = 2*16 = 32 → x = 32 - 14 = 18
    assert.equal(m.pixelX + 14, 2 * TILE_SIZE);
    assert.equal(m.pixelX, 18);
});

test('向左撞墙：被 (2,4) 的墙挡住，左边缘贴到列 2 右沿', () => {
    const m = newWorld({x: 80, y: 64});
    for (let i = 0; i < 200; i++) m.step(Button.LEFT | Button.B);
    assert.equal(m.vx, 0);
    // 左边缘停在 col2 右沿：x = 3*16 = 48
    assert.equal(m.pixelX, 3 * TILE_SIZE);
});

test('顶头：跳起撞到 (4,2) 的砖，被挡在砖下沿（y=48）', () => {
    // 站在砖正下方，先落地（rising edge 需 A 先松后按）
    const m = newWorld({x: 4 * TILE_SIZE + 1, y: 64});
    m.step(0); // 落地一帧
    assert.equal(m.onGround, true);

    let hitCeiling = false;
    for (let i = 0; i < 40; i++) {
        m.step(Button.A); // 按住 A 起跳并尽量跳高
        if (m.pixelY === 3 * TILE_SIZE) hitCeiling = true; // 头顶贴到砖下沿
    }
    assert.ok(hitCeiling, '应曾顶到砖块下沿（y=48）并被挡');
});

test('确定性：瓦片世界中同输入 → 同轨迹', () => {
    const seq = [];
    for (let i = 0; i < 80; i++) seq.push(Button.RIGHT | (i === 5 ? Button.A : 0));
    const traceOf = () => {
        const m = newWorld({x: 0, y: 64});
        return seq.map(b => { m.step(b); return m.snapshot(); });
    };
    assert.deepEqual(traceOf(), traceOf());
});
