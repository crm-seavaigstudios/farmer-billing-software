// Centralized Date Parsing and Timeline Evaluation Utility
// Handles Indian DD/MM/YYYY, ISO, Text strings, and Timestamps robustly

export type TimelineFilter = 
  | 'ALL'
  | 'ALL_TIME' 
  | 'TODAY' 
  | 'YESTERDAY' 
  | 'THIS_WEEK' 
  | 'WEEK' 
  | 'THIS_MONTH' 
  | 'MONTH' 
  | 'LAST_MONTH'
  | 'THIS_YEAR' 
  | 'SEASON' 
  | 'CUSTOM';

const MONTH_MAP: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
};

/**
 * Robustly parses any date representation into a valid JavaScript Date object.
 * Correctly disambiguates Indian DD/MM/YYYY from US MM/DD/YYYY without flipping months/days.
 */
export function parseDateRobust(dateVal: any): Date {
  if (!dateVal) return new Date(0);

  // If already a Date object
  if (dateVal instanceof Date) {
    return isNaN(dateVal.getTime()) ? new Date(0) : dateVal;
  }

  // If numeric timestamp
  if (typeof dateVal === 'number') {
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? new Date(0) : d;
  }

  const str = String(dateVal).trim();
  if (!str) return new Date(0);

  // 1. Check Indian slash format DD/MM/YYYY or D/M/YYYY
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);
      const p2 = parseInt(parts[2], 10);

      // If year is the last component (DD/MM/YYYY)
      if (p2 >= 1000) {
        const day = p0;
        const month = p1 - 1; // 0-indexed
        const year = p2;
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          const d = new Date(year, month, day);
          if (!isNaN(d.getTime())) return d;
        }
      } else if (p0 >= 1000) {
        // YYYY/MM/DD
        const d = new Date(p0, p1 - 1, p2);
        if (!isNaN(d.getTime())) return d;
      }
    }
  }

  // 2. Check Indian dash format DD-MM-YYYY
  if (str.includes('-')) {
    const parts = str.split('-');
    if (parts.length === 3 && parts[2].length === 4) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        const d = new Date(year, month, day);
        if (!isNaN(d.getTime())) return d;
      }
    }
  }

  // 3. Check Text format like "09 Oct 2026" or "9 October 2026"
  const cleaned = str.replace(/\s+/g, ' ').trim();
  const textParts = cleaned.split(' ');
  if (textParts.length >= 3) {
    const day = parseInt(textParts[0], 10);
    const mStr = textParts[1].toLowerCase().substring(0, 3);
    const year = parseInt(textParts[2], 10);
    if (!isNaN(day) && MONTH_MAP[mStr] !== undefined && !isNaN(year)) {
      const d = new Date(year, MONTH_MAP[mStr], day);
      if (!isNaN(d.getTime())) return d;
    }
  }

  // 4. Fallback to standard native ISO parsing
  const nativeDate = new Date(str);
  if (!isNaN(nativeDate.getTime())) {
    return nativeDate;
  }

  return new Date(0);
}

/**
 * Returns precise epoch millisecond boundaries for any timeline filter.
 */
export function getTimelineBounds(
  filter: TimelineFilter,
  customStart?: string,
  customEnd?: string
): { start: number; end: number } {
  const now = new Date();

  // End of today by default (23:59:59.999)
  const endObj = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  // Start of today by default (00:00:00.000)
  const startObj = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  switch (filter) {
    case 'TODAY':
      return { start: startObj.getTime(), end: endObj.getTime() };

    case 'YESTERDAY': {
      const yStart = new Date(startObj);
      yStart.setDate(yStart.getDate() - 1);
      const yEnd = new Date(endObj);
      yEnd.setDate(yEnd.getDate() - 1);
      return { start: yStart.getTime(), end: yEnd.getTime() };
    }

    case 'WEEK':
    case 'THIS_WEEK': {
      // Current week: Monday 00:00:00 to Sunday 23:59:59 (or current end)
      const day = startObj.getDay();
      const diff = startObj.getDate() - day + (day === 0 ? -6 : 1);
      const wStart = new Date(startObj);
      wStart.setDate(diff);
      return { start: wStart.getTime(), end: endObj.getTime() };
    }

    case 'MONTH':
    case 'THIS_MONTH': {
      // 1st of current calendar month to end of current month
      const mStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { start: mStart.getTime(), end: mEnd.getTime() };
    }

    case 'LAST_MONTH': {
      const lmStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const lmEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { start: lmStart.getTime(), end: lmEnd.getTime() };
    }

    case 'THIS_YEAR':
    case 'SEASON': {
      // 1st of current calendar year (Jan 1) to Dec 31
      const yStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      const yEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      return { start: yStart.getTime(), end: yEnd.getTime() };
    }

    case 'CUSTOM': {
      if (customStart && customEnd) {
        const s = parseDateRobust(customStart);
        s.setHours(0, 0, 0, 0);
        const e = parseDateRobust(customEnd);
        e.setHours(23, 59, 59, 999);
        return { start: s.getTime(), end: e.getTime() };
      }
      return { start: 0, end: endObj.getTime() };
    }

    case 'ALL_TIME':
    default:
      return { start: 0, end: endObj.getTime() + 86400000 * 365 }; // allow all future/past
  }
}

/**
 * Checks whether any date (string, timestamp, Date) falls within the selected timeline filter.
 */
export function isDateInTimeline(
  dateVal: any,
  filter: TimelineFilter,
  customStart?: string,
  customEnd?: string
): boolean {
  if (filter === 'ALL_TIME') return true;
  if (!dateVal) return false;

  const parsed = parseDateRobust(dateVal);
  const time = parsed.getTime();
  if (isNaN(time) || time === 0) return false;

  const { start, end } = getTimelineBounds(filter, customStart, customEnd);
  return time >= start && time <= end;
}
