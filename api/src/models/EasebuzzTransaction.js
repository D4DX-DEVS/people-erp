const mongoose = require('mongoose');
const franchisePlugin = require('../utils/franchisePlugin');

/**
 * One online donation attempt through Easebuzz. The Donation itself is only
 * created once Easebuzz confirms success, so abandoned checkouts never show up
 * as "pending" donations in the ERP.
 */
const easebuzzTransactionSchema = new mongoose.Schema({
  // Our reference, sent to Easebuzz as `txnid`
  txnid: { type: String, required: true, unique: true },
  amount: { type: Number, required: true, min: 1 },
  donor: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    // Collected only for gifts above PAN_THRESHOLD (see easebuzzController)
    pan: { type: String, uppercase: true, trim: true },
  },

  // Easebuzz status as reported: initiated, pending, success, failure,
  // usercancelled, dropped, bounced, autorefunded… (kept free-form so a new
  // gateway status never fails validation).
  status: { type: String, default: 'initiated' },
  easepayid: String,
  mode: String,
  bankRefNum: String,
  errorMessage: String,
  // Which channel last updated the status: 'surl', 'webhook' or 'status_api'
  updatedVia: String,

  // Site origin the donor started on — where the result redirect sends them back
  returnUrl: String,
  donation: { type: mongoose.Schema.Types.ObjectId, ref: 'Donation', default: null },
  ipAddress: String,
  userAgent: String,
}, { timestamps: true });

easebuzzTransactionSchema.plugin(franchisePlugin);

module.exports = mongoose.model('EasebuzzTransaction', easebuzzTransactionSchema);
