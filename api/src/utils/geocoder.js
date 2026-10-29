const axios = require('axios');

/**
 * Place search for the project location maps, backed by OpenStreetMap
 * Nominatim. Calls go through the API rather than the browser so we can send
 * the identifying User-Agent Nominatim's usage policy asks for, keep to its
 * one-request-per-second limit across every admin, and cache repeat lookups.
 * https://operations.osmfoundation.org/policies/nominatim/
 */

const NOMINATIM_URL = process.env.GEOCODER_URL || 'https://nominatim.openstreetmap.org';
const USER_AGENT = process.env.GEOCODER_USER_AGENT || 'PeoplesFoundationERP/1.0 (project location maps)';

// Kerala's bounding box (west, north, east, south) with a little sea margin.
const KERALA_VIEWBOX = '74.70,12.95,77.60,8.10';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 500;
const cache = new Map();

function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

function cacheSet(key, value) {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(key, { at: Date.now(), value });
}

// Upstream calls are chained so they leave at least a second apart.
let queue = Promise.resolve();
let lastCall = 0;
function throttled(fn) {
  const run = queue.then(async () => {
    const wait = lastCall + 1100 - Date.now();
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    lastCall = Date.now();
    return fn();
  });
  queue = run.catch(() => {});
  return run;
}

async function nominatim(path, params) {
  const key = `${path}?${new URLSearchParams(params)}`;
  const cached = cacheGet(key);
  if (cached) return cached;
  const request = () => throttled(() => axios.get(`${NOMINATIM_URL}${path}`, {
    params: { format: 'jsonv2', addressdetails: 1, 'accept-language': 'en', ...params },
    headers: { 'User-Agent': USER_AGENT },
    timeout: 8000
  }));
  // One retry on a network failure/timeout (a cold connection occasionally
  // stalls); an HTTP error from Nominatim itself is not retried.
  const { data } = await request().catch((err) => {
    if (err.response) throw err;
    return request();
  });
  cacheSet(key, data);
  return data;
}

/** Nominatim result → the small shape the map editor works with. */
function toPlace(r) {
  const a = r.address || {};
  const name = r.name
    || a.village || a.town || a.city || a.suburb || a.hamlet || a.municipality
    || String(r.display_name || '').split(',')[0];
  return {
    name: String(name || '').trim(),
    address: String(r.display_name || ''),
    lat: Number(r.lat),
    lng: Number(r.lon),
    type: String(r.addresstype || r.type || ''),
    district: String(a.state_district || a.county || '').replace(/\s+district$/i, ''),
    state: String(a.state || '')
  };
}

/** Search places in India; `region: 'kerala'` keeps results inside Kerala. */
async function searchPlaces(query, region) {
  const params = { q: query, countrycodes: 'in', limit: 8 };
  if (region === 'kerala') Object.assign(params, { viewbox: KERALA_VIEWBOX, bounded: 1 });
  const results = await nominatim('/search', params);
  return (Array.isArray(results) ? results : [])
    .map(toPlace)
    .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng));
}

/** Name the place at a point (used when the admin drops a pin on the map). */
async function reversePlace(lat, lng) {
  const result = await nominatim('/reverse', { lat, lon: lng, zoom: 14 });
  if (!result || result.error) return null;
  return toPlace(result);
}

module.exports = { searchPlaces, reversePlace };
