// ------------------------------------------------------------------
// SIMULATED PAYMENT GATEWAY (test mode)
//
// Stripe is not available in every country, so this file plays the
// role of the payment provider. It works like a gateway's test mode:
//   4242 4242 4242 4242  -> payment succeeds
//   4000 0000 0000 0002  -> card is declined
// with any future expiry date and any 3-digit CVC.
//
// No real card is ever charged, and the card number is never stored.
// To switch to a real provider later, replace the body of charge()
// and keep its return shape: { success, transactionId, last4, code, message }.
// ------------------------------------------------------------------
const crypto = require('crypto');

const TEST_SUCCESS = '4242424242424242';
const TEST_DECLINE = '4000000000000002';

function validateCard(card = {}) {
  const number = String(card.number || '').replace(/\s+/g, '');
  if (!/^\d{16}$/.test(number)) return { error: 'Enter a 16-digit card number' };

  const month = Number(card.expMonth);
  let year = Number(card.expYear);
  if (!Number.isInteger(month) || month < 1 || month > 12) return { error: 'Enter a valid expiry month (01-12)' };
  if (!Number.isInteger(year)) return { error: 'Enter a valid expiry year' };
  if (year < 100) year += 2000;
  const endOfExpiryMonth = new Date(year, month, 1); // first day of the NEXT month
  if (endOfExpiryMonth <= new Date()) return { error: 'This card has expired' };

  if (!/^\d{3}$/.test(String(card.cvc || ''))) return { error: 'Enter the 3-digit security code (CVC)' };

  return { number };
}

async function charge({ amount, card }) {
  const check = validateCard(card);
  if (check.error) return { success: false, code: 'invalid_card', message: check.error };

  await new Promise((resolve) => setTimeout(resolve, 600)); // pretend to talk to a bank

  if (check.number === TEST_DECLINE) {
    return { success: false, code: 'card_declined', message: 'Your card was declined.' };
  }
  if (check.number !== TEST_SUCCESS) {
    return {
      success: false,
      code: 'test_mode',
      message: 'Test mode: use card 4242 4242 4242 4242 to pay (or 4000 0000 0000 0002 to see a decline).',
    };
  }

  return {
    success: true,
    transactionId: 'sim_' + crypto.randomBytes(8).toString('hex'),
    last4: check.number.slice(-4),
    amount,
  };
}

module.exports = { charge, validateCard };
