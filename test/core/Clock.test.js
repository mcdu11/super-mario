import {test} from 'node:test';
import assert from 'node:assert/strict';
import Clock, {FRAME_MS} from '../../js/core/Clock.js';

test('step 推进恰好一帧，frameCount 递增', () => {
    const seen = [];
    const clock = new Clock(f => seen.push(f));
    clock.step();
    clock.step();
    assert.deepEqual(seen, [0, 1]);
    assert.equal(clock.frameCount, 2);
});

test('update 只拿到 frameCount，不涉及 deltaTime（确定性）', () => {
    const clock = new Clock(() => {});
    // 同一时长无论怎么切分，步进的总帧数一致
    const a = new Clock(() => {});
    a.advance(FRAME_MS * 3);
    assert.equal(a.frameCount, 3);

    const b = new Clock(() => {});
    b.advance(FRAME_MS);
    b.advance(FRAME_MS);
    b.advance(FRAME_MS);
    assert.equal(b.frameCount, 3);
});

test('advance 累加不足一帧的余量', () => {
    const clock = new Clock(() => {});
    assert.equal(clock.advance(FRAME_MS * 0.6), 0); // 还不够一帧
    assert.equal(clock.frameCount, 0);
    assert.equal(clock.advance(FRAME_MS * 0.6), 1); // 共 1.2 帧 -> 跑 1 帧
    assert.equal(clock.frameCount, 1);
});

test('maxCatchUp 限制单拍补跑帧数并丢弃积压', () => {
    const clock = new Clock(() => {}, {maxCatchUp: 3});
    const stepped = clock.advance(FRAME_MS * 100); // 远超上限
    assert.equal(stepped, 3);
    assert.equal(clock.frameCount, 3);
    assert.equal(clock.accumulator, 0); // 积压被清空，避免死亡螺旋
});
