import { useState } from "react";
import { DISTRICTS, districtAt, districtCopy, isDistrict } from "@/data/districts";
import { useDesk, useLang } from "@/lib/store";
import { tr } from "@/lib/text";
import { cn } from "@/lib/cn";

export function DistrictBar({ compact = false }: { compact?: boolean }) {
  const lang = useLang();
  const level = useDesk((state) => state.level);
  const district = useDesk((state) => state.district);
  const setDistrict = useDesk((state) => state.setDistrict);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);

  if (level === "uni") return null;

  function locate() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setNote(
        tr(lang, {
          en: "This browser cannot share a location. Pick the district yourself.",
          zh: "当前浏览器不支持定位，请手动选择学区。",
          es: "Este navegador no puede dar la ubicación. Elige el distrito tú.",
          ko: "이 브라우저는 위치를 줄 수 없어요. 학구를 직접 고르세요.",
          vi: "Trình duyệt này không định vị được. Tự chọn học khu.",
          ja: "このブラウザは位置を渡せません。学区は自分で選んでください。",
        }),
      );
      return;
    }
    setBusy(true);
    setNote("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(false);
        const hit = districtAt(pos.coords.longitude, pos.coords.latitude);
        if (!hit) {
          setNote(
            tr(lang, {
              en: "That spot is outside the districts around Eugene. Pick yours if you know it. The location stays on this device.",
              zh: "当前位置不在已收录的学区范围内，请手动选择。定位仅用于本地匹配，不会上传。",
              es: "Ese punto está fuera de los distritos cerca de Eugene. Elige el tuyo si lo sabes. La ubicación se queda en este aparato.",
              ko: "그 위치는 유진 근처 학구 밖이에요. 알면 직접 고르세요. 위치는 이 기기에만 있고 올라가지 않아요.",
              vi: "Vị trí đó nằm ngoài các học khu quanh Eugene. Biết thì tự chọn. Vị trí chỉ ở trên máy này, không gửi đi.",
              ja: "その位置はユージン周辺の学区の外です。分かるなら自分で選んでください。位置はこの端末だけに残り、送りません。",
            }),
          );
          return;
        }
        setDistrict(hit.id);
        setNote(
          tr(lang, {
            en: `This is where you are standing: ${hit.en}. A district follows the home address, so it can be wrong if you are not home. The location stays on this device.`,
            zh: `根据当前位置，可能属于${hit.zh}。学区以居住地址为准，若你不在家，请手动确认。定位仅用于本地匹配，不会上传。`,
            es: `Según donde estás parado: ${hit.en}. El distrito sigue la dirección de casa, así que puede fallar si no estás en casa. La ubicación se queda en este aparato.`,
            ko: `지금 서 있는 곳으로는 ${hit.en}예요. 학구는 집 주소로 정해져서, 집이 아니면 틀릴 수 있어요. 위치는 이 기기에만 있고 올라가지 않아요.`,
            vi: `Theo chỗ bạn đang đứng: ${hit.en}. Học khu tính theo địa chỉ nhà, không ở nhà thì có thể sai. Vị trí chỉ ở trên máy này, không gửi đi.`,
            ja: `今立っている場所だと ${hit.en} です。学区は家の住所で決まるので、家にいないと違うことがあります。位置はこの端末だけに残り、送りません。`,
          }),
        );
      },
      () => {
        setBusy(false);
        setNote(
          tr(lang, {
            en: "No location came back. Pick the district yourself.",
            zh: "暂时无法获取位置，请手动选择学区。",
            es: "No llegó la ubicación. Elige el distrito tú.",
            ko: "위치를 받지 못했어요. 학구를 직접 고르세요.",
            vi: "Không lấy được vị trí. Tự chọn học khu.",
            ja: "位置が取れませんでした。学区は自分で選んでください。",
          }),
        );
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 120_000 },
    );
  }

  const picked = district ? DISTRICTS.find((item) => item.id === district) : null;
  const mismatch = picked && picked.id !== "4j";
  const summary = picked
    ? tr(lang, districtCopy(picked.id))
    : tr(lang, {
        en: "District",
        zh: "学区",
        es: "Distrito",
        ko: "학구",
        vi: "Học khu",
        ja: "学区",
      });

  if (compact) {
    return (
      <div className="min-w-0 sm:max-w-[16rem] sm:shrink-0">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex min-h-9 w-full items-center justify-between gap-2 rounded-md border border-line bg-card px-2.5 text-left text-xs text-ink shadow-sm md:min-h-10",
            open && "border-moss",
          )}
        >
          <span className="truncate font-medium">{summary}</span>
          <span className="shrink-0 text-muted">{open ? "▴" : "▾"}</span>
        </button>
        {open ? (
          <div className="mt-1.5 space-y-1.5 rounded-md border border-line bg-card p-2 shadow-paper">
            <label className="block">
              <span className="sr-only">
                {tr(lang, {
                  en: "District",
                  zh: "学区",
                  es: "Distrito",
                  ko: "학구",
                  vi: "Học khu",
                  ja: "学区",
                })}
              </span>
              <select
                value={district ?? ""}
                onChange={(event) => {
                  const next = event.target.value;
                  setDistrict(isDistrict(next) ? next : null);
                  setNote("");
                }}
                className="min-h-10 w-full rounded-md border border-line bg-paper px-2 text-sm text-ink"
              >
                <option value="">
                  {tr(lang, {
                    en: "Not set",
                    zh: "还没选",
                    es: "Sin elegir",
                    ko: "아직 안 골랐어요",
                    vi: "Chưa chọn",
                    ja: "未選択",
                  })}
                </option>
                {DISTRICTS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {tr(lang, districtCopy(item.id))}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={locate}
              disabled={busy}
              className="min-h-10 w-full rounded-md border border-line bg-paper px-2 text-sm text-ink disabled:opacity-50"
            >
              {busy
                ? tr(lang, {
                    en: "Locating…",
                    zh: "正在定位…",
                    es: "Buscando…",
                    ko: "위치 찾는 중…",
                    vi: "Đang định vị…",
                    ja: "位置を確認中…",
                  })
                : tr(lang, {
                    en: "Use my location",
                    zh: "根据位置查找",
                    es: "Usar ubicación",
                    ko: "위치로 찾기",
                    vi: "Dùng vị trí",
                    ja: "位置で見る",
                  })}
            </button>
            {note ? <p className="text-xs text-muted">{note}</p> : null}
            {mismatch && picked ? (
              <p className="text-xs text-muted">
                {tr(lang, {
                  en: `No ${picked.en} dates are stored here. Use the district site for the official calendar.`,
                  zh: `这里没有收录 ${picked.zh} 的校历日期，请到学区官网查看。`,
                  es: `Aquí no hay fechas de ${picked.en}. Usa el sitio del distrito para el calendario oficial.`,
                  ko: `여기에는 ${picked.en} 학사일정이 없어요. 학군 공식 사이트를 확인하세요.`,
                  vi: `Không có lịch của ${picked.en} tại đây. Hãy xem trang chính thức của học khu.`,
                  ja: `${picked.en} の日程はここにありません。学区の公式サイトをご確認ください。`,
                })}{" "}
                {picked.href ? (
                  <a
                    href={picked.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-moss underline"
                  >
                    {tr(lang, {
                      en: "District site",
                      zh: "学区网站",
                      es: "Su sitio",
                      ko: "그 학구 사이트",
                      vi: "Trang của họ",
                      ja: "その学区のサイト",
                    })}
                  </a>
                ) : null}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-3 pb-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">
            {tr(lang, {
              en: "District",
              zh: "学区",
              es: "Distrito",
              ko: "학구",
              vi: "Học khu",
              ja: "学区",
            })}
          </span>
          <select
            value={district ?? ""}
            onChange={(event) => {
              const next = event.target.value;
              setDistrict(isDistrict(next) ? next : null);
              setNote("");
            }}
            className="min-h-11 w-full rounded-md border border-line bg-card px-3 text-sm text-ink"
          >
            <option value="">
              {tr(lang, {
                en: "No district yet",
                zh: "还没选学区",
                es: "Distrito sin elegir",
                ko: "학구를 아직 안 골랐어요",
                vi: "Chưa chọn học khu",
                ja: "学区はまだ選んでいません",
              })}
            </option>
            {DISTRICTS.map((item) => (
              <option key={item.id} value={item.id}>
                {tr(lang, districtCopy(item.id))}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={locate}
          disabled={busy}
          className="min-h-11 shrink-0 rounded-md border border-line bg-card px-3 text-sm text-ink disabled:opacity-50"
        >
          {busy
            ? tr(lang, {
                en: "Locating…",
                zh: "正在定位…",
                es: "Buscando…",
                ko: "위치 찾는 중…",
                vi: "Đang định vị…",
                ja: "位置を確認中…",
              })
            : tr(lang, {
                en: "Use my location",
                zh: "根据位置查找",
                es: "Usar ubicación",
                ko: "위치로 찾기",
                vi: "Dùng vị trí",
                ja: "位置で見る",
              })}
        </button>
      </div>
      {note ? <p className="mt-1 text-sm text-muted">{note}</p> : null}
      {mismatch && picked ? (
        <p className="mt-1 text-sm text-muted">
          {tr(lang, {
            en: `No ${picked.en} dates are stored here. Use the district site for the official calendar.`,
            zh: `这里没有收录 ${picked.zh} 的校历日期，请到学区官网查看。`,
            es: `Aquí no hay fechas de ${picked.en}. Usa el sitio del distrito para el calendario oficial.`,
            ko: `여기에는 ${picked.en} 학사일정이 없어요. 학군 공식 사이트를 확인하세요.`,
            vi: `Không có lịch của ${picked.en} tại đây. Hãy xem trang chính thức của học khu.`,
            ja: `${picked.en} の日程はここにありません。学区の公式サイトをご確認ください。`,
          })}{" "}
          {picked.href ? (
            <a
              href={picked.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-moss underline"
            >
              {tr(lang, {
                en: "District site",
                zh: "查看学区官网",
                es: "Su sitio",
                ko: "그 학구 사이트",
                vi: "Trang của họ",
                ja: "その学区のサイト",
              })}
            </a>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
