let _dirty = false;
let _reset: (() => void) | null = null;

export const createGuard = {
  get dirty() {
    return _dirty;
  },
  set dirty(v: boolean) {
    _dirty = v;
  },
  get reset() {
    return _reset;
  },
  set reset(fn: (() => void) | null) {
    _reset = fn;
  },
};
