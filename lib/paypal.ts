/**
 * PayPal Integration Library - Option B: Reference Transactions
 * 
 * This library implements PayPal Billing Agreements for recurring payments.
 * Uses the same cron-based billing model as Authorize.net.
 * 
 * Storage Format: Billing Agreement IDs stored in existing authnetPaymentProfileId field
 * as "PAYPAL|B-xxx" to distinguish from AuthNet format "custId|payId"
 * 
 * NO SCHEMA CHANGES REQUIRED - uses existing PaymentMethod table
 */

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if a payment profile ID is a PayPal Billing Agreement
 * PayPal format: "PAYPAL|B-xxx"
 * AuthNet format: "custId|payId" (numeric IDs)
 */
export function isPayPalPaymentMethod(profileId: string | null | undefined): boolean {
    if (!profileId) return false;
    return profileId.startsWith('PAYPAL|B-');
}

/**
 * Extract the Billing Agreement ID from the storage format
 * Input: "PAYPAL|B-5YM51314FL220970W"
 * Output: "B-5YM51314FL220970W"
 */
export function extractBillingAgreementId(profileId: string | null | undefined): string | null {
    if (!isPayPalPaymentMethod(profileId)) return null;
    return profileId!.replace('PAYPAL|', '');
}

/**
 * Format a Billing Agreement ID for storage in authnetPaymentProfileId field
 * Input: "B-5YM51314FL220970W"
 * Output: "PAYPAL|B-5YM51314FL220970W"
 */
export function formatPayPalStorageId(billingAgreementId: string): string {
    return `PAYPAL|${billingAgreementId}`;
}

// ============================================================================
// PAYPAL CLIENT
// ============================================================================

interface PayPalConfig {
    clientId: string;
    clientSecret: string;
    environment: 'sandbox' | 'production';
}

interface BillingAgreementTokenRequest {
    returnUrl: string;
    cancelUrl: string;
    description: string;
}

interface BillingAgreementTokenResponse {
    tokenId: string;
    approvalUrl: string;
}

interface BillingAgreementResponse {
    billingAgreementId: string;
    payerEmail: string;
    payerId: string;
    state: string;
}

interface PayPalLineItem {
    name: string;
    quantity: string;
    price: string;
    currency?: string;
    description?: string;
}

interface ReferenceTransactionRequest {
    billingAgreementId: string;
    amount: number;
    currency?: string;
    description: string;
    invoiceNumber: string;
    items?: PayPalLineItem[];
}

interface ReferenceTransactionResponse {
    success: boolean;
    transactionId?: string;
    saleId?: string;
    error?: string;
    errorDetails?: string[];
}

interface CancelBillingAgreementResponse {
    success: boolean;
    error?: string;
}

export class PayPalClient {
    private config: PayPalConfig;
    private cachedAccessToken: string | null = null;
    private tokenExpiry: Date | null = null;

    constructor(config?: Partial<PayPalConfig>) {
        this.config = {
            clientId: config?.clientId || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '',
            clientSecret: config?.clientSecret || process.env.PAYPAL_CLIENT_SECRET || '',
            environment: (config?.environment || process.env.NEXT_PUBLIC_PAYPAL_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production',
        };

        if (!this.config.clientId || !this.config.clientSecret) {
            console.warn('PayPal credentials not configured. PayPal payments will not work.');
        }
    }

    /**
     * Get the PayPal API base URL based on environment
     */
    private getBaseUrl(): string {
        return this.config.environment === 'production'
            ? 'https://api-m.paypal.com'
            : 'https://api-m.sandbox.paypal.com';
    }

    /**
     * Get OAuth2 access token from PayPal
     * Caches token until expiry
     */
    async getAccessToken(): Promise<string> {
        // Check if we have a valid cached token
        if (this.cachedAccessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
            return this.cachedAccessToken;
        }

        const auth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');

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
        // Set expiry 5 minutes before actual expiry for safety
        this.tokenExpiry = new Date(Date.now() + (data.expires_in - 300) * 1000);

        return data.access_token;
    }

    /**
     * Create a Billing Agreement Token
     * This is the first step - redirect user to PayPal to approve
     */
    async createBillingAgreementToken(
        request: BillingAgreementTokenRequest
    ): Promise<BillingAgreementTokenResponse> {
        const accessToken = await this.getAccessToken();

        const payload = {
            description: request.description,
            payer: {
                payment_method: 'PAYPAL',
            },
            plan: {
                type: 'MERCHANT_INITIATED_BILLING',
                merchant_preferences: {
                    return_url: request.returnUrl,
                    cancel_url: request.cancelUrl,
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
            throw new Error(`Failed to create billing agreement token: ${response.statusText}`);
        }

        const data = await response.json();
        const approvalLink = data.links?.find((link: any) => link.rel === 'approval_url');

        return {
            tokenId: data.token_id,
            approvalUrl: approvalLink?.href || '',
        };
    }

    /**
     * Execute Billing Agreement after user approval
     * Returns the B-xxx Billing Agreement ID to store
     */
    async executeBillingAgreement(token: string): Promise<BillingAgreementResponse> {
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
            throw new Error(`Failed to execute billing agreement: ${response.statusText}`);
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
     * Charge a Reference Transaction using stored Billing Agreement
     * This is called by the recurring billing cron
     */
    async chargeReferenceTransaction(
        request: ReferenceTransactionRequest
    ): Promise<ReferenceTransactionResponse> {
        const accessToken = await this.getAccessToken();

        // Build item_list if items are provided (for itemized display in merchant dashboard)
        const itemList = request.items && request.items.length > 0
            ? {
                items: request.items.map(item => ({
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price,
                    currency: item.currency || request.currency || 'USD',
                    ...(item.description && { description: item.description }),
                })),
            }
            : undefined;

        const transactionPayload: Record<string, any> = {
            amount: {
                total: request.amount.toFixed(2),
                currency: request.currency || 'USD',
            },
            description: request.description,
            invoice_number: request.invoiceNumber,
            custom: `HMM-${request.invoiceNumber}`,
        };

        // Add item_list if available for itemized merchant display
        if (itemList) {
            transactionPayload.item_list = itemList;
        }

        const payload = {
            intent: 'sale',
            payer: {
                payment_method: 'PAYPAL',
                funding_instruments: [
                    {
                        billing: {
                            billing_agreement_id: request.billingAgreementId,
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

        // Extract sale ID from transaction
        const sale = data.transactions?.[0]?.related_resources?.find((r: any) => r.sale)?.sale;

        return {
            success: true,
            transactionId: data.id,
            saleId: sale?.id,
        };
    }

    /**
     * Refund a PayPal sale (full refund)
     * Uses the PayPal v1 Sale API to issue a full refund
     */
    async refundSale(saleId: string): Promise<{ success: boolean; refundId?: string; error?: string }> {
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
        return {
            success: true,
            refundId: data.id,
        };
    }

    /**
     * Cancel a Billing Agreement
     * Called when user cancels subscription
     */
    async cancelBillingAgreement(billingAgreementId: string): Promise<CancelBillingAgreementResponse> {
        const accessToken = await this.getAccessToken();

        const response = await fetch(
            `${this.getBaseUrl()}/v1/billing-agreements/agreements/${billingAgreementId}/cancel`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    note: 'Subscription cancelled by user',
                }),
            }
        );

        // 204 No Content is success
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
     * Useful for checking agreement status
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
            console.error('PayPal get agreement error:', errorData);
            throw new Error(`Failed to get billing agreement: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Search PayPal transactions by date range
     * Uses the PayPal Reporting Transactions API (v1)
     * Note: Date range max is 31 days per request
     */
    async searchTransactions(
        startDate: string,
        endDate: string,
        page: number = 1,
        pageSize: number = 100
    ): Promise<{
        transaction_details: Array<{
            transaction_info: {
                transaction_id: string
                transaction_event_code: string
                transaction_initiation_date: string
                transaction_updated_date: string
                transaction_amount: { currency_code: string; value: string }
                transaction_status: string
                invoice_id?: string
                custom_field?: string
            }
            payer_info?: {
                email_address?: string
                payer_name?: { given_name?: string; surname?: string }
            }
        }>
        total_items: number
        total_pages: number
        page: number
    }> {
        const accessToken = await this.getAccessToken();

        const params = new URLSearchParams({
            start_date: startDate,
            end_date: endDate,
            fields: 'transaction_info,payer_info',
            page_size: String(pageSize),
            page: String(page),
        });

        const response = await fetch(
            `${this.getBaseUrl()}/v1/reporting/transactions?${params.toString()}`,
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
            console.error('PayPal search transactions error:', errorData);
            throw new Error(`Failed to search PayPal transactions: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Get PayPal sale details by sale ID
     * Uses the PayPal v1 Sale API
     */
    async getSale(saleId: string): Promise<any> {
        const accessToken = await this.getAccessToken();

        const response = await fetch(
            `${this.getBaseUrl()}/v1/payments/sale/${saleId}`,
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
            throw new Error(errorData.message || `Failed to get PayPal sale: ${response.statusText}`);
        }

        return response.json();
    }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let paypalClientInstance: PayPalClient | null = null;

/**
 * Get the PayPal client singleton
 */
export function getPayPalClient(): PayPalClient {
    if (!paypalClientInstance) {
        paypalClientInstance = new PayPalClient();
    }
    return paypalClientInstance;
}

// ============================================================================
// WEBHOOK VERIFICATION
// ============================================================================

interface WebhookVerificationRequest {
    webhookId: string;
    transmissionId: string;
    transmissionTime: string;
    certUrl: string;
    authAlgo: string;
    transmissionSig: string;
    webhookEvent: any;
}

/**
 * Verify PayPal webhook signature
 * Should be called for all incoming webhooks
 */
export async function verifyWebhookSignature(
    request: WebhookVerificationRequest
): Promise<boolean> {
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
            webhook_id: request.webhookId,
            transmission_id: request.transmissionId,
            transmission_time: request.transmissionTime,
            cert_url: request.certUrl,
            auth_algo: request.authAlgo,
            transmission_sig: request.transmissionSig,
            webhook_event: request.webhookEvent,
        }),
    });

    if (!response.ok) {
        console.error('PayPal webhook verification failed:', await response.text());
        return false;
    }

    const data = await response.json();
    return data.verification_status === 'SUCCESS';
}
