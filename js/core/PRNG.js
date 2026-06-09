/**
 * 伪随机数发生器 —— 复刻 NES SMB1 的 7 字节伪随机位寄存器（LFSR）。
 * 见 docs/PERFECT-REPLICA-SPEC.md §4.4。
 *
 * 原版算法（PseudoRandom，寄存器 PseudoRandomBitReg = $07A7..$07AD）：
 *   反馈位 = bit1(byte0) XOR bit1(byte1)
 *   将反馈位作为初始 carry，自 byte0 起对 7 个字节依次 ROR（右旋，carry 级联）。
 * 完全确定：同种子 → 同序列，用于 Bowser 火球、火焰棒相位、敌人投掷等。
 *
 * ⚠️ VERIFY：默认种子需对照 ROM 初始化核对（非全零即可避免 LFSR 锁死）。
 */
const DEFAULT_SEED = [0xa5, 0, 0, 0, 0, 0, 0]; // VERIFY 原版初值

export default class PRNG {
    constructor(seed) {
        this.reg = seed ? seed.slice(0, 7) : DEFAULT_SEED.slice();
        while (this.reg.length < 7) this.reg.push(0);
    }

    /** 推进一步并返回 byte0（0–255） */
    next() {
        const r = this.reg;
        let carry = ((r[0] >> 1) & 1) ^ ((r[1] >> 1) & 1); // 反馈 = d1(b0) ^ d1(b1)
        for (let x = 0; x < 7; x++) {
            const outBit = r[x] & 1;                 // 当前字节的 bit0 → 下一个 carry
            r[x] = ((r[x] >> 1) | (carry << 7)) & 0xff; // 右旋：carry 进 bit7
            carry = outBit;
        }
        return r[0];
    }

    /** 推进一步并返回 [0,1) 浮点（便于上层使用，仍由整数寄存器驱动） */
    nextFloat() {
        return this.next() / 256;
    }

    /** 寄存器快照（用于回放/序列化） */
    get state() {
        return this.reg.slice();
    }
}
