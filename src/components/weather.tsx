import { useEffect, useRef, useState } from "react";
import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSnow, Sun } from "lucide-react";
import { useDesk, useLang } from "@/lib/store";
import type { Level } from "@/lib/levels";
import { tr, type Copy, type Lang } from "@/lib/text";
import { formatWhen } from "@/lib/time";
import { Button } from "@/components/ui";
import { FORECAST_URL, asForecast, type Forecast } from "@/lib/forecast";
import { watchForecastAge, weatherFailureShown } from "@/lib/forecast-age";

import { skyAdvice, type Kind } from "@/lib/sky-advice";

function kindOf(code: number): Kind {
  if (!Number.isFinite(code)) return "cloud";
  if (code === 0 || code === 1) return "clear";
  if (code === 2 || code === 3) return "cloud";
  if (code === 45 || code === 48) return "fog";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 95) return "storm";
  if (code >= 51) return "rain";
  return "cloud";
}

const ICONS = {
  clear: Sun,
  cloud: Cloud,
  fog: CloudFog,
  rain: CloudRain,
  snow: CloudSnow,
  storm: CloudLightning,
} as const;

function skyLabel(kind: Kind, lang: Lang): string {
  const copy: Record<Kind, Copy> = {
    clear: { en: "Sunny", zh: "晴" },
    cloud: { en: "Cloudy", zh: "多云" },
    fog: { en: "Fog", zh: "雾" },
    rain: { en: "Rain", zh: "雨" },
    snow: { en: "Snow", zh: "雪" },
    storm: { en: "Storm", zh: "雷雨" },
  };
  return tr(lang, copy[kind]);
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * How long a fetched forecast is reused when the card mounts again (route changes), and
 * how long an open page shows it before fetching a fresh one.
 */
const WEATHER_CACHE_MS = 15 * 60 * 1000;

// Browser-only in practice: effects never run on the server, so SSR always renders the
// "checking" line and a full page load starts empty, keeping hydration identical.
let lastForecast: { data: Forecast; fetchedAt: number } | null = null;

function cachedForecast(now = Date.now()): Forecast | null {
  if (!lastForecast) return null;
  const age = now - lastForecast.fetchedAt;
  return age >= 0 && age < WEATHER_CACHE_MS ? lastForecast.data : null;
}

export function WeatherCard() {
  const lang = useLang();
  const level = useDesk((s) => s.level);
  const [data, setData] = useState<Forecast | null>(() => cachedForecast());
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // Bumped when the shown forecast outlives the cache window while the card stays open.
  const [refresh, setRefresh] = useState(0);
  const [fetchedAt, setFetchedAt] = useState<number | null>(() =>
    cachedForecast() && lastForecast ? lastForecast.fetchedAt : null,
  );
  // Whether THIS card has a forecast on screen. The module cache may still hold an expired
  // forecast this card never showed; that must not hide the error and "Try again".
  const shownRef = useRef(data !== null);
  useEffect(() => {
    shownRef.current = data !== null;
  }, [data]);

  useEffect(() => {
    // Back on a page within the cache window: keep the forecast, skip the request.
    // "Try again" (attempt > 0) always goes to the network.
    if (attempt === 0 && cachedForecast()) return;
    const ctrl = new AbortController();
    let gone = false;
    const timer = setTimeout(() => ctrl.abort(), 8000);
    fetch(FORECAST_URL, { signal: ctrl.signal })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json() as Promise<Forecast>;
      })
      .then((json) => {
        const forecast = asForecast(json);
        if (!forecast) throw new Error("shape");
        lastForecast = { data: forecast, fetchedAt: Date.now() };
        if (!gone) {
          setData(forecast);
          setFailed(false);
          setFetchedAt(lastForecast.fetchedAt);
        }
      })
      .catch(() => {
        // A failed background refresh keeps the forecast already on screen; the next
        // focus or return to the tab tries again. A card with nothing to show (including
        // one that came back after the cache expired) shows the error and "Try again".
        if (!gone && weatherFailureShown(shownRef.current)) setFailed(true);
      })
      .finally(() => clearTimeout(timer));
    return () => {
      gone = true;
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [attempt, refresh]);

  // A page left open past the cache window refreshes on its own, and on return to the tab.
  useEffect(() => {
    if (fetchedAt === null) return;
    return watchForecastAge(fetchedAt, WEATHER_CACHE_MS, () => setRefresh((n) => n + 1), {
      now: () => Date.now(),
      setTimer: (run, ms) => window.setTimeout(run, ms),
      clearTimer: (handle) => window.clearTimeout(handle as number),
      visible: () => document.visibilityState !== "hidden",
      onWake: (run) => {
        window.addEventListener("focus", run);
        document.addEventListener("visibilitychange", run);
        return () => {
          window.removeEventListener("focus", run);
          document.removeEventListener("visibilitychange", run);
        };
      },
    });
  }, [fetchedAt]);

  return (
    <section className="desk-panel weather-panel">
      <p className="text-xs uppercase tracking-widest text-muted">Eugene</p>
      {failed ? (
        <div className="mt-3 text-sm text-ink" role="status">
          <p>
            {tr(lang, {
              en: "Weather is unavailable right now.",
              zh: "暂时无法获取天气。",
              es: "El tiempo no está disponible ahora.",
              ko: "지금은 날씨를 불러올 수 없어요.",
              vi: "Hiện chưa tải được thời tiết.",
              ja: "現在、天気情報を取得できません。",
            })}
          </p>
          <Button
            className="mt-3"
            variant="quiet"
            onClick={() => {
              setFailed(false);
              setAttempt((n) => n + 1);
            }}
          >
            {tr(lang, {
              en: "Try again",
              zh: "重试",
              es: "Reintentar",
              ko: "다시 시도",
              vi: "Thử lại",
              ja: "再試行",
            })}
          </Button>
        </div>
      ) : !data ? (
        <p className="mt-3 text-sm text-muted">
          {tr(lang, { en: "Checking the sky…", zh: "正在查天气…" })}
        </p>
      ) : (
        <Sky data={data} lang={lang} level={level} />
      )}
    </section>
  );
}

function Sky({ data, lang, level }: { data: Forecast; lang: Lang; level: Level }) {
  const f = Math.round(data.current.temperature_2m);
  const c = Math.round(((data.current.temperature_2m - 32) * 5) / 9);
  const kind = kindOf(data.current.weather_code);
  const Icon = ICONS[kind];
  const metric = lang !== "en";
  const big = metric ? c : f;
  const unit = metric ? "°C" : "°F";
  const small = metric ? `${f}°F` : `${c}°C`;
  const today = data.daily.time[0] ?? "";
  const advice = skyAdvice(kind, level);

  return (
    <>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="font-display text-5xl leading-none tabular-nums text-ink">
          {big}
          <span className="text-2xl">{unit}</span>
        </p>
        <Icon className="size-8 text-moss" aria-hidden />
      </div>
      <p className="mt-2 text-sm text-muted">
        {small} · {skyLabel(kind, lang)}
      </p>
      {advice && <p className="weather-advice">{tr(lang, advice)}</p>}
      <ul className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3">
        {data.daily.time.slice(0, 3).map((ymd, index) => {
          const dayKind = kindOf(data.daily.weather_code[index] ?? 3);
          const DayIcon = ICONS[dayKind];
          const hiF = data.daily.temperature_2m_max[index];
          const loF = data.daily.temperature_2m_min[index];
          const hi = finite(hiF) ? Math.round(hiF) : null;
          const lo = finite(loF) ? Math.round(loF) : null;
          const hiShow = hi == null ? null : metric ? Math.round(((hi - 32) * 5) / 9) : hi;
          const loShow = lo == null ? null : metric ? Math.round(((lo - 32) * 5) / 9) : lo;
          const pops = Array.isArray(data.daily.precipitation_probability_max)
            ? data.daily.precipitation_probability_max
            : [];
          const pop = pops[index];
          return (
            <li key={ymd} className="text-center">
              <p className="text-xs text-muted">
                {index === 0 ? tr(lang, { en: "Today", zh: "今天" }) : formatWhen(ymd, today, lang)}
              </p>
              <DayIcon className="mx-auto mt-1 size-4 text-moss" aria-hidden />
              <p className="mt-1 text-sm tabular-nums text-ink">
                {hiShow == null || loShow == null ? (
                  "—"
                ) : (
                  <>
                    {hiShow}° <span className="text-muted">{loShow}°</span>
                  </>
                )}
              </p>
              <p className="text-xs tabular-nums text-muted">
                {!finite(pop) ? "—" : `${Math.round(pop)}%`}
              </p>
            </li>
          );
        })}
      </ul>
      <div className="weather-source">
        <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">
          Open-Meteo ↗
        </a>
        <span>
          {tr(lang, {
            en: "Rain chance (%)",
            zh: "降水概率（%）",
            es: "Prob. de lluvia (%)",
            ko: "강수 확률 (%)",
            vi: "Khả năng mưa (%)",
            ja: "降水確率（%）",
          })}
        </span>
      </div>
    </>
  );
}
