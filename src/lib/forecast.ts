import { isCalendarDay } from "./days.ts";

export type Forecast = {
  current: { temperature_2m: number; weather_code: number };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max?: (number | null)[];
  };
};

/** Validate upstream dates before render: Intl throws for an impossible calendar day. */
export function asForecast(value: unknown): Forecast | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Forecast;
  if (
    typeof raw.current?.temperature_2m !== "number" ||
    !Number.isFinite(raw.current.temperature_2m) ||
    typeof raw.current?.weather_code !== "number" ||
    !Number.isFinite(raw.current.weather_code)
  )
    return null;
  if (!Array.isArray(raw.daily?.time) || raw.daily.time.length === 0) return null;
  if (!raw.daily.time.every(isCalendarDay)) return null;
  if (!Array.isArray(raw.daily.weather_code)) return null;
  if (!Array.isArray(raw.daily.temperature_2m_max) || !Array.isArray(raw.daily.temperature_2m_min))
    return null;
  return raw;
}
