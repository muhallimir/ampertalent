/**
 * PayPal Integration Library - Reference Transactions via Billing Agreements
 *
 * Env vars required:
 *   NEXT_PUBLIC_PAYPAL_CLIENT_ID
 *   PAYPAL_CLIENT_SECRET
 *   NEXT_PUBLIC_PAYPAL_ENVIRONMENT  ("sandbox" | "production", default: "sandbox")
 *
 * Storage Format: Billing Agreement IDs stored as "PAYPAL|B-xxx"
 */

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function isPayPalPaymentMethod(paymentMethodId: string | null | undefined): boolean {
    if (!paymentMethodId || paymentMethodId === '') return false;
    return paymentMethodId.startsWith('PAYPAL|B-');
}

export function extractBillingAgreementId(paymentMethodId: string | null | undefined): string | null {
    if (!isPayPalPaymentMethod(paymentMethodId)) return null;
    const parts = paymentMethodId!.split('|');
    return parts.length === 2 ? parts[1] : null;
}

export function formatPayPalStorageId(billingAgreementId: string): string {
    return `PAYPAL|${billingAgreementId}`;
}

// ============================================================================
// PAYPAL CLIENT
// ============================================================================

export class PayPalClient {
    private clientId: string;
    private clientSecret: string;
    private environment: 'sandbox' | 'production';
    private cachedAccessToken: string | null = null;
    private tokenExpiry: Date | null = null;

    constructor() {
        this.clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '';
        this.clientSecret = process.env.PAYPAL_CLIENT_SECRET || '';
        this.environment = (process.env.NEXT_PUBLIC_PAYPAL_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox';

        if (!this.clientId || !this.clientSecret) {
            console.warn('⚠️  PayPal credentials not configured. Check NEXT_PUBLIC_PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.');
        }
    }

    isConfigured(): boolean {
        return !!(this.clientId && this.clientSecret);
    }

    private getBaseUrl(): string {
        return this.environment === 'production'
            ? 'https://api-m.paypal.com'
            : 'https://api-m.sandbox.paypal.com';
    }

    async getAccessToken(): Promise<string> {
        if (this.cachedAccessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
            return this.cachedAccessToken;
        }

        const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

        const response = await fetch(`${this.getBaseUrl()}/v1/oauth2/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${auth}`,
            },
            body: 'grant_type=client_credentials',
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('PayPal OAuth error:', errorData);
            throw new Error(`Failed to get PayPal access token: ${response.statusText}`);
        }

        const data = await response.json();
        this.cachedAccessToken = data.access_token;
        // Expire 5 minutes early for safety
        this.tokenExpiry = new Date(Date.now() + (data.expires_in - 300) * 1000);

        return data.access_token;
    }

    /**
     * Step 1: Create a Billing Agreement Token — redirect user to PayPal to approve
     */
    async createBillingAgreementToken(options: {
        returnUrl: string;
        cancelUrl: string;
        description?: string;
    }): Promise<{ tokenId: string; approvalUrl: string }> {
        const accessToken = await this.getAccessToken();

        const payload = {
            description: options.description || 'AmperTalent Billing Agreement',
            payer: {
                payment_method: 'PAYPAL',
            },
            plan: {
                type: 'MERCHANT_INITIATED_BILLING',
                merchant_preferences: {
                    return_url: options.returnUrl,
                    cancel_url: options.cancelUrl,
                    accepted_pymt_type: 'INSTANT',
                    skip_shipping_address: true,
                    immutable_shipping_address: false,
                },
            },
        };

        const response = await fetch(`${this.getBaseUrl()}/v1/billing-agreements/agreement-tokens`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('PayPal create token error:', errorData);
            throw new Error(`Failed to create billing agreement token: ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        const approvalLink = data.links?.find((link: any) => link.rel === 'approval_url');

        return {
            tokenId: data.token_id,
            approvalUrl: approvalLink?.href || '',
        };
    }

    /**
     * Step 2: Execute Billing Agreement after user approves — returns B-xxx ID to store
     */
    async executeBillingAgreement(token: string): Promise<{
        billingAgreementId: string;
        payerEmail: string;
        payerId: string;
        state: string;
    }> {
        const accessToken = await this.getAccessToken();

        const response = await fetch(`${this.getBaseUrl()}/v1/billing-agreements/agreements`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ token_id: token }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('PayPal execute agreement error:', errorData);
            throw new Error(`Failed to execute billing agreement: ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();

        return {
            billingAgreementId: data.id,
            payerEmail: data.payer?.payer_info?.email || '',
            payerId: data.payer?.payer_info?.payer_id || '',
            state: data.state,
        };
    }

    /**
     * Charge a Reference Transaction using a stored Billing Agreement ID
     */
    async chargeReferenceTransaction(options: {
        billingAgreementId: string;
        amount: number;
        currency?: string;
        description?: string;
        invoiceNumber?: string;
        items?: Array<{
            name: string;
            quantity: string;
            price: string;
            currency?: string;
            description?: string;
        }>;
    }): Promise<{
        success: boolean;
        transactionId?: string;
        saleId?: string;
        error?: string;
        errorDetails?: string[];
    }> {
        const accessToken = await this.getAccessToken();

        const transactionPayload: Record<string, any> = {
            amount: {
                total: options.amount.toFixed(2),
                currency: options.currency || 'USD',
            },
            description: options.description || 'AmperTalent Payment',
            invoice_number: options.invoiceNumber,
            custom: `AT-${options.invoiceNumber || Date.now()}`,
        };

        if (options.items && options.items.length > 0) {
            transactionPayload.item_list = {
                items: options.items.map(item => ({
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price,
                    currency: item.currency || options.currency || 'USD',
                    ...(item.description && { description: item.description }),
                })),
            };
        }

        const payload = {
            intent: 'sale',
            payer: {
                payment_method: 'PAYPAL',
                funding_instruments: [
                    {
                        billing: {
                            billing_agreement_id: options.billingAgreementId,
                        },
                    },
                ],
            },
            transactions: [transactionPayload],
        };

        const response = await fetch(`${this.getBaseUrl()}/v1/payments/payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('PayPal reference transaction error:', errorData);
            return {
                success: false,
                error: errorData.name || 'PAYMENT_FAILED',
                errorDetails: errorData.details?.map((d: any) => d.issue) || [errorData.message],
            };
        }

        const data = await response.json();
        const sale = data.transactions?.[0]?.related_resources?.find((r: any) => r.sale)?.sale;

        return {
            success: true,
            transactionId: data.id,
            saleId: sale?.id,
        };
    }

    /**
     * Cancel a Billing Agreement
     */
    async cancelBillingAgreement(billingAgreementId: string): Promise<{
        success: boolean;
        error?: string;
    }> {
        const accessToken = await this.getAccessToken();

        const response = await fetch(
            `${this.getBaseUrl()}/v1/billing-agreements/agreements/${billingAgreementId}/cancel`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ note: 'Subscription cancelled by user' }),
            }
        );

        if (response.ok || response.status === 204) {
            return { success: true };
        }

        const errorData = await response.json().catch(() => ({}));
        console.error('PayPal cancel agreement error:', errorData);
        return {
            success: false,
            error: errorData.message || 'Failed to cancel billing agreement',
        };
    }

    /**
     * Get Billing Agreement details
     */
    async getBillingAgreement(billingAgreementId: string): Promise<any> {
        const accessToken = await this.getAccessToken();

        const response = await fetch(
            `${this.getBaseUrl()}/v1/billing-agreements/agreements/${billingAgreementId}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Failed to get billing agreement: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Refund a PayPal sale
     */
    async refundSale(saleId: string): Promise<{
        success: boolean;
        refundId?: string;
        error?: string;
    }> {
        const accessToken = await this.getAccessToken();

        const response = await fetch(
            `${this.getBaseUrl()}/v1/payments/sale/${saleId}/refund`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({}),
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('PayPal refund error:', errorData);
            return {
                success: false,
                error: errorData.message || `PayPal refund failed: ${response.statusText}`,
            };
        }

        const data = await response.json();
        return { success: true, refundId: data.id };
    }
}

// ============================================================================
// SINGLETON
// ============================================================================

let _paypalClient: PayPalClient | null = null;

export const getPayPalClient = (): PayPalClient => {
    if (!_paypalClient) {
        _paypalClient = new PayPalClient();
    }
    return _paypalClient;
};

// ============================================================================
// WEBHOOK VERIFICATION
// ============================================================================

export async function verifyWebhookSignature(opts: {
    webhookId: string;
    transmissionId: string;
    transmissionTime: string;
    certUrl: string;
    authAlgo: string;
    transmissionSig: string;
    webhookEvent: any;
}): Promise<boolean> {
    const client = getPayPalClient();
    const accessToken = await client.getAccessToken();
    const baseUrl = process.env.NEXT_PUBLIC_PAYPAL_ENVIRONMENT === 'production'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';

    const response = await fetch(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
            webhook_id: opts.webhookId,
            transmission_id: opts.transmissionId,
            transmission_time: opts.transmissionTime,
            cert_url: opts.certUrl,
            auth_algo: opts.authAlgo,
            transmission_sig: opts.transmissionSig,
            webhook_event: opts.webhookEvent,
        }),
    });

    if (!response.ok) {
        console.error('PayPal webhook verification failed:', await response.text());
        return false;
    }

    const data = await response.json();
    return data.verification_status === 'SUCCESS';
}
