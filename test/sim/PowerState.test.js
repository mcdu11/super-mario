import {test} from 'node:test';
import assert from 'node:assert/strict';
import PowerState, {SMALL, SUPER, FIRE} from '../../js/sim/PowerState.js';
import {DAMAGE_IFRAMES} from '../../js/sim/constants.js';

test('蘑菇：小→大，体型变高', () => {
    const p = new PowerState();
    assert.equal(p.tier, SMALL);
    assert.equal(p.height, 16);
    assert.equal(p.grow(), 'grow');
    assert.equal(p.tier, SUPER);
    assert.equal(p.height, 32);
});

test('蘑菇：已是大态则不变（仅得分）', () => {
    const p = new PowerState();
    p.grow();
    assert.equal(p.grow(), 'none');
    assert.equal(p.tier, SUPER);
});

test('火花：→火', () => {
    const p = new PowerState();
    assert.equal(p.giveFire(), 'fire');
    assert.equal(p.tier, FIRE);
    assert.equal(p.giveFire(), 'none'); // 已是火
});

test('受伤：大/火 → 小 + 无敌帧；小 → 死亡', () => {
    const p = new PowerState();
    p.giveFire();
    assert.equal(p.hurt(), 'shrink');
    assert.equal(p.tier, SMALL);
    assert.ok(p.invincible);
    assert.equal(p.damageIFrames, DAMAGE_IFRAMES);

    // 无敌帧内再次受伤 → 无效
    assert.equal(p.hurt(), 'none');

    // 跑过无敌帧
    for (let i = 0; i < DAMAGE_IFRAMES; i++) p.update();
    assert.ok(!p.invincible);

    // 小态受伤 → 死
    assert.equal(p.hurt(), 'die');
    assert.equal(p.dead, true);
});

test('星星：一段时间无敌，到时失效', () => {
    const p = new PowerState();
    p.giveStar(5);
    assert.ok(p.starActive);
    assert.ok(p.invincible);
    assert.equal(p.hurt(), 'none'); // 星星期间免疫
    for (let i = 0; i < 5; i++) p.update();
    assert.ok(!p.starActive);
    assert.ok(!p.invincible);
});
