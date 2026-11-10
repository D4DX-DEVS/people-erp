const config = require('../config/environment');

// CORS configuration — multi-franchise: accept any subdomain of BASE_DOMAIN
const BASE_DOMAIN = (process.env.BASE_DOMAIN || '').toLowerCase();

function isAllowedOrigin(origin) {
  if (!origin) return true; // server-to-server
  const h = origin.replace(/^https?:\/\//, '').split(':')[0].toLowerCase();
  // Exact matches from CORS_ORIGINS env list
  const explicitList = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(o => o.trim().replace(/^https?:\/\//, '').split(':')[0])
    : [];
  if (explicitList.includes(h)) return true;
  // Wildcard subdomain match for BASE_DOMAIN
  if (BASE_DOMAIN && (h === BASE_DOMAIN || h.endsWith(`.${BASE_DOMAIN}`))) return true;
  // Development: allow localhost variants
  if (config.NODE_ENV === 'development' && (h === 'localhost' || h.endsWith('.localhost'))) return true;
  return false;
}

module.exports = { isAllowedOrigin };
