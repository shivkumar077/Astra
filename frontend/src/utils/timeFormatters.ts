/**
 * ASTRA Mission Control — Time & Clock Formatting Utilities
 * Authoritative timezone: Asia/Kolkata (Indian Standard Time, UTC+05:30)
 * Required display ordering: Day/Month/Year (DD/MM/YYYY) followed by Time (HH:mm:ss IST)
 */

export const ASTRA_TIMEZONE = 'Asia/Kolkata';

/**
 * Formats a Date, timestamp number, or ISO string to Indian Standard Time (IST)
 * Required format: "DD/MM/YYYY — HH:mm:ss IST"
 */
export function formatStationClockIST(dateOrIso?: string | number | Date | null): string {
  if (!dateOrIso && dateOrIso !== 0) {
    return '— IST';
  }

  const date = typeof dateOrIso === 'string' || typeof dateOrIso === 'number'
    ? new Date(dateOrIso)
    : dateOrIso;

  if (isNaN(date.getTime())) {
    return '— IST';
  }

  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: ASTRA_TIMEZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '';

    const day = getPart('day');
    const month = getPart('month');
    const year = getPart('year');
    const hour = getPart('hour');
    const minute = getPart('minute');
    const second = getPart('second');

    return `${day}/${month}/${year} — ${hour}:${minute}:${second} IST`;
  } catch (_) {
    // Fallback manual offset (+5h 30m)
    const istTime = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
    const day = String(istTime.getUTCDate()).padStart(2, '0');
    const month = String(istTime.getUTCMonth() + 1).padStart(2, '0');
    const year = istTime.getUTCFullYear();
    const hour = String(istTime.getUTCHours()).padStart(2, '0');
    const minute = String(istTime.getUTCMinutes()).padStart(2, '0');
    const second = String(istTime.getUTCSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} — ${hour}:${minute}:${second} IST`;
  }
}

/**
 * Formats an event timestamp into a concise IST format: "DD/MM/YYYY HH:mm:ss IST"
 */
export function formatEventTimestampIST(dateOrIso?: string | number | Date | null): string {
  if (!dateOrIso && dateOrIso !== 0) {
    return '— IST';
  }

  const date = typeof dateOrIso === 'string' || typeof dateOrIso === 'number'
    ? new Date(dateOrIso)
    : dateOrIso;

  if (isNaN(date.getTime())) {
    return '— IST';
  }

  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: ASTRA_TIMEZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '';

    const day = getPart('day');
    const month = getPart('month');
    const year = getPart('year');
    const hour = getPart('hour');
    const minute = getPart('minute');
    const second = getPart('second');

    return `${day}/${month}/${year} ${hour}:${minute}:${second} IST`;
  } catch (_) {
    const istTime = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
    const day = String(istTime.getUTCDate()).padStart(2, '0');
    const month = String(istTime.getUTCMonth() + 1).padStart(2, '0');
    const year = istTime.getUTCFullYear();
    const hour = String(istTime.getUTCHours()).padStart(2, '0');
    const minute = String(istTime.getUTCMinutes()).padStart(2, '0');
    const second = String(istTime.getUTCSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hour}:${minute}:${second} IST`;
  }
}

/**
 * Formats time-only in IST: "HH:mm:ss IST"
 */
export function formatTimeOnlyIST(dateOrIso?: string | number | Date | null): string {
  if (!dateOrIso && dateOrIso !== 0) {
    return '— IST';
  }

  const date = typeof dateOrIso === 'string' || typeof dateOrIso === 'number'
    ? new Date(dateOrIso)
    : dateOrIso;

  if (isNaN(date.getTime())) {
    return '— IST';
  }

  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: ASTRA_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    return `${formatter.format(date)} IST`;
  } catch (_) {
    const istTime = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
    const hour = String(istTime.getUTCHours()).padStart(2, '0');
    const minute = String(istTime.getUTCMinutes()).padStart(2, '0');
    const second = String(istTime.getUTCSeconds()).padStart(2, '0');
    return `${hour}:${minute}:${second} IST`;
  }
}

/**
 * Formats date-only in IST: "DD/MM/YYYY"
 */
export function formatDateOnlyIST(dateOrIso?: string | number | Date | null): string {
  if (!dateOrIso && dateOrIso !== 0) {
    return '—';
  }

  const date = typeof dateOrIso === 'string' || typeof dateOrIso === 'number'
    ? new Date(dateOrIso)
    : dateOrIso;

  if (isNaN(date.getTime())) {
    return '—';
  }

  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: ASTRA_TIMEZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    return formatter.format(date);
  } catch (_) {
    const istTime = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
    const day = String(istTime.getUTCDate()).padStart(2, '0');
    const month = String(istTime.getUTCMonth() + 1).padStart(2, '0');
    const year = istTime.getUTCFullYear();
    return `${day}/${month}/${year}`;
  }
}
