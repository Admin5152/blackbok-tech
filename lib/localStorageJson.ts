/** Safe JSON read/write helpers for browser localStorage overrides. */
export function readLocalStorageJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeLocalStorageJson(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}
