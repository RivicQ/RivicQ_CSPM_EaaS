export type ScanSchedule = {
  id: string;
  name: string;
  cron: string;
  target: string;
  type: string;
  status: 'active' | 'paused';
  nextRun: string;
};

const KEY = 'rivicq_scan_schedules';

export function readScanSchedules(): ScanSchedule[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeScanSchedules(schedules: ScanSchedule[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(schedules));
  } catch {
    // ignore
  }
}

export function nextRunLabel(cron: string): string {
  if (cron.includes('2 * * *')) return 'Tonight 02:00 UTC';
  if (cron.includes('* * 1')) return 'Next Monday 06:00 UTC';
  return 'On next matching interval';
}
