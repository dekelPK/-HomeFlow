import { defaultData } from './defaults';
import type { AppData } from './types';

const KEY = 'homeflow:v1';

export function load(): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppData;
      if (parsed && parsed.version === 1 && parsed.settings && parsed.months) return parsed;
    }
  } catch {
    /* fall through to defaults */
  }
  return defaultData();
}

export function save(data: AppData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable (private mode / quota) – app keeps working in memory */
  }
}

export function exportJson(data: AppData): string {
  return JSON.stringify(data, null, 2);
}

export function importJson(text: string): AppData {
  const parsed = JSON.parse(text) as AppData;
  if (!parsed || parsed.version !== 1 || !parsed.settings || !parsed.months) {
    throw new Error('קובץ לא תקין');
  }
  return parsed;
}
