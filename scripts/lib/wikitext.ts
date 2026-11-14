// Converts the wikitext stored in the wiki's Cargo tables into plain text.

// cspell:words wikitext nbsp zwj zwnj apos

/**
 * The wiki marks version-specific text with a DLC indicator image, e.g.:
 *
 * ```text
 * [[File:Dlc nr indicator.png|link=|class=dlc cf-tag cf-val-7 |alt=(except in Repentance and Repentance+)|Removed in Repentance]]
 * ```
 *
 * The indicator applies to the text that follows it, up to the next indicator or line break.
 */
const DLC_INDICATOR_REGEX =
  /\[\[File:Dlc [^\]|]+ indicator\.png\|[^\]]*?alt=([^\]|]*)[^\]]*]]/g;

const DLC_INDICATOR_PLACEHOLDER = "\u0000";
const LINE_BREAK_PLACEHOLDER = "\u0001";

/** Whether text tagged with this indicator `alt` text applies to Repentance+. */
function appliesToRepentancePlus(alt: string): boolean {
  const mentionsRepentancePlus = alt.includes("Repentance+");
  if (alt.startsWith("(in ")) {
    return mentionsRepentancePlus;
  }
  if (alt.startsWith("(except in ")) {
    return !mentionsRepentancePlus;
  }

  throw new Error(`Unknown DLC indicator: ${alt}`);
}

const NAMED_ENTITIES: ReadonlyMap<string, string> = new Map([
  ["amp", "&"],
  ["apos", "'"],
  ["gt", ">"],
  ["lt", "<"],
  ["nbsp", " "],
  ["quot", '"'],
  ["zwj", ""],
  ["zwnj", ""],
]);

function decodeHTMLEntities(text: string): string {
  return text.replaceAll(
    /&(#x[\da-f]+|#\d+|[a-z]+);/gi,
    (match, entity: string) => {
      if (entity.startsWith("#x") || entity.startsWith("#X")) {
        return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
      }
      if (entity.startsWith("#")) {
        return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
      }
      return NAMED_ENTITIES.get(entity.toLowerCase()) ?? match;
    },
  );
}

/** Zero-width space, zero-width non-joiner and zero-width joiner. */
const ZERO_WIDTH_CHARACTERS_REGEX = /[\u200B-\u200D]/g;

/** Collapses whitespace, normalizes non-breaking spaces and tidies up spacing near punctuation. */
function normalizeWhitespace(text: string): string {
  return text
    .replaceAll(ZERO_WIDTH_CHARACTERS_REGEX, "")
    .replaceAll(/\s+/g, " ")
    .replaceAll(/\(\s+/g, "(")
    .replaceAll(/\s+([),.:;])/g, "$1")
    .trim();
}

/** Removes the parts of the text that do not apply to Repentance+. */
function filterVersionSpecificText(text: string): string {
  const indicators: string[] = [];
  const marked = text.replaceAll(DLC_INDICATOR_REGEX, (_match, alt: string) => {
    indicators.push(alt);
    return DLC_INDICATOR_PLACEHOLDER;
  });

  const lines = marked.split(LINE_BREAK_PLACEHOLDER);
  const keptLines: string[] = [];
  let indicatorIndex = 0;
  for (const line of lines) {
    const segments = line.split(DLC_INDICATOR_PLACEHOLDER);
    let keptLine = segments[0] ?? "";
    for (const segment of segments.slice(1)) {
      const alt = indicators[indicatorIndex];
      indicatorIndex++;
      if (alt === undefined) {
        throw new Error("DLC indicator count mismatch.");
      }
      if (appliesToRepentancePlus(alt)) {
        keptLine += segment;
      }
    }
    if (keptLine.trim() !== "") {
      keptLines.push(keptLine);
    }
  }

  return keptLines.join(LINE_BREAK_PLACEHOLDER);
}

/**
 * The wiki marks lines that only apply to console versions with platform tags, e.g.:
 *
 * ```html
 * <span class="plat plat-Switch cf-skip" title="Nintendo Switch edition only">Switch</span>
 * ```
 *
 * The save viewer is for the PC version, so lines tagged only with other platforms are removed.
 */
const PLATFORM_TAG_REGEX =
  /<span class="plat plat-([^\s"]+)[^"]*"[^>]*>.*?<\/span>/g;

function filterPlatformSpecificLines(text: string): string {
  return text
    .split(LINE_BREAK_PLACEHOLDER)
    .filter((line) => {
      const platforms = [...line.matchAll(PLATFORM_TAG_REGEX)].map(
        (match) => match[1],
      );
      return platforms.length === 0 || platforms.includes("PC");
    })
    .map((line) => line.replaceAll(PLATFORM_TAG_REGEX, ""))
    .join(LINE_BREAK_PLACEHOLDER);
}

/** Removes closing parentheses that have no matching opening parenthesis. */
function removeUnmatchedClosingParentheses(text: string): string {
  let depth = 0;
  let result = "";
  for (const character of text) {
    if (character === "(") {
      depth++;
    } else if (character === ")") {
      if (depth === 0) {
        continue;
      }
      depth--;
    }
    result += character;
  }
  return result;
}

/**
 * Converts wikitext to plain text.
 *
 * @param wikitext The wikitext to convert.
 * @param lineSeparator The string that replaces `<br>` tags.
 */
export function wikitextToPlainText(
  wikitext: string,
  lineSeparator = " ",
): string {
  let text = wikitext.replaceAll(/<br\s*\/?>/gi, LINE_BREAK_PLACEHOLDER);
  text = filterVersionSpecificText(text);
  text = filterPlatformSpecificLines(text);

  text = text
    // Remove images: [[File:...]]
    .replaceAll(/\[\[File:[^\]]*]]/g, "")
    // Links: [[:Target|Label]], [[Target|Label]], [[Target]]
    .replaceAll(/\[\[:?([^\]|]*)\|([^\]]*)]]/g, "$2")
    .replaceAll(/\[\[:?([^\]|]*)]]/g, "$1")
    // Bold and italics.
    .replaceAll(/'{2,}/g, "")
    // HTML tags.
    .replaceAll(/<[^>]*>/g, "");

  if (/\[\[|]]|{{|}}/.test(text)) {
    throw new Error(`Unconverted wikitext remains: ${text}`);
  }

  text = decodeHTMLEntities(text);

  return text
    .split(LINE_BREAK_PLACEHOLDER)
    .map((line) => normalizeWhitespace(removeUnmatchedClosingParentheses(line)))
    .filter((line) => line !== "")
    .join(lineSeparator);
}

function encodeSlugPart(part: string): string {
  return encodeURIComponent(part.replaceAll(" ", "_")).replaceAll("'", "%27");
}

/** Converts a wiki page name (optionally with a `#fragment`) into a URL path slug. */
export function pageNameToSlug(pageName: string): string {
  const [page = "", ...fragmentParts] = pageName.trim().split("#");
  const encode = encodeSlugPart;
  const fragment = fragmentParts.join("#");
  return fragment === "" ? encode(page) : `${encode(page)}#${encode(fragment)}`;
}
