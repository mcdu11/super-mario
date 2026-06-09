import {test} from 'node:test';
import assert from 'node:assert/strict';
import PRNG from '../../js/core/PRNG.js';

test('确定性：同种子 → 完全相同的序列', () => {
    const a = new PRNG();
    const b = new PRNG();
    const sa = Array.from({length: 200}, () => a.next());
    const sb = Array.from({length: 200}, () => b.next());
    assert.deepEqual(sa, sb);
});

test('不同种子 → 不同序列', () => {
    const a = new PRNG([0xa5, 0, 0, 0, 0, 0, 0]);
    const b = new PRNG([0x3c, 0, 0, 0, 0, 0, 0]);
    const sa = Array.from({length: 50}, () => a.next());
    const sb = Array.from({length: 50}, () => b.next());
    assert.notDeepEqual(sa, sb);
});

test('非退化：输出有变化（未锁死在常量）', () => {
    const p = new PRNG();
    const out = new Set(Array.from({length: 100}, () => p.next()));
    assert.ok(out.size > 10, `应产生多样输出，实际 ${out.size} 种`);
});

test('状态可序列化恢复，继续产生相同序列', () => {
    const p = new PRNG();
    for (let i = 0; i < 37; i++) p.next();
    const saved = p.state;
    const cont1 = Array.from({length: 20}, () => p.next());
    const resumed = new PRNG(saved);
    const cont2 = Array.from({length: 20}, () => resumed.next());
    assert.deepEqual(cont1, cont2);
});

test('nextFloat 落在 [0,1)', () => {
    const p = new PRNG();
    for (let i = 0; i < 100; i++) {
        const f = p.nextFloat();
        assert.ok(f >= 0 && f < 1);
    }
});
