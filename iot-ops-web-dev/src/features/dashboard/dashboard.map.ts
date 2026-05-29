export const MAP_SOURCES = ['/maps/china.json', 'maps/china.json', './maps/china.json'];

export const DEFAULT_MAP_ZOOM = {
  center: [104.114129, 37.550339] as [number, number],
  zoom: 1.2,
};

async function loadGeoJson(url: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data?.type) {
      throw new Error(`Invalid map payload from ${url}`);
    }

    return data;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function tryLoadMap(urls: string[]) {
  let lastError = 'Unknown error';

  for (const url of urls) {
    try {
      return await loadGeoJson(url);
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  throw new Error(lastError);
}
