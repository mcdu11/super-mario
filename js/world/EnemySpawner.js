/**
 * 敌人生成器 —— 随镜头右移「按列」从关卡数据生成敌人到对象槽。
 * 见 docs/PERFECT-REPLICA-SPEC.md §5.1。
 *
 * 还原的关键行为：
 * - 单向：数据指针只前进，左侧敌人不会重生。
 * - 入屏即生成：当某敌人所在列从右边缘进入视野时尝试载入。
 * - 槽满即丢弃：无空槽时该敌人不出现（→ 同屏上限 / 闪烁）。
 * - 出屏即回收：滚出左边缘一定距离后释放其槽。
 *
 * ⚠️ VERIFY：槽数、移除边距、入屏触发的精确像素/列时机须对照反汇编校准。
 */
export const ENEMY_SLOT_COUNT = 5; // VERIFY（原版常被引用为同屏 5 个敌人槽）
export const SCREEN_WIDTH = 256;   // NES 可见宽度（像素）
export const REMOVE_MARGIN = 16;   // 滚出左边缘多少像素后回收 VERIFY

export default class EnemySpawner {
    /**
     * @param {Array<{x:number,type:string}>} placements 关卡敌人放置（像素 x）
     * @param {{slots:import('./ObjectSlots.js').default, createEntity:(p:any)=>any,
     *          screenWidth?:number, removeMargin?:number}} opts
     *   createEntity 返回的实体对象须暴露当前像素 x（用于出屏回收）。
     */
    constructor(placements, {slots, createEntity, screenWidth = SCREEN_WIDTH, removeMargin = REMOVE_MARGIN}) {
        // 按 x 升序，保证单向指针的处理顺序与「从左到右滚动」一致
        this.placements = [...placements].sort((a, b) => a.x - b.x);
        this.slots = slots;
        this.createEntity = createEntity;
        this.screenWidth = screenWidth;
        this.removeMargin = removeMargin;
        this.pointer = 0;       // 数据指针（单向）
        this.spawnedCount = 0;  // 成功载入计数（统计/调试用）
        this.lostCount = 0;     // 因槽满被丢弃的计数（还原「消失」）
    }

    /**
     * 每帧调用：根据镜头左沿像素 x 处理生成与回收。
     * @param {number} cameraX 镜头左沿像素 x（关卡内只增不减）
     */
    update(cameraX) {
        const cameraRight = cameraX + this.screenWidth;

        // 先回收：滚出左边缘的敌人释放其槽（必须在生成之前，
        // 这样腾出的槽才能立即给新敌人 —— 还原原版每帧先移除后载入的净效果）
        for (const [i, ent] of this.slots.active()) {
            if (ent.x < cameraX - this.removeMargin) {
                this.slots.release(i);
            }
        }

        // 再生成：处理已进入右边缘的列
        while (this.pointer < this.placements.length &&
               this.placements[this.pointer].x <= cameraRight) {
            const p = this.placements[this.pointer];
            if (p.x >= cameraX) { // 仍在屏内（不补生成已被越过的）
                const idx = this.slots.spawn(this.createEntity(p));
                if (idx >= 0) this.spawnedCount++;
                else this.lostCount++; // 槽满 → 丢弃，还原原版同屏上限
            }
            this.pointer++;
        }
    }
}
