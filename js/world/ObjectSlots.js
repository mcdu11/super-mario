/**
 * 对象槽位 —— 固定数量的实体槽，复刻 NES 的对象内存模型。
 * 见 docs/PERFECT-REPLICA-SPEC.md §5.1。
 *
 * 原版敌人活在固定数量的槽里（非无限数组）；槽满时新敌人无法载入 —— 这正是
 * 「同屏敌人上限 / 闪烁消失」的根源。这里把这个约束显式建模，便于精确复刻与测试。
 */
export default class ObjectSlots {
    /** @param {number} count 槽位数量 */
    constructor(count) {
        this.slots = new Array(count).fill(null);
    }

    get count() {
        return this.slots.length;
    }

    /** 当前占用的槽数 */
    get size() {
        let n = 0;
        for (const s of this.slots) if (s !== null) n++;
        return n;
    }

    /** 第一个空槽下标，没有则 -1 */
    freeIndex() {
        return this.slots.indexOf(null);
    }

    /**
     * 尝试载入对象到空槽。
     * @returns {number} 槽下标；若已满返回 -1（对象被丢弃 —— 还原原版行为）
     */
    spawn(obj) {
        const i = this.freeIndex();
        if (i < 0) return -1;
        this.slots[i] = obj;
        return i;
    }

    release(i) {
        this.slots[i] = null;
    }

    /** @returns {Array<[number, any]>} 活动槽的 [下标, 对象] 列表 */
    active() {
        const out = [];
        for (let i = 0; i < this.slots.length; i++) {
            if (this.slots[i] !== null) out.push([i, this.slots[i]]);
        }
        return out;
    }
}
