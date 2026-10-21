// ------------------------------------------------------------------
// SIMULATED PAYMENT GATEWAY (test mode)
//
// Stripe is not available in every country, so this file plays the role of the payment
// provider. It behaves like a real gateway's test mode:
//   - the card number must pass the standard checksum (Luhn), the expiry must be in the
//     future and the CVC must have 3 digits (4 for American Express)
//   - a few special test numbers give specific failures (see TEST_FAILURES)
//   - every other valid card number is approved
// No real card is ever charged, and card numbers are never stored.
//
// To switch to a real provider later, replace charge() and refund() and keep their
// return shapes.
// ------------------------------------------------------------------
const crypto = require('crypto');

// Same numbers Stripe documents for its test mode
const TEST_FAILURES = {
  '4000000000000002': { code: 'card_declined', message: 'Your card was declined.' },
  '4000000000009995': { code: 'insufficient_funds', message: 'Your card has insufficient funds.' },
  '4000000000009987': { code: 'card_declined', message: 'Your card was declined because it was reported lost.' },
  '4000000000000069': { code: 'expired_card', message: 'Your card has expired.' },
  '4000000000000127': { code: 'incorrect_cvc', message: "Your card's security code is incorrect." },
  '4000000000000119': { code: 'processing_error', message: 'An error occurred while processing your card. Please try again.' },
};

const luhnValid = (digits) => {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
};

const brandOf = (n) => {
  if (/^4/.test(n)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(n)) return 'Mastercard';
  if (/^3[47]/.test(n)) return 'American Express';
  return 'Card';
};

// Checks the card details WITHOUT contacting the "bank". Returns { error } or { number, brand }.
function validateCard(card = {}) {
  const number = String(card.number || '').replace(/[\s-]/g, '');
  if (!/^\d{13,19}$/.test(number) || !luhnValid(number)) {
    return { error: 'Your card number is invalid. Check it and try again.' };
  }

  const month = Number(card.expMonth);
  let year = Number(card.expYear);
  if (!Number.isInteger(month) || month < 1 || month > 12) return { error: 'Enter a valid expiry month (01-12).' };
  if (!Number.isInteger(year)) return { error: 'Enter a valid expiry year.' };
  if (year < 100) year += 2000;
  if (new Date(year, month, 1) <= new Date()) return { error: 'Your card has expired.' }; // 1st of the NEXT month

  const brand = brandOf(number);
  const cvcLength = brand === 'American Express' ? 4 : 3;
  if (!new RegExp(`^\\d{${cvcLength}}$`).test(String(card.cvc || ''))) {
    return { error: `Enter the ${cvcLength}-digit security code (CVC).` };
  }
  return { number, brand };
}

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Returns { success, transactionId, last4, brand } or { success:false, code, message, last4, brand }
async function charge({ amount, card }) {
  const check = validateCard(card);
  if (check.error) return { success: false, code: 'invalid_card', message: check.error };

  await pause(600); // pretend to talk to a bank

  const last4 = check.number.slice(-4);
  const failure = TEST_FAILURES[check.number];
  if (failure) return { success: false, ...failure, last4, brand: check.brand };

  return {
    success: true,
    transactionId: 'sim_' + crypto.randomBytes(8).toString('hex'),
    last4,
    brand: check.brand,
    amount,
  };
}

// Simulated refund (used when a paid order is cancelled before it ships)
async function refund({ transactionId, amount }) {
  await pause(300);
  return { success: true, refundId: 're_sim_' + crypto.randomBytes(6).toString('hex'), transactionId, amount };
}

module.exports = { charge, refund, validateCard, TEST_FAILURES };
