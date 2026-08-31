import type { RequestParameters, StyleSpecification } from 'maplibre-gl';

const sessions: Record<string, string | Promise<void>> = {};

export async function googleProtocol(params: RequestParameters, abortController?: AbortController) {
  const url = new URL(params.url.replace('google://', 'https://'));
  const sessionKey = `${url.hostname}?${url.searchParams}`;
  const key = url.searchParams.get('key');

  let value = sessions[sessionKey];
  if (!value) {
    value = new Promise<void>(async (resolve) => {
      const mapType = url.hostname;
      const layerType = url.searchParams.get('layerType');
      const overlay = url.searchParams.get('overlay');

      const sessionRequest: Record<string, any> = {
        mapType,
        language: 'en-US',
        region: 'US',
        scale: 'scaleFactor2x',
        highDpi: true,
      };
      if (layerType) {
        sessionRequest.layerTypes = [layerType];
      }
      if (overlay) {
        sessionRequest.overlay = overlay === 'true';
      }

      const response = await fetch(`https://tile.googleapis.com/v1/createSession?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionRequest),
        signal: abortController?.signal,
      });
      const result = await response.json();
      sessions[sessionKey] = result.session;
      resolve();
    });
    sessions[sessionKey] = value;
    await value;
  } else if (value instanceof Promise) {
    await value;
  }

  const session = sessions[sessionKey];
  const tile = await fetch(`https://tile.googleapis.com/v1/2dtiles${url.pathname}?session=${session}&key=${key}`, {
    signal: abortController?.signal,
  });
  const data = await tile.arrayBuffer();
  return { data };
}

export function createGoogleStyle(id: string, mapType: string, key: string): StyleSpecification {
  const style: StyleSpecification = {
    version: 8,
    sources: {
      [id]: {
        type: 'raster',
        tiles: [`google://${mapType}/{z}/{x}/{y}?key=${key}`],
        tileSize: 256,
        attribution: '&copy; Google Maps',
        maxzoom: 19,
      },
    },
    layers: [
      {
        id,
        type: 'raster',
        source: id,
      },
    ],
  };
  return style;
}
