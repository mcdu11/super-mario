/**
 * 键盘 → 按钮位掩码采样器（浏览器端）。
 * 维护一个「当前按下」的掩码，每个游戏帧用 read() 采样一次，
 * 交给确定性物理 step()。见 docs/PERFECT-REPLICA-SPEC.md §10。
 *
 * 注意：这里只把「物理按键状态」转成掩码；确定性发生在逻辑层（按帧采样、
 * 整数物理）。真正逐帧精确比对时改用 InputReplay 喂掩码即可。
 */
import {DEFAULT_KEYMAP} from './Buttons.js';

export default class KeyboardButtons {
    constructor(keymap = DEFAULT_KEYMAP) {
        this.keymap = keymap;
        this.mask = 0;
    }

    listenTo(win) {
        win.addEventListener('keydown', e => {
            const bit = this.keymap[e.code];
            if (bit) {
                this.mask |= bit;
                e.preventDefault();
            }
        });
        win.addEventListener('keyup', e => {
            const bit = this.keymap[e.code];
            if (bit) {
                this.mask &= ~bit;
                e.preventDefault();
            }
        });
        return this;
    }

    /** @returns {number} 当前按钮位掩码 */
    read() {
        return this.mask;
    }
}
