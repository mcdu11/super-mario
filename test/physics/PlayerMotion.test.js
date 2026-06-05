import {test} from 'node:test';
import assert from 'node:assert/strict';
import PlayerMotion from '../../js/physics/PlayerMotion.js';
import {Button} from '../../js/input/Buttons.js';
import {MAX_WALK_SPEED, MAX_RUN_SPEED} from '../../js/physics/constants.js';
import InputReplay from '../../js/input/InputReplay.js';

/** 用一段输入跑 N 帧，返回每帧快照 */
function run(motion, frames) {
    const trace = [];
    for (const b of frames) {
        motion.step(b);
        trace.push(motion.snapshot());
    }
    return trace;
}

test('确定性：同输入序列 → 逐帧完全相同的轨迹', () => {
    const seq = [];
    for (let i = 0; i < 60; i++) seq.push(Button.RIGHT | (i % 2 ? Button.B : 0));
    seq[10] |= Button.A; // 中途跳一下
    const replay = new InputReplay(seq);

    const a = run(new PlayerMotion(), seq.map((_, f) => replay.at(f)));
    const b = run(new PlayerMotion(), seq.map((_, f) => replay.at(f)));
    assert.deepEqual(a, b);
});

test('走路最高速：按住右键收敛到 MAX_WALK_SPEED 且不超出', () => {
    const m = new PlayerMotion();
    const trace = run(m, Array(240).fill(Button.RIGHT));
    const top = Math.max(...trace.map(s => s.vx));
    assert.ok(top <= MAX_WALK_SPEED, `走速 ${top} 不应超过 ${MAX_WALK_SPEED}`);
    assert.ok(top >= MAX_WALK_SPEED - 5, '应基本达到走路最高速');
});

test('跑步最高速：按住右键+B 收敛到 MAX_RUN_SPEED（高于走速）', () => {
    const m = new PlayerMotion();
    const trace = run(m, Array(240).fill(Button.RIGHT | Button.B));
    const top = Math.max(...trace.map(s => s.vx));
    assert.ok(top > MAX_WALK_SPEED, '跑速应高于走速');
    assert.ok(top <= MAX_RUN_SPEED, `跑速 ${top} 不应超过 ${MAX_RUN_SPEED}`);
});

test('可变跳高：按住 A 更久 → 跳得更高（apex 更小的 y）', () => {
    // 长按：上升期间一直按住 A
    const longJump = new PlayerMotion();
    const longSeq = [Button.A];
    for (let i = 0; i < 60; i++) longSeq.push(Button.A);
    const longTrace = run(longJump, longSeq);

    // 短按：只在第 0 帧按 A，之后松开
    const shortJump = new PlayerMotion();
    const shortSeq = [Button.A];
    for (let i = 0; i < 60; i++) shortSeq.push(0);
    const shortTrace = run(shortJump, shortSeq);

    const longApex = Math.min(...longTrace.map(s => s.y));
    const shortApex = Math.min(...shortTrace.map(s => s.y));
    assert.ok(longApex < shortApex, `长按 apex(${longApex}) 应高于短按(${shortApex})`);
});

test('起跳后会落回地面（onGround 恢复，vy 归零）', () => {
    const m = new PlayerMotion();
    const trace = run(m, [Button.A, ...Array(120).fill(0)]);
    const airborne = trace.some(s => !s.onGround);
    const landed = trace[trace.length - 1];
    assert.ok(airborne, '应曾离地');
    assert.equal(landed.onGround, true);
    assert.equal(landed.vy, 0);
});

test('无输入时摩擦使水平速度归零', () => {
    const m = new PlayerMotion();
    run(m, Array(30).fill(Button.RIGHT));   // 先加速
    assert.ok(m.vx > 0);
    run(m, Array(120).fill(0));              // 松手
    assert.equal(m.vx, 0);
});

test('转身急停比自然摩擦更快（skid）', () => {
    // 先向右加速到一定速度
    const skid = new PlayerMotion();
    run(skid, Array(60).fill(Button.RIGHT));
    const v0 = skid.vx;
    skid.step(Button.LEFT); // 反向输入一帧
    const skidDrop = v0 - skid.vx;

    const coast = new PlayerMotion();
    run(coast, Array(60).fill(Button.RIGHT));
    const v1 = coast.vx;
    coast.step(0); // 仅摩擦一帧
    const coastDrop = v1 - coast.vx;

    assert.ok(skidDrop > coastDrop, `转身减速(${skidDrop}) 应大于摩擦减速(${coastDrop})`);
});
