export type HistorySnapshot<T> = {
  past: T[];
  present: T;
  future: T[];
};

const cloneValue = <T>(value: T): T => {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
};

/** A small immutable-snapshot history for editor state. */
export class History<T> {
  private past: T[] = [];
  private present: T;
  private future: T[] = [];

  constructor(initial: T) {
    this.present = cloneValue(initial);
  }

  get current(): T { return cloneValue(this.present); }
  get value(): T { return this.current; }
  get canUndo(): boolean { return this.past.length > 0; }
  get canRedo(): boolean { return this.future.length > 0; }

  push(next: T): this {
    this.past.push(this.present);
    this.present = cloneValue(next);
    this.future = [];
    return this;
  }

  undo(): T | null {
    if (!this.canUndo) return null;
    this.future.unshift(this.present);
    this.present = this.past.pop() as T;
    return this.current;
  }

  redo(): T | null {
    if (!this.canRedo) return null;
    this.past.push(this.present);
    this.present = this.future.shift() as T;
    return this.current;
  }

  reset(next: T): this {
    this.past = [];
    this.present = cloneValue(next);
    this.future = [];
    return this;
  }

  snapshot(): HistorySnapshot<T> {
    return {
      past: cloneValue(this.past),
      present: this.current,
      future: cloneValue(this.future)
    };
  }
}

export const createHistory = <T>(initial: T): History<T> => new History(initial);
