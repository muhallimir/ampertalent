import { db } from '../db';
import { isPayPalPaymentMethod, extractBillingAgreementId, getPayPalClient } from '../paypal';

/**
 * Payment Fallback Utilities
 *
 * When the default payment method fails, these utilities try other
 * stored payment methods before marking a subscription as past_due.
 * If a fallback succeeds, it gets promoted to default automatically.
 */

export interface FallbackChargeResult {
  transactionId: string;
  paymentMethodId: string;
  paymentType: 'PayPal' | 'AuthNet';
  last4?: string;
  brand?: string;
}

interface FallbackChargeParams {
  /** All payment methods for the user */
  allPaymentMethods: any[];
  /** ID of the payment method that already failed (to skip it) */
  failedPaymentMethodId: string;
  /** Amount to charge - in DOLLARS for seekers, in CENTS for employers */
  amount: number;
  /** Whether amount is in cents (employer) or dollars (seeker) */
  amountInCents: boolean;
  /** Description for the transaction */
  description: string;
  /** Invoice number prefix */
  invoiceNumber: string;
  /** Customer email */
  email: string;
  /** Label for logs (company name or user ID) */
  entityLabel: string;
}

/**
 * Try fallback payment methods when the default one fails.
 * Iterates through all non-default payment methods (newest first),
 * attempting a charge on each until one succeeds.
 *
 * Returns the successful result or null if all methods fail.
 */
export async function tryFallbackPaymentMethods(
  params: FallbackChargeParams
): Promise<FallbackChargeResult | null> {
  const {
    allPaymentMethods,
    failedPaymentMethodId,
    amount,
    amountInCents,
    description,
    invoiceNumber,
    email,
    entityLabel,
  } = params;

  // Filter out the failed method, sort by newest first
  const fallbackMethods = allPaymentMethods
    .filter(pm => pm.id !== failedPaymentMethodId && pm.authnetPaymentProfileId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (fallbackMethods.length === 0) {
    console.log(`🔄 [Fallback] No alternative payment methods for ${entityLabel}`);
    return null;
  }

  console.log(`🔄 [Fallback] Trying ${fallbackMethods.length} alternative payment method(s) for ${entityLabel}`);

  for (const pm of fallbackMethods) {
    const paymentProfileId = pm.authnetPaymentProfileId;
    const isPayPal = isPayPalPaymentMethod(paymentProfileId);

    console.log(`🔄 [Fallback] Attempting ${isPayPal ? 'PayPal' : 'AuthNet'} method ${pm.id} for ${entityLabel}`);

    try {
      if (isPayPal) {
        // ========== PAYPAL REFERENCE TRANSACTION ==========
        const billingAgreementId = extractBillingAgreementId(paymentProfileId);
        if (!billingAgreementId) {
          console.log(`❌ [Fallback] Invalid PayPal billing agreement for method ${pm.id}, skipping`);
          continue;
        }

        const paypalClient = getPayPalClient();
        const chargeAmount = amountInCents ? amount / 100 : amount;

        const paypalResult = await paypalClient.chargeReferenceTransaction({
          billingAgreementId,
          amount: chargeAmount,
          currency: 'USD',
          description,
          invoiceNumber,
        });

        if (!paypalResult.success) {
          console.log(`❌ [Fallback] PayPal failed for method ${pm.id}: ${paypalResult.error}`);
          continue;
        }

        const transactionId = paypalResult.saleId || paypalResult.transactionId || `PP-FB-${Date.now()}`;
        console.log(`✅ [Fallback] PayPal charge successful with method ${pm.id}: ${transactionId}`);

        return {
          transactionId,
          paymentMethodId: pm.id,
          paymentType: 'PayPal',
        };

      } else {
        // ========== AUTHORIZE.NET CIM TRANSACTION ==========
        const profileIds = paymentProfileId?.split('|');
        if (!profileIds || profileIds.length !== 2) {
          console.log(`❌ [Fallback] Invalid AuthNet profile format for method ${pm.id}, skipping`);
          continue;
        }

        const [customerProfileId, authnetPaymentProfileId] = profileIds;
        const { getAuthorizeNetClient } = await import('../authorize-net');
        const authorizeNetClient = getAuthorizeNetClient();

        const chargeAmount = amountInCents
          ? (amount / 100).toFixed(2)
          : amount.toString();

        const chargeResult = await authorizeNetClient.createTransaction({
          transactionType: 'authCaptureTransaction',
          amount: chargeAmount,
          profile: {
            customerProfileId,
            paymentProfile: {
              paymentProfileId: authnetPaymentProfileId,
            },
          },
          order: {
            invoiceNumber,
            description,
          },
          customer: {
            email,
          },
        });

        if (!chargeResult.success) {
          const errorMsg = chargeResult.errors?.map((e: any) => `[${e.errorCode}] ${e.errorText}`).join(', ') || 'Unknown error';
          console.log(`❌ [Fallback] AuthNet failed for method ${pm.id}: ${errorMsg}`);
          continue;
        }

        const transactionId = chargeResult.transactionId || `AN-FB-${Date.now()}`;
        console.log(`✅ [Fallback] AuthNet charge successful with method ${pm.id}: ${transactionId}`);

        // Capture card details if available
        const last4 = chargeResult.accountNumber?.slice(-4);
        const brand = chargeResult.accountType?.toLowerCase();

        return {
          transactionId,
          paymentMethodId: pm.id,
          paymentType: 'AuthNet',
          last4,
          brand,
        };
      }
    } catch (err) {
      console.log(`❌ [Fallback] Exception for method ${pm.id}: ${err instanceof Error ? err.message : err}`);
      continue;
    }
  }

  console.log(`❌ [Fallback] All payment methods exhausted for ${entityLabel}`);
  return null;
}

/**
 * Promote a payment method to default after a successful fallback charge.
 * Unsets all other methods for the same owner, then sets the given one.
 */
export async function promoteToDefault(
  paymentMethodId: string,
  ownerType: 'seeker' | 'employer',
  ownerId: string
): Promise<void> {
  const ownerColumn = ownerType === 'seeker' ? 'seeker_id' : 'employer_id';

  // Unset all defaults for this owner
  await db.$executeRawUnsafe(
    `UPDATE payment_methods SET is_default = false, updated_at = NOW() WHERE ${ownerColumn} = $1`,
    ownerId
  );

  // Set the successful method as default
  await db.$executeRawUnsafe(
    `UPDATE payment_methods SET is_default = true, updated_at = NOW() WHERE id = $1 AND ${ownerColumn} = $2`,
    paymentMethodId,
    ownerId
  );

  console.log(`✅ [Fallback] Promoted payment method ${paymentMethodId} to default for ${ownerType} ${ownerId}`);
}
