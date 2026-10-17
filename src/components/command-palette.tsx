import { Command } from "cmdk";
import { useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useNavigate } from "@tanstack/react-router";
import { ArrowUpRight, CalendarDays, Compass, Languages, MapPin, Search } from "lucide-react";
import { places, forLevel, areaName } from "@/data/places";
import { ALL_QUICK_LINKS } from "@/data/quick-links";
import { LEVELS } from "@/lib/levels";
import { useDesk, useLang } from "@/lib/store";
import { LANGS, tr } from "@/lib/text";
import { deskText as c, type DeskCopyKey } from "@/lib/desk-copy";
import { liveDeadlines } from "@/lib/calendar";
import { eugeneClock, formatWhen } from "@/lib/time";
import { useClock } from "@/lib/use-clock";
import { placeSelectionSearch } from "@/lib/place-search-state";

const PAGES = [
  { to: "/", key: "today" },
  { to: "/campus", key: "campus" },
  { to: "/town", key: "town" },
  { to: "/guide", key: "guide" },
  { to: "/gpa", key: "gpa" },
] as const satisfies readonly { to: string; key: DeskCopyKey }[];

/** Loaded on first ⌘K / Ctrl+K or button press (see shell.tsx); not in the first-load bundle. */
export default function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const lang = useLang();
  const level = useDesk((s) => s.level);
  const district = useDesk((s) => s.district);
  const setLang = useDesk((s) => s.setLang);
  const setLevel = useDesk((s) => s.setLevel);
  const navigate = useNavigate();
  const opener = useRef<HTMLElement | null>(null);
  const now = useClock();
  const clock = now ? eugeneClock(now) : null;
  const dates = clock ? liveDeadlines(level, district, clock) : [];
  // Only places the target page actually lists for this school level
  // (K–12 /campus shows school info instead of the place list).
  const shownPlaces = places.filter(
    (place) => forLevel(place, level) && (place.page === "town" || level === "uni"),
  );
  const pageLabel = (key: DeskCopyKey) =>
    c(lang, key === "campus" && level !== "uni" ? "schools" : key);

  const run = (action: () => void) => {
    onOpenChange(false);
    action();
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="palette-overlay" cmdk-overlay="" />
        <Dialog.Content
          className="palette-content"
          cmdk-dialog=""
          aria-describedby={undefined}
          onOpenAutoFocus={() => {
            opener.current =
              document.activeElement instanceof HTMLElement ? document.activeElement : null;
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (opener.current?.isConnected) opener.current.focus();
          }}
        >
          <Command label={c(lang, "paletteOpen")} className="palette">
            {/*
        Explicit title for the dialog: Radix labels the content with
        aria-labelledby when a Title exists, which is the shape assistive
        technology and audits expect. `asChild` keeps it a span so no extra
        heading enters the document outline, and `sr-only` keeps it off screen.
        cmdk's own hidden label still names the input.
      */}
            <Dialog.Title asChild>
              <span className="sr-only">{c(lang, "paletteOpen")}</span>
            </Dialog.Title>
            <div className="palette-input">
              <Search size={18} aria-hidden="true" />
              <Command.Input placeholder={c(lang, "palettePlaceholder")} />
            </div>
            <Command.List className="palette-list">
              <Command.Empty className="palette-empty">{c(lang, "paletteEmpty")}</Command.Empty>
              <Command.Group heading={c(lang, "palettePages")}>
                {PAGES.map((page) => (
                  <Command.Item
                    key={page.to}
                    value={`page:${page.to}`}
                    keywords={[pageLabel(page.key), c("en", page.key), page.to]}
                    onSelect={() => run(() => void navigate({ to: page.to }))}
                  >
                    <Compass size={16} aria-hidden="true" />
                    {pageLabel(page.key)}
                  </Command.Item>
                ))}
              </Command.Group>
              <Command.Group heading={c(lang, "palettePlaces")}>
                {shownPlaces.map((place) => (
                  <Command.Item
                    key={place.id}
                    value={`place:${place.id}`}
                    keywords={[
                      place.name,
                      tr(lang, place.blurb),
                      // The town/campus pages filter by area name too ("downtown", "市中心"),
                      // so the palette has to match the same words.
                      tr(lang, areaName[place.area]),
                      areaName[place.area].en,
                    ]}
                    onSelect={() =>
                      run(
                        () =>
                          void navigate({
                            to: `/${place.page}`,
                            search: placeSelectionSearch(place.name),
                          }),
                      )
                    }
                  >
                    <MapPin size={16} aria-hidden="true" />
                    <span>{place.name}</span>
                    <small>{pageLabel(place.page === "campus" ? "campus" : "town")}</small>
                  </Command.Item>
                ))}
              </Command.Group>
              {dates.length > 0 && clock && (
                <Command.Group heading={c(lang, "paletteDates")}>
                  {dates.map((item) => (
                    <Command.Item
                      key={item.id}
                      value={`date:${item.id}`}
                      keywords={[tr(lang, item.title), item.title.en, item.ymd]}
                      onSelect={() => run(() => void navigate({ to: "/guide" }))}
                    >
                      <CalendarDays size={16} aria-hidden="true" />
                      <span>{tr(lang, item.title)}</span>
                      <small>{formatWhen(item.ymd, clock.ymd, lang)}</small>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
              <Command.Group heading={c(lang, "paletteSettings")}>
                {LANGS.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={`lang:${item.id}`}
                    keywords={[item.label, c(lang, "language"), c("en", "language")]}
                    onSelect={() => run(() => setLang(item.id))}
                  >
                    <Languages size={16} aria-hidden="true" />
                    <span>{item.label}</span>
                    <small>{c(lang, "language")}</small>
                  </Command.Item>
                ))}
                {LEVELS.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={`level:${item.id}`}
                    keywords={[tr(lang, item), item.en, c(lang, "level")]}
                    onSelect={() => run(() => setLevel(item.id))}
                  >
                    <Compass size={16} aria-hidden="true" />
                    <span>{tr(lang, item)}</span>
                    <small>{c(lang, "level")}</small>
                  </Command.Item>
                ))}
              </Command.Group>
              <Command.Group heading={c(lang, "paletteLinks")}>
                {ALL_QUICK_LINKS.map((link) => (
                  <Command.Item
                    key={link.id}
                    value={`link:${link.id}`}
                    keywords={[tr(lang, link.label), link.label.en, link.href]}
                    onSelect={() =>
                      run(() => void window.open(link.href, "_blank", "noopener,noreferrer"))
                    }
                  >
                    <ArrowUpRight size={16} aria-hidden="true" />
                    <span>{tr(lang, link.label)}</span>
                    <small>{new URL(link.href).hostname.replace(/^www\./, "")}</small>
                  </Command.Item>
                ))}
              </Command.Group>
            </Command.List>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
