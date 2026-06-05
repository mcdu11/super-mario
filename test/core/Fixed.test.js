import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
    SUBPIXELS_PER_PIXEL,
    fromPixels,
    toPixels,
    frac,
} from '../../js/core/Fixed.js';

test('1 像素 = 256 子像素', () => {
    assert.equal(SUBPIXELS_PER_PIXEL, 256);
    assert.equal(fromPixels(1), 256);
    assert.equal(fromPixels(10), 2560);
});

test('toPixels 向下取整', () => {
    assert.equal(toPixels(fromPixels(10)), 10);
    assert.equal(toPixels(fromPixels(10) + 255), 10); // 不足 1 像素不进位
    assert.equal(toPixels(fromPixels(10) + 256), 11); // 满 256 才进 1 像素
});

test('子像素累加的进位行为', () => {
    // 每帧加 100 子像素，从 10 像素出发：满 256 才进位
    let raw = fromPixels(10);
    raw += 100; // 100
    assert.equal(toPixels(raw), 10);
    raw += 100; // 200
    assert.equal(toPixels(raw), 10);
    raw += 100; // 300 -> 跨过 256
    assert.equal(toPixels(raw), 11);
    assert.equal(frac(raw), 44); // 300 - 256
});

test('负坐标按数学向下取整，frac 归一到 [0,256)', () => {
    assert.equal(toPixels(-1), -1);     // floor(-1/256)
    assert.equal(frac(-1), 255);
    assert.equal(toPixels(-256), -1);
    assert.equal(frac(-256), 0);
    assert.equal(toPixels(-257), -2);
});
