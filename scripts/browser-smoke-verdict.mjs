import { createHash } from "node:crypto";
export function normalizeBodyText(text) {
  return String(text ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizedBodyTextHash(text) {
  return createHash("sha256").update(normalizeBodyText(text)).digest("hex");
}

const IDENTITY_PREFIX_LEN = 64;

export function bodyTextPrefix(text) {
  return normalizeBodyText(text).slice(0, IDENTITY_PREFIX_LEN);
}
/**
 * Opt-outs for the content checks, for pages where the "problem" is intended:
 * --allow-blank (a page with no text and no canvas), --allow-overflow (a page that
 * scrolls sideways on purpose), --allow-change (a deliberate redesign that diverges
 * seriously from the baseline). Without them those cases fail the run (exit 3 / 4).
 */
const ALLOW_FLAGS = {
  "--allow-blank": "blank",
  "--allow-overflow": "overflow",
  "--allow-change": "change",
};

export function parseSmokeArgs(argv, env = {}) {
  const positional = [];
  let baseline = env.BROWSER_SMOKE_BASELINE || "";
  const allow = { blank: false, overflow: false, change: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (Object.hasOwn(ALLOW_FLAGS, arg)) {
      allow[ALLOW_FLAGS[arg]] = true;
    } else if (arg === "--baseline") {
      const value = argv[++i];
      if (!value) return { error: "--baseline requires a path to a prior verdict JSON" };
      baseline = value;
    } else if (arg.startsWith("--baseline=")) {
      const value = arg.slice("--baseline=".length);
      if (!value) return { error: "--baseline requires a path to a prior verdict JSON" };
      baseline = value;
    } else if (arg.startsWith("--")) {
      return { error: `unknown flag: ${arg}` };
    } else {
      positional.push(arg);
    }
  }
  return {
    url: positional[0] || "http://127.0.0.1:8080/",
    outPng: positional[1] || "/workspace/screenshots/app-builder-preview.png",
    baseline,
    allow,
  };
}
export function derivedPaths(outPng) {
  const base = outPng.replace(/\.png$/i, "");
  return { mobilePng: `${base}-mobile.png`, verdictJson: `${base}.json` };
}

const TRIVIAL_LEN_DELTA = 20;
const TRIVIAL_LEN_RATIO = 0.1;
const COLLAPSE_RATIO = 0.5;
/**
 * Baseline reasons that mean the page broke rather than changed: a different HTTP
 * status, a lost canvas, new sideways overflow, new errors or collapsed text. Title and
 * same-size text changes are ordinary edits and only reported. Severe divergence fails
 * the run unless --allow-change says the change is intended.
 */
const SEVERE_PATTERNS = [
  /HTTP status changed/,
  /canvas disappeared/,
  /horizontal overflow appeared/,
  /console\/page errors appeared/,
  /body text collapsed/,
  /^current verdict has no viewport data$/,
  /^baseline unreadable/,
];

export function isSevereReason(reason) {
  return SEVERE_PATTERNS.some((pattern) => pattern.test(reason));
}

export function compareToBaseline(current, baseline) {
  const entries = Object.entries(current?.viewports ?? {});
  if (entries.length === 0) {
    return {
      divergesFromBaseline: true,
      reasons: ["current verdict has no viewport data"],
      severe: true,
    };
  }
  const reasons = [];
  const baseViewports = baseline?.viewports ?? {};
  for (const [name, cur] of entries) {
    const base = baseViewports[name];
    if (!base) {
      reasons.push(`${name}: no baseline data for this viewport`);
      continue;
    }
    if (cur.status !== base.status) {
      reasons.push(`${name}: HTTP status changed ${base.status} -> ${cur.status}`);
    }
    if (base.title !== undefined && cur.title !== undefined && cur.title !== base.title) {
      reasons.push(`${name}: title changed ("${base.title}" -> "${cur.title}")`);
    }
    if (base.hasCanvas && !cur.hasCanvas) {
      reasons.push(`${name}: canvas disappeared`);
    }
    if (cur.horizontalOverflow && !base.horizontalOverflow) {
      reasons.push(`${name}: horizontal overflow appeared`);
    }
    const baseErrs = (base.consoleErrors?.length ?? 0) + (base.pageErrors?.length ?? 0);
    const curErrs = (cur.consoleErrors?.length ?? 0) + (cur.pageErrors?.length ?? 0);
    if (curErrs > 0 && baseErrs === 0) {
      reasons.push(`${name}: console/page errors appeared (${curErrs})`);
    }
    const baseLen = base.bodyTextLen ?? 0;
    const curLen = cur.bodyTextLen ?? 0;
    if (baseLen > 0 && curLen < baseLen * COLLAPSE_RATIO) {
      reasons.push(`${name}: body text collapsed (${baseLen} -> ${curLen} chars)`);
    } else if (cur.bodyTextHash !== base.bodyTextHash) {
      if (Math.abs(curLen - baseLen) > Math.max(TRIVIAL_LEN_DELTA, baseLen * TRIVIAL_LEN_RATIO)) {
        reasons.push(`${name}: body text changed (${baseLen} -> ${curLen} chars, hash mismatch)`);
      } else if (
        base.bodyTextPrefix !== undefined &&
        cur.bodyTextPrefix !== undefined &&
        cur.bodyTextPrefix !== base.bodyTextPrefix
      ) {
        reasons.push(`${name}: body text replaced (similar length, page start changed)`);
      }
    }
  }
  return {
    divergesFromBaseline: reasons.length > 0,
    reasons,
    severe: reasons.some(isSevereReason),
  };
}
export function baselineComparison(current, rawText) {
  let baseline;
  try {
    baseline = JSON.parse(rawText);
  } catch {
    return {
      divergesFromBaseline: true,
      reasons: ["baseline unreadable: invalid JSON"],
      severe: true,
    };
  }
  if (
    baseline === null ||
    typeof baseline !== "object" ||
    Array.isArray(baseline) ||
    baseline.viewports === null ||
    typeof baseline.viewports !== "object" ||
    Array.isArray(baseline.viewports)
  ) {
    return {
      divergesFromBaseline: true,
      reasons: ["baseline unreadable: not a verdict object"],
      severe: true,
    };
  }
  return compareToBaseline(current, baseline);
}
/** Fewer visible characters than this, with no canvas, is a blank page. */
export const MIN_VISIBLE_TEXT = 20;

/**
 * Content problems one viewport shows even with HTTP 200 and a clean console: a page
 * that should have content but is (nearly) empty, and page-level sideways overflow.
 * A canvas page (game, chart) may legitimately have no text, so it never counts as blank.
 */
export function viewportProblems(viewport, allow = {}) {
  const problems = [];
  const text = viewport?.bodyTextLen ?? 0;
  if (!allow.blank && !viewport?.hasCanvas && text < MIN_VISIBLE_TEXT) {
    problems.push(`blank page (${text} visible characters, no canvas)`);
  }
  if (!allow.overflow && viewport?.horizontalOverflow) {
    problems.push("page scrolls sideways (horizontal overflow)");
  }
  return problems;
}

/**
 * The run's exit code: 1 navigation failed, 2 console/page errors, 3 blank page or
 * page-level overflow, 4 serious divergence from the baseline, 0 clean. `options.allow`
 * comes from the --allow-* flags; `options.baseline` is the baseline comparison, if any.
 */
export function exitCodeFor(viewports, options = {}) {
  const list = Object.values(viewports ?? {});
  if (list.length === 0) return 1;
  if (list.some((v) => (v.status ?? 0) >= 400 || (v.status ?? 0) === 0)) return 1;
  if (list.some((v) => (v.consoleErrors?.length ?? 0) > 0 || (v.pageErrors?.length ?? 0) > 0)) {
    return 2;
  }
  const allow = options.allow ?? {};
  if (list.some((v) => viewportProblems(v, allow).length > 0)) return 3;
  if (options.baseline?.severe && !allow.change) return 4;
  return 0;
}
