// api/create-checkout.js
// ─────────────────────────────────────────────────────────────
// Kræver: npm install stripe express cors
// Kør med: node server.js  (se server.js eksempel nedenfor)
//
// Miljøvariabler du SKAL sætte (.env):
//   STRIPE_SECRET_KEY=sk_live_...    (fra Stripe Dashboard > Developers > API keys)
//   DOMAIN=https://levainapp.dk      (din produktions-URL)
// ─────────────────────────────────────────────────────────────

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async function createCheckout(req, res) {
  const { priceId } = req.body;

  if (!priceId || !priceId.startsWith('price_')) {
    return res.status(400).json({ error: 'Ugyldigt priceId' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      // 14-dages gratis prøveperiode på Bager-planen
      subscription_data: {
        trial_period_days: 14,
      },
      success_url: `${process.env.DOMAIN}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${process.env.DOMAIN}/#pricing`,
      // Aktivér dansk lokalisering
      locale: 'da',
      // Tillad kampagnekoder
      allow_promotion_codes: true,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe fejl:', err.message);
    res.status(500).json({ error: 'Kunne ikke oprette checkout' });
  }
};


// ─────────────────────────────────────────────────────────────
// MINIMAL SERVER EKSEMPEL (server.js i rod-mappen):
// ─────────────────────────────────────────────────────────────
//
// require('dotenv').config();
// const express = require('express');
// const cors    = require('cors');
// const createCheckout = require('./api/create-checkout');
//
// const app = express();
// app.use(cors({ origin: process.env.DOMAIN }));
// app.use(express.json());
// app.use(express.static('.')); // server index.html
//
// app.post('/api/create-checkout', createCheckout);
//
// app.listen(3000, () => console.log('Levain kører på port 3000'));
// ─────────────────────────────────────────────────────────────
