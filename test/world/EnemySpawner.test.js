import {test} from 'node:test';
import assert from 'node:assert/strict';
import ObjectSlots from '../../js/world/ObjectSlots.js';
import EnemySpawner from '../../js/world/EnemySpawner.js';

// 测试用实体：暴露可变的像素 x（默认不移动）
const makeEntity = p => ({x: p.x, type: p.type});

function spawner(placements, opts = {}) {
    const slots = new ObjectSlots(opts.slotCount ?? 5);
    const sp = new EnemySpawner(placements, {
        slots,
        createEntity: makeEntity,
        screenWidth: 256,
        removeMargin: 16,
    });
    return {slots, sp};
}

test('入屏即生成：镜头右移时按 x 顺序累计生成', () => {
    const {slots, sp} = spawner([
        {x: 100, type: 'goomba'},
        {x: 400, type: 'koopa'},
        {x: 700, type: 'goomba'},
    ]);
    sp.update(0);   // 视野 [0,256]，只有 x=100 入屏
    assert.equal(sp.spawnedCount, 1);
    assert.equal(slots.size, 1);

    sp.update(200); // 视野 [200,456]，x=400 入屏；x=100 已滚出左缘 → 回收
    assert.equal(sp.spawnedCount, 2); // 累计已生成 2 个
    assert.equal(slots.size, 1);      // 同屏仍只 1 个（此消彼长）

    sp.update(500); // 视野 [500,756]，x=700 入屏
    assert.equal(sp.spawnedCount, 3);
});

test('单向：左侧敌人不重生', () => {
    const {slots, sp} = spawner([{x: 100, type: 'goomba'}]);
    sp.update(0);
    assert.equal(sp.spawnedCount, 1);
    // 即便镜头再次经过同一区域（实际不会回退），指针已过，不再生成
    sp.update(0);
    assert.equal(sp.spawnedCount, 1);
});

test('槽满即丢弃：还原同屏上限/消失', () => {
    // 同屏内放 7 个敌人，槽只有 5 个
    const placements = [];
    for (let i = 0; i < 7; i++) placements.push({x: 50 + i * 10, type: 'goomba'});
    const {slots, sp} = spawner(placements, {slotCount: 5});
    sp.update(0); // 全在 [0,256] 内
    assert.equal(slots.size, 5);
    assert.equal(sp.spawnedCount, 5);
    assert.equal(sp.lostCount, 2); // 多出的 2 个被丢弃
});

test('出屏即回收：滚出左边缘释放槽，给后续敌人腾位', () => {
    const {slots, sp} = spawner([
        {x: 50, type: 'goomba'},
        {x: 60, type: 'goomba'},
        {x: 70, type: 'goomba'},
        {x: 80, type: 'goomba'},
        {x: 90, type: 'goomba'},
        {x: 1000, type: 'koopa'}, // 远处的敌人
    ], {slotCount: 5});

    sp.update(0);
    assert.equal(slots.size, 5); // 前 5 个占满

    // 镜头推进到很右，前 5 个滚出左边缘 → 回收；x=1000 入屏 → 载入
    sp.update(900); // 视野 [900,1156]
    assert.equal(slots.size, 1);
    assert.equal(slots.active()[0][1].type, 'koopa');
});
