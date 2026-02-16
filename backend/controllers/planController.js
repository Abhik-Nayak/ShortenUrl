/**
 * Plan Controller
 * Handles plan information, upgrades, and billing
 */

const User = require("../models/User");
const Payment = require("../models/Payment");
const { AppError } = require("../middleware/errorHandler");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const PLAN_DETAILS = {
  free: {
    name: "Free",
    price: 0,
    linksPerMonth: 100,
    analyticsRetention: 30,
    customDomain: false,
  },
  pro: {
    name: "Pro",
    price: 9.99,
    linksPerMonth: 5000,
    analyticsRetention: 365,
    customDomain: true,
  },
  enterprise: {
    name: "Enterprise",
    price: 49.99,
    linksPerMonth: 100000,
    analyticsRetention: null, // Unlimited
    customDomain: true,
  },
};

/**
 * Get all available plans
 * GET /api/plan/
 */
const getPlans = (req, res, next) => {
  try {
    const plans = Object.entries(PLAN_DETAILS).map(([key, details]) => ({
      id: key,
      ...details,
    }));

    res.status(200).json({
      success: true,
      plans,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get current user's plan details
 * GET /api/plan/current
 */
const getCurrentPlan = (req, res, next) => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    const planDetails = PLAN_DETAILS[req.user.plan];
    const currentDate = new Date();
    const daysUntilExpiry = req.user.planExpiry
      ? Math.ceil((req.user.planExpiry - currentDate) / (1000 * 60 * 60 * 24))
      : null;

    res.status(200).json({
      success: true,
      plan: {
        type: req.user.plan,
        ...planDetails,
        planExpiry: req.user.planExpiry,
        daysUntilExpiry,
        linksUsed: req.user.quotas.linksUsed,
        quotas: req.user.quotas,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Create Stripe checkout session for plan upgrade
 * POST /api/plan/upgrade
 */
const upgradeePlan = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    const { planType, billingCycle = "monthly" } = req.body;

    // Validate plan
    if (!PLAN_DETAILS[planType]) {
      return next(new AppError("Invalid plan type", 400));
    }

    // Don't allow downgrade
    const planHierarchy = { free: 0, pro: 1, enterprise: 2 };
    if (planHierarchy[planType] <= planHierarchy[req.user.plan]) {
      return next(new AppError("Cannot downgrade. Please contact support.", 400));
    }

    // Create Stripe customer if doesn't exist
    let customerId = req.user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        name: req.user.name,
      });
      customerId = customer.id;
      req.user.stripeCustomerId = customerId;
      await req.user.save();
    }

    // Create checkout session
    const priceData = {
      currency: "usd",
      product_data: {
        name: PLAN_DETAILS[planType].name + " Plan",
        description: `${PLAN_DETAILS[planType].linksPerMonth} links/month, ${PLAN_DETAILS[planType].analyticsRetention || "Unlimited"} days retention`,
      },
      unit_amount: Math.round(PLAN_DETAILS[planType].price * 100),
    };

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: priceData,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.CLIENT_URL}/dashboard?payment=success`,
      cancel_url: `${process.env.CLIENT_URL}/pricing`,
      metadata: {
        userId: req.user._id.toString(),
        planType,
        billingCycle,
      },
    });

    res.status(200).json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Handle Stripe webhook for payment success
 * POST /api/plan/webhook
 */
const handleStripeWebhook = async (req, res, next) => {
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return next(new AppError(err.message, 400));
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const { userId, planType, billingCycle } = session.metadata;

        // Update user plan
        const user = await User.findById(userId);
        if (user) {
          user.plan = planType;

          // Set expiry date
          const expiryDate = new Date();
          if (billingCycle === "monthly") {
            expiryDate.setMonth(expiryDate.getMonth() + 1);
          } else {
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);
          }
          user.planExpiry = expiryDate;

          // Update quotas
          const planDetails = PLAN_DETAILS[planType];
          user.quotas.linksPerMonth = planDetails.linksPerMonth;
          user.quotas.analyticsRetention = planDetails.analyticsRetention || 365;
          user.quotas.customDomain = planDetails.customDomain;
          user.quotas.linksUsed = 0; // Reset usage

          await user.save();

          // Record payment
          await Payment.create({
            userId,
            planType,
            amount: planDetails.price,
            paymentMethod: "stripe",
            transactionId: session.id,
            status: "success",
            billingCycle,
            endDate: expiryDate,
            metadata: session,
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        // Handle payment failure - could send email, etc.
        console.log("Payment failed for subscription:", invoice.subscription);
        break;
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getPlans,
  getCurrentPlan,
  upgradeePlan,
  handleStripeWebhook,
};
