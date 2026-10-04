import { useEffect, useState } from "react";
import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSnow, Sun } from "lucide-react";
import { useLang } from "@/lib/store";
import { tr, type Copy, type Lang } from "@/lib/text";
import { formatWhen } from "@/lib/time";
import { Button } from "@/components/ui";

type Kind = "clear" | "cloud" | "fog" | "rain" | "snow" | "storm";

type Forecast = {
  current: { temperature_2m: number; weather_code: number };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: (number | null)[];
  };
};

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

function asForecast(value: unknown): Forecast | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Forecast;
  if (!finite(raw.current?.temperature_2m) || !finite(raw.current?.weather_code)) return null;
  if (!Array.isArray(raw.daily?.time) || raw.daily.time.length === 0) return null;
  if (
    !raw.daily.time.every((item) => typeof item === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item))
  ) {
    return null;
  }
  if (!Array.isArray(raw.daily.weather_code)) return null;
  if (
    !Array.isArray(raw.daily.temperature_2m_max) ||
    !Array.isArray(raw.daily.temperature_2m_min)
  ) {
    return null;
  }
  return raw;
}

export function WeatherCard() {
  const lang = useLang();
  const [data, setData] = useState<Forecast | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setFailed(false);
    const ctrl = new AbortController();
    let gone = false;
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const url =
      "https://api.open-meteo.com/v1/forecast?latitude=44.0448&longitude=-123.0726&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=America%2FLos_Angeles&forecast_days=3&temperature_unit=fahrenheit";
    fetch(url, { signal: ctrl.signal })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json() as Promise<Forecast>;
      })
      .then((json) => {
        const forecast = asForecast(json);
        if (!forecast) throw new Error("shape");
        if (!gone) setData(forecast);
      })
      .catch(() => {
        if (!gone) setFailed(true);
      })
      .finally(() => clearTimeout(timer));
    return () => {
      gone = true;
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [attempt]);

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
          <Button className="mt-3" variant="quiet" onClick={() => setAttempt((n) => n + 1)}>
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
        <Sky data={data} lang={lang} />
      )}
    </section>
  );
}

function Sky({ data, lang }: { data: Forecast; lang: Lang }) {
  const f = Math.round(data.current.temperature_2m);
  const c = Math.round(((data.current.temperature_2m - 32) * 5) / 9);
  const kind = kindOf(data.current.weather_code);
  const Icon = ICONS[kind];
  const metric = lang !== "en";
  const big = metric ? c : f;
  const unit = metric ? "°C" : "°F";
  const small = metric ? `${f}°F` : `${c}°C`;
  const today = data.daily.time[0] ?? "";

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
