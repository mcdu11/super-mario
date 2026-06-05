import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Button, isDown} from '../../js/input/Buttons.js';
import InputRecorder from '../../js/input/InputRecorder.js';
import InputReplay from '../../js/input/InputReplay.js';

test('按钮位掩码与 isDown', () => {
    const mask = Button.A | Button.RIGHT;
    assert.ok(isDown(mask, Button.A));
    assert.ok(isDown(mask, Button.RIGHT));
    assert.ok(!isDown(mask, Button.B));
    assert.ok(!isDown(mask, Button.LEFT));
});

test('录制 → 序列化 → 回放，逐帧一致', () => {
    const rec = new InputRecorder();
    const seq = [Button.RIGHT, Button.RIGHT | Button.B, Button.A, 0];
    seq.forEach(m => rec.capture(m));
    assert.equal(rec.length, 4);

    const data = rec.toJSON();
    const replay = InputReplay.fromJSON(data);
    for (let f = 0; f < seq.length; f++) {
        assert.equal(replay.at(f), seq[f]);
    }
});

test('回放越界返回 0（无输入）', () => {
    const replay = new InputReplay([Button.A]);
    assert.equal(replay.at(0), Button.A);
    assert.equal(replay.at(1), 0);
    assert.equal(replay.at(-1), 0);
});
