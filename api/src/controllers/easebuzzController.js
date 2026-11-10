const crypto = require('crypto');
const { Donation } = require('../models');
const EasebuzzTransaction = require('../models/EasebuzzTransaction');
const easebuzz = require('../services/easebuzzService');
const ResponseHelper = require('../utils/responseHelper');
const { isAllowedOrigin } = require('../utils/allowedOrigin');
const config = require('../config/environment');

// Statuses that will not change again on their own — the status page stops
// asking Easebuzz once a transaction reaches one of these.
const FINAL_STATUSES = ['success', 'failure', 'usercancelled', 'dropped', 'bounced', 'autorefunded', 'initiate_failed', 'amount_mismatch'];

// Easebuzz's default per-transaction ceiling (₹99,99,999)
const MAX_AMOUNT = 9999999;

const bypass = { bypassFranchise: true };

/** Easebuzz accepts letters, digits and & - . _ ( ) / , @ in the name. */
function cleanName(name) {
  return String(name || '').replace(/[^a-zA-Z0-9&\-._ ()/,@]/g, '').replace(/\s+/g, ' ').trim().slice(0, 150);
}

function apiBaseUrl(req) {
  const proto = (req.get('x-forwarded-proto') || req.protocol).split(',')[0].trim();
  const host = (req.get('x-forwarded-host') || req.get('host')).split(',')[0].trim();
  return `${proto}://${host}`;
}

/** The site origin the donor came from — only one this API already trusts. */
function returnUrlFor(req) {
  const origin = req.get('origin');
  return origin && isAllowedOrigin(origin) ? origin : config.FRONTEND_URL.replace(/\/$/, '');
}

function statusPageUrl(txn) {
  return `${txn.returnUrl}/donate/status?txnid=${encodeURIComponent(txn.txnid)}`;
}

/** Create the Donation for a paid transaction exactly once (surl and webhook can race). */
async function recordDonation(txn) {
  const idempotencyKey = `easebuzz_${txn.txnid}`;
  try {
    const donation = await Donation.create({
      amount: txn.amount,
      method: 'online',
      status: 'completed',
      anonymousDonor: { name: txn.donor.name, email: txn.donor.email, phone: txn.donor.phone },
      paymentDetails: {
        online: {
          gateway: 'easebuzz',
          transactionId: txn.txnid,
          paymentId: txn.easepayid,
          orderId: txn.bankRefNum,
          status: 'success',
        },
      },
      campaign: { source: 'website' },
      verification: { status: 'verified', verifiedAt: new Date(), notes: 'Confirmed by Easebuzz' },
      idempotencyKey,
      notes: `Online donation via Easebuzz${txn.mode ? ` (${txn.mode})` : ''}`,
      franchise: txn.franchise,
    });
    return donation._id;
  } catch (error) {
    if (error.code !== 11000) throw error;
    const existing = await Donation.findOne({ idempotencyKey, franchise: txn.franchise }).select('_id');
    if (!existing) throw error;
    return existing._id;
  }
}

/** Apply a hash-verified Easebuzz payload (surl/furl, webhook or Transaction API). */
async function applyResult(txn, result, via) {
  const status = String(result.status || '').toLowerCase();
  // Webhooks arrive in any order — a late "pending" must not undo a payment.
  if (txn.status === 'success' && status !== 'success') return txn;

  const amountMatches = Math.abs(parseFloat(result.amount) - txn.amount) < 0.005;
  txn.status = amountMatches ? status : 'amount_mismatch';
  txn.errorMessage = amountMatches
    ? result.error_Message || result.error || ''
    : `Easebuzz reported ${result.amount}, expected ${txn.amount}`;
  txn.easepayid = result.easepayid || txn.easepayid;
  txn.mode = result.mode || txn.mode;
  txn.bankRefNum = result.bank_ref_num || txn.bankRefNum;
  txn.updatedVia = via;

  if (txn.status === 'success' && !txn.donation) {
    txn.donation = await recordDonation(txn);
  }
  await txn.save();
  return txn;
}

/** GET /api/easebuzz/config — whether this franchise takes online payments. */
exports.getConfig = (req, res) => {
  return ResponseHelper.success(res, { enabled: easebuzz.isEnabledFor(req.franchise) });
};

/** POST /api/easebuzz/initiate — public: start a donation, returns the checkout URL. */
exports.initiate = async (req, res) => {
  try {
    if (!easebuzz.isEnabledFor(req.franchise)) {
      return ResponseHelper.error(res, 'Online payment is not available', 403);
    }

    const amount = Math.round(parseFloat(req.body.amount) * 100) / 100;
    const name = cleanName(req.body.name);
    const email = String(req.body.email || '').trim().toLowerCase();
    const phone = String(req.body.phone || '').replace(/[\s()-]/g, '');

    if (!Number.isFinite(amount) || amount < 1 || amount > MAX_AMOUNT) {
      return ResponseHelper.error(res, `Enter an amount between ₹1 and ₹${MAX_AMOUNT.toLocaleString('en-IN')}`, 400);
    }
    if (name.length < 2) {
      return ResponseHelper.error(res, 'Enter your name (English letters)', 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 200) {
      return ResponseHelper.error(res, 'Enter a valid email address', 400);
    }
    if (!/^\+?\d{10,15}$/.test(phone)) {
      return ResponseHelper.error(res, 'Enter a valid phone number', 400);
    }

    const txnid = `DN${Date.now().toString(36)}${crypto.randomBytes(5).toString('hex')}`.toUpperCase();
    const txn = await EasebuzzTransaction.create({
      txnid,
      amount,
      donor: { name, email, phone },
      returnUrl: returnUrlFor(req),
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      franchise: req.franchiseId,
    });

    const callbackUrl = `${apiBaseUrl(req)}/api/easebuzz/callback/response`;
    try {
      const { checkoutUrl } = await easebuzz.initiatePayment({
        txnid,
        amount: amount.toFixed(2),
        productinfo: 'Donation',
        firstname: name,
        email,
        phone: phone.replace(/^\+/, ''),
        surl: callbackUrl,
        furl: callbackUrl,
      });
      return ResponseHelper.success(res, { txnid, checkoutUrl }, 'Payment initiated');
    } catch (error) {
      console.error(`[easebuzz] initiate failed for ${txnid}:`, error.message);
      txn.status = 'initiate_failed';
      txn.errorMessage = error.message;
      await txn.save();
      return ResponseHelper.error(res, 'Could not start the payment. Please try again in a moment.', 502);
    }
  } catch (error) {
    console.error('[easebuzz] initiate error:', error);
    return ResponseHelper.error(res, 'Could not start the payment. Please try again in a moment.', 500);
  }
};

/**
 * POST /api/easebuzz/callback/response — surl and furl. Easebuzz form-posts
 * the result from the donor's browser; we record it and send them back to the
 * site's status page. An unverifiable post changes nothing — the status page
 * then asks the Transaction API instead.
 */
exports.handleResponse = async (req, res) => {
  const result = req.body || {};
  const txn = result.txnid
    ? await EasebuzzTransaction.findOne({ txnid: String(result.txnid) }).setOptions(bypass).catch(() => null)
    : null;
  if (!txn) return res.status(404).send('Unknown transaction');

  try {
    if (easebuzz.verifyResponse(result)) await applyResult(txn, result, 'surl');
    else console.warn(`[easebuzz] response hash mismatch for ${txn.txnid}`);
  } catch (error) {
    console.error(`[easebuzz] response handling failed for ${txn.txnid}:`, error);
  }
  return res.redirect(303, statusPageUrl(txn));
};

/**
 * POST /api/easebuzz/callback/webhook — transaction webhook configured in the
 * Easebuzz dashboard. Easebuzz retries anything but a 200, so unknown txnids
 * (other payments on the same merchant account) are acknowledged too.
 */
exports.webhook = async (req, res) => {
  const result = req.body || {};
  if (!easebuzz.verifyResponse(result)) return res.status(400).send('Invalid hash');

  try {
    const txn = await EasebuzzTransaction.findOne({ txnid: String(result.txnid) }).setOptions(bypass);
    if (txn) await applyResult(txn, result, 'webhook');
    return res.status(200).send('OK');
  } catch (error) {
    console.error(`[easebuzz] webhook failed for ${result.txnid}:`, error);
    return res.status(500).send('Error');
  }
};

/** GET /api/easebuzz/status/:txnid — public: result for the site's status page. */
exports.getStatus = async (req, res) => {
  try {
    const txn = await EasebuzzTransaction.findOne({ txnid: String(req.params.txnid), franchise: req.franchiseId });
    if (!txn) return ResponseHelper.error(res, 'Transaction not found', 404);

    if (!FINAL_STATUSES.includes(txn.status) && easebuzz.isEnabledFor(req.franchise)) {
      try {
        const result = await easebuzz.retrieveTransaction(txn.txnid);
        if (result) await applyResult(txn, result, 'status_api');
      } catch (error) {
        console.warn(`[easebuzz] status lookup failed for ${txn.txnid}:`, error.message);
      }
    }

    const donation = txn.donation
      ? await Donation.findOne({ _id: txn.donation, franchise: txn.franchise }).select('donationNumber')
      : null;

    return ResponseHelper.success(res, {
      txnid: txn.txnid,
      status: txn.status,
      final: FINAL_STATUSES.includes(txn.status),
      amount: txn.amount,
      mode: txn.mode || null,
      easepayid: txn.easepayid || null,
      donationNumber: donation?.donationNumber || null,
      createdAt: txn.createdAt,
    });
  } catch (error) {
    console.error('[easebuzz] status error:', error);
    return ResponseHelper.error(res, 'Failed to load payment status', 500);
  }
};
