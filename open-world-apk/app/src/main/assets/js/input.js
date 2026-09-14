/**
 * input.js — 输入处理
 * 键盘：WASD / 方向键移动，Shift 奔跑，ESC 暂停
 * 触摸：左下角虚拟摇杆移动，推到边缘奔跑
 */

class Input {
  constructor() {
    this.keys = new Set();
    this._justPressed = new Set();

    // 触摸摇杆状态
    this._joyVec = { x: 0, y: 0 };
    this._joyRunning = false;

    this._initKeyboard();
    this._initJoystick();
  }

  _initKeyboard() {
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (!this.keys.has(k)) this._justPressed.add(k);
      this.keys.add(k);
      // 防止方向键滚动页面
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });

    // 失焦时清空，避免按键卡住
    window.addEventListener('blur', () => this.keys.clear());
  }

  _initJoystick() {
    const base = document.getElementById('joystick-base');
    const stick = document.getElementById('joystick-stick');
    if (!base || !stick) return;

    const baseRect = () => base.getBoundingClientRect();
    const maxRadius = () => baseRect().width / 2;
    let activeTouchId = null;

    const setStick = (dx, dy) => {
      const r = Math.hypot(dx, dy);
      const maxR = maxRadius();
      let nx = 0, ny = 0, clampedX = 0, clampedY = 0;
      if (r > 0) {
        nx = dx / r;
        ny = dy / r;
        const clamped = Math.min(r, maxR);
        clampedX = nx * clamped;
        clampedY = ny * clamped;
      }
      stick.style.transform = `translate(${clampedX}px, ${clampedY}px)`;
      this._joyVec = { x: nx, y: ny };
      this._joyRunning = r > maxR * 0.7;
    };

    const onStart = (e) => {
      e.preventDefault();
      const t = e.touches[0];
      activeTouchId = t.identifier;
      const rect = baseRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      setStick(t.clientX - cx, t.clientY - cy);
    };

    const onMove = (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier === activeTouchId) {
          const rect = baseRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          setStick(t.clientX - cx, t.clientY - cy);
        }
      }
    };

    const onEnd = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === activeTouchId) {
          activeTouchId = null;
          setStick(0, 0);
        }
      }
    };

    base.addEventListener('touchstart', onStart, { passive: false });
    base.addEventListener('touchmove', onMove, { passive: false });
    base.addEventListener('touchend', onEnd, { passive: false });
    base.addEventListener('touchcancel', onEnd, { passive: false });

    // 也支持鼠标拖动（桌面调试）
    let mouseDown = false;
    base.addEventListener('mousedown', (e) => {
      mouseDown = true;
      const rect = baseRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      setStick(e.clientX - cx, e.clientY - cy);
    });
    window.addEventListener('mousemove', (e) => {
      if (!mouseDown) return;
      const rect = baseRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      setStick(e.clientX - cx, e.clientY - cy);
    });
    window.addEventListener('mouseup', () => {
      mouseDown = false;
      setStick(0, 0);
    });
  }

  isDown(...keys) {
    return keys.some(k => this.keys.has(k.toLowerCase()));
  }

  /** 本帧是否刚按下（消费式） */
  wasPressed(key) {
    const k = key.toLowerCase();
    if (this._justPressed.has(k)) {
      this._justPressed.delete(k);
      return true;
    }
    return false;
  }

  /** 获取归一化移动向量（触摸摇杆优先） */
  getMoveVector() {
    if (this._joyVec.x !== 0 || this._joyVec.y !== 0) {
      return { x: this._joyVec.x, y: this._joyVec.y };
    }

    let x = 0, y = 0;
    if (this.isDown('w', 'arrowup')) y -= 1;
    if (this.isDown('s', 'arrowdown')) y += 1;
    if (this.isDown('a', 'arrowleft')) x -= 1;
    if (this.isDown('d', 'arrowright')) x += 1;

    // 对角线归一化
    const len = Math.hypot(x, y);
    if (len > 0) { x /= len; y /= len; }
    return { x, y };
  }

  isRunning() {
    return this._joyRunning || this.isDown('shift');
  }

  clearFrame() {
    this._justPressed.clear();
  }
}