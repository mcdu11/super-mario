/**
 * NES 手柄按钮位掩码。
 * 一帧的输入 = 一个整数（各位代表一个按钮的按下状态）。
 * 用单个整数表示一帧输入，是确定性录制/回放与逐帧比对的最小单元
 * （见 docs/PERFECT-REPLICA-SPEC.md §10）。
 */
export const Button = {
    A:      1 << 0,
    B:      1 << 1,
    SELECT: 1 << 2,
    START:  1 << 3,
    UP:     1 << 4,
    DOWN:   1 << 5,
    LEFT:   1 << 6,
    RIGHT:  1 << 7,
};

export function isDown(mask, button) {
    return (mask & button) !== 0;
}

/** 默认键盘映射：键名(KeyboardEvent.code) → 按钮位 */
export const DEFAULT_KEYMAP = {
    KeyZ:        Button.A,      // 跳
    KeyX:        Button.B,      // 跑/火球
    Enter:       Button.START,
    ShiftRight:  Button.SELECT,
    ArrowUp:     Button.UP,
    ArrowDown:   Button.DOWN,
    ArrowLeft:   Button.LEFT,
    ArrowRight:  Button.RIGHT,
};
