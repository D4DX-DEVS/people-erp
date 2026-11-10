const crypto = require('crypto');
const axios = require('axios');

/**
 * Easebuzz Payment Gateway — hosted checkout.
 * Docs: https://docs.easebuzz.in/docs/payment-gateway/8ec545c331e6f-initiate-payment-api
 *
 * Flow: initiateLink (server-to-server) → access key → donor is sent to
 * /pay/<access key> → Easebuzz form-posts the result to surl/furl and also
 * calls the dashboard webhook → we verify the reverse hash, and fall back to
 * the Transaction API for anything still unresolved.
 *
 * Environment:
 *   EASEBUZZ_KEY        merchant key
 *   EASEBUZZ_SALT       merchant salt (secret — never sent to the browser)
 *   EASEBUZZ_ENV        'test' (default) or 'prod'
 *   EASEBUZZ_FRANCHISES comma-separated franchise slugs allowed to take
 *                       payments into this merchant account, e.g. 'people'
 */

const URLS = {
  test: { pay: 'https://testpay.easebuzz.in', dashboard: 'https://testdashboard.easebuzz.in' },
  prod: { pay: 'https://pay.easebuzz.in', dashboard: 'https://dashboard.easebuzz.in' },
};

function getConfig() {
  const env = (process.env.EASEBUZZ_ENV || '').trim().toLowerCase() === 'prod' ? 'prod' : 'test';
  return {
    key: (process.env.EASEBUZZ_KEY || '').trim(),
    salt: (process.env.EASEBUZZ_SALT || '').trim(),
    env,
    urls: URLS[env],
    franchises: (process.env.EASEBUZZ_FRANCHISES || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  };
}

/** One merchant account serves the franchises listed in EASEBUZZ_FRANCHISES only. */
function isEnabledFor(franchise) {
  const { key, salt, franchises } = getConfig();
  return !!(key && salt && franchise?.slug && franchises.includes(String(franchise.slug).toLowerCase()));
}

const sha512 = (value) => crypto.createHash('sha512').update(value).digest('hex');

const udfs = (p, order) => order.map((n) => p[`udf${n}`] || '');
const UDF_ASC = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const UDF_DESC = [...UDF_ASC].reverse();

// key|txnid|amount|productinfo|firstname|email|udf1..udf10|salt
function initiateHash(p, salt) {
  return sha512([p.key, p.txnid, p.amount, p.productinfo, p.firstname, p.email, ...udfs(p, UDF_ASC), salt].join('|'));
}

// Reverse hash: salt|status|udf10..udf1|email|firstname|productinfo|amount|txnid|key
function responseHash(r, salt) {
  return sha512([
    salt, r.status || '', ...udfs(r, UDF_DESC),
    r.email || '', r.firstname || '', r.productinfo || '', r.amount || '', r.txnid || '', r.key || '',
  ].join('|'));
}

/** True when a surl/furl/webhook/Transaction API payload is genuinely from Easebuzz. */
function verifyResponse(r) {
  const { key, salt } = getConfig();
  if (!r?.hash || !key || !salt || r.key !== key) return false;
  const expected = Buffer.from(responseHash(r, salt));
  const received = Buffer.from(String(r.hash).toLowerCase());
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

async function postForm(url, params) {
  const { data } = await axios.post(url, new URLSearchParams(params).toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    timeout: 30000,
  });
  return typeof data === 'string' ? JSON.parse(data) : data;
}

/**
 * Create the payment request. `fields` holds txnid, amount (string, 2 dp),
 * productinfo, firstname, email, phone, surl, furl.
 */
async function initiatePayment(fields) {
  const { key, salt, urls } = getConfig();
  const params = { key, ...fields };
  params.hash = initiateHash(params, salt);

  const res = await postForm(`${urls.pay}/payment/initiateLink`, params);
  if (res?.status !== 1 || !res.data) {
    throw new Error(res?.error_desc || (typeof res?.data === 'string' && res.data) || 'Easebuzz rejected the payment request');
  }
  return { accessKey: res.data, checkoutUrl: `${urls.pay}/pay/${encodeURIComponent(res.data)}` };
}

/**
 * Transaction API v2.1 — the attempts Easebuzz holds for a txnid. Returns the
 * successful attempt if there is one, else the latest; null when none verify.
 */
async function retrieveTransaction(txnid) {
  const { key, salt, urls } = getConfig();
  const res = await postForm(`${urls.dashboard}/transaction/v2.1/retrieve`, {
    key,
    txnid,
    hash: sha512(`${key}|${txnid}|${salt}`),
  });
  const attempts = (Array.isArray(res?.msg) ? res.msg : []).filter(verifyResponse);
  return attempts.find((a) => a.status === 'success') || attempts[attempts.length - 1] || null;
}

module.exports = {
  getConfig,
  isEnabledFor,
  verifyResponse,
  initiatePayment,
  retrieveTransaction,
  // exported for tests
  initiateHash,
  responseHash,
};
