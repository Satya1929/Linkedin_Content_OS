import type { ScheduleInput } from "./types";

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

function parseTime(value: string) {
  const [hourRaw, minuteRaw] = value.split(":");
  return {
    hour: Number(hourRaw),
    minute: Number(minuteRaw)
  };
}

export function getDefaultScheduleDate(now = new Date()) {
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;
}

export function resolveSchedule(input: ScheduleInput, defaultTime = "10:30") {
  if (input.mode === "exact" && input.exactAt) {
    return new Date(input.exactAt).toISOString();
  }

  const date = input.date || getDefaultScheduleDate();
  const timezone = input.timezone || process.env.DEFAULT_TIMEZONE || "Asia/Kolkata";

  if (input.mode === "range" && input.rangeStart && input.rangeEnd) {
    const start = parseTime(input.rangeStart);
    const end = parseTime(input.rangeEnd);
    const startMinutes = start.hour * 60 + start.minute;
    const endMinutes = end.hour * 60 + end.minute;
    const lower = Math.min(startMinutes, endMinutes);
    const upper = Math.max(startMinutes, endMinutes);
    const selected = lower + Math.floor(Math.random() * (upper - lower + 1));
    const selectedTime = `${pad(Math.floor(selected / 60))}:${pad(selected % 60)}`;
    return localWallTimeToIso(date, selectedTime, timezone);
  }

  return localWallTimeToIso(date, defaultTime, timezone);
}

export function localWallTimeToIso(date: string, time: string, timezone: string) {
  const [year, month, day] = date.split("-").map(Number);
  const { hour, minute } = parseTime(time);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).formatToParts(utcGuess);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const asTimezone = Date.UTC(
    Number(lookup.year),
    Number(lookup.month) - 1,
    Number(lookup.day),
    Number(lookup.hour),
    Number(lookup.minute),
    Number(lookup.second)
  );
  const offset = asTimezone - utcGuess.getTime();
  return new Date(utcGuess.getTime() - offset).toISOString();
}
