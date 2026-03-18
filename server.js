require('dotenv').config();
const express = require('express');
const stripe  = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cors    = require('cors');
const path    = require('path');

const app = express();

app.use(cors());
app.use(express.static(path.join(__dirname)));

// Raw body til Stripe webhook
app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook fejl:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed':
      console.log('Betaling gennemført:', event.data.object.customer_details?.email);
      // TODO: gem bruger i database og giv adgang
      break;
    case 'customer.subscription.deleted':
      console.log('Abonnement opsagt:', event.data.object.id);
      // TODO: fjern adgang
      break;
  }
  res.json({ received: true });
});

app.use(express.json());

// ─── INDSÆT JERES STRIPE PRICE IDs HER ───────────────────────
const PRICES = {
  mini:    'price_INDSÆT_MINI_ID',     // 25 kr/md
  mellem:  'price_INDSÆT_MELLEM_ID',   // 35 kr/md
  premium: 'price_INDSÆT_PREMIUM_ID',  // 100 kr/md
};
// ──────────────────────────────────────────────────────────────

app.post('/api/create-checkout', async (req, res) => {
  const { plan } = req.body;
  const priceId  = PRICES[plan];

  if (!priceId || priceId.includes('INDSÆT')) {
    return res.status(400).json({ error: 'Price ID ikke sat op endnu — se PRICES i server.js' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      locale: 'da',
      allow_promotion_codes: true,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: plan === 'mellem' ? 14 : 0,
      },
      success_url: `${process.env.DOMAIN}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${process.env.DOMAIN}/#mini-pakke`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe fejl:', err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Levain kører på http://localhost:${PORT}`));
