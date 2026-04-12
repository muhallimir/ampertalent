// Stub PayPal - Phase 6 uses Stripe only
export const getPayPalClient = () => ({});
export const createPayPalSubscription = async () => ({ success: false, reason: 'PayPal disabled - use Stripe' });
