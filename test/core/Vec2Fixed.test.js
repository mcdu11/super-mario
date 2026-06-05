import {test} from 'node:test';
import assert from 'node:assert/strict';
import Vec2Fixed from '../../js/core/Vec2Fixed.js';

test('fromPixels / pixelX / pixelY', () => {
    const v = Vec2Fixed.fromPixels(64, 64);
    assert.equal(v.x, 64 * 256);
    assert.equal(v.pixelX, 64);
    assert.equal(v.pixelY, 64);
});

test('addRaw 累加子像素并正确进位', () => {
    const v = Vec2Fixed.fromPixels(0, 0);
    v.addRaw(200, 0);
    assert.equal(v.pixelX, 0);
    v.addRaw(200, 0); // 共 400 -> 1 像素 + 144
    assert.equal(v.pixelX, 1);
});

test('add 叠加另一个向量', () => {
    const pos = Vec2Fixed.fromPixels(10, 20);
    const vel = new Vec2Fixed(256, -512); // +1px, -2px
    pos.add(vel);
    assert.equal(pos.pixelX, 11);
    assert.equal(pos.pixelY, 18);
});

test('copy 不共享引用', () => {
    const a = Vec2Fixed.fromPixels(1, 1);
    const b = a.copy();
    b.addRaw(256, 0);
    assert.equal(a.pixelX, 1);
    assert.equal(b.pixelX, 2);
});
