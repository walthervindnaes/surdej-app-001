// api/webhook.js
// ─────────────────────────────────────────────────────────────
// Stripe webhook — lytter på abonnements-events
//
// Opsætning i Stripe Dashboard:
//   Developers > Webhooks > Add endpoint
//   URL: https://levainapp.dk/api/webhook
//   Events: checkout.session.completed
//            customer.subscription.updated
//            customer.subscription.deleted
//            invoice.payment_failed
//
// Miljøvariabel:
//   STRIPE_WEBHOOK_SECRET=whsec_...  (fra webhook-siden i Dashboard)
// ─────────────────────────────────────────────────────────────

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async function webhook(req, res) {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // req.rawBody skal være Buffer — tilføj i server.js:
    // app.post('/api/webhook', express.raw({ type: 'application/json' }), webhook);
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signatur fejl:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {

    case 'checkout.session.completed': {
      const session = event.data.object;
      const customerId     = session.customer;
      const subscriptionId = session.subscription;
      const email          = session.customer_details?.email;
      console.log(`Ny abonnent: ${email} (${subscriptionId})`);
      // TODO: gem i din database, aktiver brugerens konto
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object;
      console.log(`Abonnement opdateret: ${sub.id} → status: ${sub.status}`);
      // TODO: opdater brugerens plan i database
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      console.log(`Abonnement opsagt: ${sub.id}`);
      // TODO: nedgrader bruger til gratis plan
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      console.log(`Betaling fejlede for: ${invoice.customer_email}`);
      // TODO: send dunning-email til brugeren
      break;
    }

    default:
      console.log(`Ukendt event: ${event.type}`);
  }

  res.json({ received: true });
};
