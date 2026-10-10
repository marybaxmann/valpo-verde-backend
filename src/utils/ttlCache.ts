/**
 * Caché en memoria con vencimiento (TTL), por proceso. Se usa para no
 * repetir en cada petición consultas a Supabase cuyo resultado cambia poco
 * (sesión validada, perfil, membresía). Cada viaje a Supabase cuesta ~150 ms.
 *
 * Desactivada en tests (NODE_ENV=test): cada test configura sus propios
 * mocks y no debe heredar resultados de otro.
 */
export class TtlCache<V> {
  private readonly entries = new Map<string, { value: V; expiresAt: number }>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries = 1000
  ) {}

  private get enabled(): boolean {
    return process.env.NODE_ENV !== "test" && this.ttlMs > 0;
  }

  get(key: string): V | undefined {
    if (!this.enabled) return undefined;
    const hit = this.entries.get(key);
    if (!hit) return undefined;
    if (hit.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return hit.value;
  }

  set(key: string, value: V): void {
    if (!this.enabled) return;
    // Límite simple de memoria: al llenarse se vacía por completo.
    if (this.entries.size >= this.maxEntries) this.entries.clear();
    this.entries.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  /** Elimina las claves que empiezan con `prefix` (o todas si no se indica). */
  invalidate(prefix?: string): void {
    if (prefix === undefined) {
      this.entries.clear();
      return;
    }
    for (const key of this.entries.keys()) {
      if (key.startsWith(prefix)) this.entries.delete(key);
    }
  }
}
