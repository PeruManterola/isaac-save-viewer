// A small, polite client for the wiki.gg MediaWiki API.

// cspell:words cargoquery formatversion imageinfo iiprop

const API_URL = "https://bindingofisaacrebirth.wiki.gg/api.php";

/** A generic User-Agent that does not identify anyone. */
const USER_AGENT = "isaac-save-viewer-data-script";

/** The delay between consecutive requests, in milliseconds. */
const REQUEST_DELAY_MS = 1000;

let lastRequestTime = 0;

async function throttle() {
  const elapsed = Date.now() - lastRequestTime;
  if (elapsed < REQUEST_DELAY_MS) {
    await new Promise((resolve) => {
      setTimeout(resolve, REQUEST_DELAY_MS - elapsed);
    });
  }
  lastRequestTime = Date.now();
}

/** Performs one request at a time, with a delay between requests. */
export async function politeFetch(url: string): Promise<Response> {
  await throttle();
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
    },
  });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}: ${url}`);
  }
  return response;
}

async function apiRequest(
  params: Readonly<Record<string, string>>,
): Promise<unknown> {
  const url = new URL(API_URL);
  for (const [key, value] of Object.entries({
    ...params,
    format: "json",
    formatversion: "2",
  })) {
    url.searchParams.set(key, value);
  }

  const response = await politeFetch(url.toString());
  const json = await response.json();
  if (typeof json === "object" && json !== null && "error" in json) {
    throw new Error(`API error: ${JSON.stringify(json.error)}`);
  }
  return json;
}

const CARGO_PAGE_SIZE = 500;

/** Runs a Cargo query and returns every row, following pagination. */
export async function cargoQuery(
  table: string,
  fields: readonly string[],
  orderBy: string,
): Promise<ReadonlyArray<Readonly<Record<string, string>>>> {
  const rows: Array<Readonly<Record<string, string>>> = [];

  for (let offset = 0; ; offset += CARGO_PAGE_SIZE) {
    // eslint-disable-next-line no-await-in-loop
    const json = (await apiRequest({
      action: "cargoquery",
      tables: table,
      fields: fields.join(","),
      order_by: orderBy,
      limit: CARGO_PAGE_SIZE.toString(),
      offset: offset.toString(),
    })) as { cargoquery?: Array<{ title: Record<string, string> }> };

    const page = json.cargoquery ?? [];
    rows.push(...page.map((row) => row.title));
    if (page.length < CARGO_PAGE_SIZE) {
      return rows;
    }
  }
}

/** Returns the direct download URL of each given file (without the "File:" prefix). */
export async function getImageURLs(
  fileNames: readonly string[],
): Promise<ReadonlyMap<string, string>> {
  const urls = new Map<string, string>();
  const batchSize = 50;

  for (let i = 0; i < fileNames.length; i += batchSize) {
    const batch = fileNames.slice(i, i + batchSize);
    // eslint-disable-next-line no-await-in-loop
    const json = (await apiRequest({
      action: "query",
      titles: batch.map((fileName) => `File:${fileName}`).join("|"),
      prop: "imageinfo",
      iiprop: "url",
    })) as {
      query?: {
        normalized?: Array<{ from: string; to: string }>;
        pages?: Array<{ title: string; imageinfo?: Array<{ url: string }> }>;
      };
    };

    const normalizedToOriginal = new Map<string, string>();
    for (const { from, to } of json.query?.normalized ?? []) {
      normalizedToOriginal.set(to, from);
    }

    for (const page of json.query?.pages ?? []) {
      const url = page.imageinfo?.[0]?.url;
      if (url === undefined) {
        continue;
      }
      const title = normalizedToOriginal.get(page.title) ?? page.title;
      urls.set(title.replace(/^File:/, ""), url);
    }
  }

  return urls;
}

/** Downloads a file and returns its contents. */
export async function download(url: string): Promise<Buffer> {
  const response = await politeFetch(url);
  return Buffer.from(await response.arrayBuffer());
}
