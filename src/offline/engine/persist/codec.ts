// Turns a room's object graph (classes, Maps, Sets, shared references) into JSON and back.

/** a class the codec may rebuild; custom ones save a small form instead of their fields */
export interface ClassSpec {
  name: string;
  ctor: abstract new (...args: never[]) => object;
  encode?: (obj: object) => unknown;
  decode?: (data: unknown) => object;
  /** after its fields are back: put back function fields (clocks, random sources) */
  revive?: (obj: Record<string, unknown>) => void;
}

const TYPED = { Uint8Array, Int8Array, Uint16Array, Int16Array, Uint32Array, Int32Array, Float32Array, Float64Array, Uint8ClampedArray } as const;
type TypedName = keyof typeof TYPED;
/** a saved function field, swapped for a fresh one when its object is filled */
const FN = Symbol('fn');

export class Codec {
  private byName = new Map<string, ClassSpec>();
  private byCtor = new Map<unknown, ClassSpec>();

  /** fns: makes a fresh function for a function field, by field name (now, rand, jitter) */
  constructor(
    specs: ClassSpec[],
    private readonly fns: Record<string, () => unknown> = {},
    private readonly globals: GlobalSpec[] = [],
  ) {
    for (const s of specs) {
      if (this.byName.has(s.name)) throw new Error(`codec: two classes named ${s.name}`);
      this.byName.set(s.name, s);
      this.byCtor.set(s.ctor, s);
    }
  }

  encode(root: unknown): unknown {
    const seen = new Map<object, number>();
    this.count(root, seen);
    const ids = new Map<object, number>();
    let next = 0;
    for (const [o, n] of seen) if (n > 1) ids.set(o, next++);
    const done = new Set<object>();
    return this.enc(root, ids, done, '$');
  }

  decode(data: unknown): unknown {
    return this.dec(data, new Map<number, unknown>());
  }

  private globalOf(v: object): GlobalSpec | undefined {
    const proto = Object.getPrototypeOf(v);
    if (proto !== Object.prototype) return undefined;
    return this.globals.find((g) => g.is(v));
  }

  /** counts how often each object is reached, so shared ones get an id */
  private count(v: unknown, seen: Map<object, number>): void {
    if (v === null || typeof v !== 'object') return;
    const n = seen.get(v) ?? 0;
    seen.set(v, n + 1);
    if (n > 0) return;
    if (v instanceof Promise || ArrayBuffer.isView(v) || v instanceof Date || this.globalOf(v)) return;
    const spec = this.byCtor.get(v.constructor);
    if (spec?.encode) return;
    if (Array.isArray(v)) for (const x of v) this.count(x, seen);
    else if (v instanceof Map) for (const [k, x] of v) (this.count(k, seen), this.count(x, seen));
    else if (v instanceof Set) for (const x of v) this.count(x, seen);
    else for (const k of Object.keys(v)) this.count((v as Record<string, unknown>)[k], seen);
  }

  private enc(v: unknown, ids: Map<object, number>, done: Set<object>, path: string): unknown {
    if (v === undefined) return { $u: 1 };
    if (v === null || typeof v === 'string' || typeof v === 'boolean') return v;
    if (typeof v === 'number') return Number.isFinite(v) ? v : { $n: String(v) };
    if (typeof v === 'function') return { $fn: 1 };
    if (typeof v !== 'object') throw new Error(`codec: can't save ${typeof v} at ${path}`);
    if (v instanceof Promise) return null;
    const g = this.globalOf(v);
    if (g) return { $g: g.name };
    const id = ids.get(v);
    if (id !== undefined && done.has(v)) return { $ref: id };
    if (id !== undefined) done.add(v);
    const tag = id !== undefined ? { $id: id } : {};
    if (v instanceof Date) return { ...tag, $date: v.getTime() };
    if (ArrayBuffer.isView(v)) {
      const name = v.constructor.name as TypedName;
      if (!(name in TYPED)) throw new Error(`codec: can't save ${name} at ${path}`);
      return { ...tag, $ta: name, $v: Array.from(v as unknown as ArrayLike<number>) };
    }
    const sub = (x: unknown, k: string | number) => this.enc(x, ids, done, `${path}.${k}`);
    if (Array.isArray(v)) {
      const arr = v.map((x, i) => sub(x, i));
      return id !== undefined ? { $id: id, $a: arr } : arr;
    }
    if (v instanceof Map) return { ...tag, $map: [...v].map(([k, x], i) => [sub(k, `k${i}`), sub(x, i)]) };
    if (v instanceof Set) return { ...tag, $set: [...v].map((x, i) => sub(x, i)) };
    const proto = Object.getPrototypeOf(v);
    const fields = (obj: object) => {
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(obj)) out[k] = sub((obj as Record<string, unknown>)[k], k);
      return out;
    };
    if (proto === Object.prototype || proto === null) {
      const out = fields(v);
      const dollar = Object.keys(out).some((k) => k.startsWith('$'));
      return id !== undefined || dollar ? { ...tag, $o: out } : out;
    }
    const spec = this.byCtor.get(v.constructor);
    if (!spec) throw new Error(`codec: class ${v.constructor?.name ?? '?'} is not registered (at ${path})`);
    if (spec.encode) return { ...tag, $c: spec.name, $x: spec.encode(v) };
    return { ...tag, $c: spec.name, $f: fields(v) };
  }

  private dec(d: unknown, refs: Map<number, unknown>): unknown {
    if (d === null || typeof d !== 'object') return d;
    if (Array.isArray(d)) return d.map((x) => this.dec(x, refs));
    const o = d as Record<string, unknown>;
    const id = typeof o.$id === 'number' ? o.$id : undefined;
    const keep = <T>(x: T): T => {
      if (id !== undefined) refs.set(id, x);
      return x;
    };
    if ('$u' in o) return undefined;
    if ('$fn' in o) return FN;
    if ('$n' in o) return Number(o.$n);
    if ('$g' in o) {
      const g = this.globals.find((x) => x.name === o.$g);
      if (!g) throw new Error(`codec: unknown global ${String(o.$g)}`);
      return g.get();
    }
    if ('$ref' in o) {
      if (!refs.has(o.$ref as number)) throw new Error(`codec: missing ref ${String(o.$ref)}`);
      return refs.get(o.$ref as number);
    }
    if ('$date' in o) return keep(new Date(o.$date as number));
    if ('$ta' in o) {
      const T = TYPED[o.$ta as TypedName];
      if (!T) throw new Error(`codec: unknown array ${String(o.$ta)}`);
      return keep(T.from(o.$v as number[]));
    }
    if ('$a' in o) {
      const arr = keep([] as unknown[]);
      for (const x of o.$a as unknown[]) arr.push(this.dec(x, refs));
      return arr;
    }
    if ('$map' in o) {
      const m = keep(new Map<unknown, unknown>());
      for (const [k, x] of o.$map as [unknown, unknown][]) m.set(this.dec(k, refs), this.dec(x, refs));
      return m;
    }
    if ('$set' in o) {
      const s = keep(new Set<unknown>());
      for (const x of o.$set as unknown[]) s.add(this.dec(x, refs));
      return s;
    }
    if ('$c' in o) {
      const spec = this.byName.get(o.$c as string);
      if (!spec) throw new Error(`codec: unknown class ${String(o.$c)}`);
      if (spec.decode) return keep(spec.decode(o.$x));
      const obj = keep(Object.create((spec.ctor as unknown as { prototype: object }).prototype) as Record<string, unknown>);
      this.fill(obj, o.$f as Record<string, unknown>, refs);
      spec.revive?.(obj);
      return obj;
    }
    const plain = '$o' in o ? (o.$o as Record<string, unknown>) : o;
    const obj = keep({} as Record<string, unknown>);
    this.fill(obj, plain, refs);
    return obj;
  }

  private fill(obj: Record<string, unknown>, fields: Record<string, unknown>, refs: Map<number, unknown>): void {
    for (const k of Object.keys(fields)) {
      let value = this.dec(fields[k], refs);
      if (value === FN) {
        const make = this.fns[k];
        if (!make) throw new Error(`codec: no function for field ${k}`);
        value = make();
      }
      Object.defineProperty(obj, k, { value, writable: true, enumerable: true, configurable: true });
    }
  }
}

/** a shared server-wide object (the word list) saved by name, never by value */
export interface GlobalSpec {
  name: string;
  is: (v: object) => boolean;
  get: () => object;
}

/** paths of function fields in a graph (each needs a revive), for tests and checks */
export function functionFields(root: unknown): string[] {
  const out: string[] = [];
  const seen = new Set<object>();
  const walk = (v: unknown, path: string) => {
    if (v === null || typeof v !== 'object' || seen.has(v) || ArrayBuffer.isView(v)) return;
    seen.add(v);
    if (v instanceof Map) return [...v].forEach(([k, x]) => walk(x, `${path}[${String(k)}]`));
    if (v instanceof Set) return [...v].forEach((x, i) => walk(x, `${path}{${i}}`));
    for (const k of Object.keys(v)) {
      const x = (v as Record<string, unknown>)[k];
      if (typeof x === 'function') out.push(`${v.constructor?.name ?? 'Object'}.${k}`);
      else walk(x, `${path}.${k}`);
    }
  };
  walk(root, '$');
  return [...new Set(out)];
}
