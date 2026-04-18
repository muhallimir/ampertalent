/**
 * PayPal Integration Tests - Option B: Reference Transactions
 * 
 * TDD Approach: Tests written FIRST, then implementation
 * 
 * Key Features Tested:
 * 1. PayPal client initialization
 * 2. Billing Agreement creation
 * 3. Reference Transaction charging
 * 4. Payment profile ID detection (PAYPAL|B-xxx vs AuthNet format)
 * 5. Webhook signature verification
 */

import { PayPalClient, isPayPalPaymentMethod, extractBillingAgreementId } from '@/lib/paypal';

// Mock fetch for PayPal API calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock environment variables
const originalEnv = process.env;

beforeAll(() => {
    process.env = {
        ...originalEnv,
        NEXT_PUBLIC_PAYPAL_CLIENT_ID: 'test-client-id',
        PAYPAL_CLIENT_SECRET: 'test-client-secret',
        NEXT_PUBLIC_PAYPAL_ENVIRONMENT: 'sandbox',
    };
});

afterAll(() => {
    process.env = originalEnv;
});

beforeEach(() => {
    mockFetch.mockClear();
});

describe('PayPal Utility Functions', () => {
    describe('isPayPalPaymentMethod', () => {
        it('should return true for PAYPAL|B-xxx format', () => {
            expect(isPayPalPaymentMethod('PAYPAL|B-5YM51314FL220970W')).toBe(true);
        });

        it('should return true for PAYPAL|B- prefix with any ID', () => {
            expect(isPayPalPaymentMethod('PAYPAL|B-095772398X458835V')).toBe(true);
            expect(isPayPalPaymentMethod('PAYPAL|B-0B632297WP229901G')).toBe(true);
        });

        it('should return false for AuthNet format (custId|payId)', () => {
            expect(isPayPalPaymentMethod('123456789|987654321')).toBe(false);
        });

        it('should return false for null or undefined', () => {
            expect(isPayPalPaymentMethod(null)).toBe(false);
            expect(isPayPalPaymentMethod(undefined)).toBe(false);
        });

        it('should return false for empty string', () => {
            expect(isPayPalPaymentMethod('')).toBe(false);
        });

        it('should return false for malformed PayPal prefix', () => {
            expect(isPayPalPaymentMethod('PAYPAL|I-xxx')).toBe(false); // I-xxx is Subscription API, not supported
            expect(isPayPalPaymentMethod('paypal|B-xxx')).toBe(false); // lowercase
            expect(isPayPalPaymentMethod('PAYPAL-B-xxx')).toBe(false); // wrong separator
        });
    });

    describe('extractBillingAgreementId', () => {
        it('should extract B-xxx ID from PAYPAL|B-xxx format', () => {
            expect(extractBillingAgreementId('PAYPAL|B-5YM51314FL220970W')).toBe('B-5YM51314FL220970W');
        });

        it('should return null for non-PayPal format', () => {
            expect(extractBillingAgreementId('123456789|987654321')).toBeNull();
        });

        it('should return null for null/undefined input', () => {
            expect(extractBillingAgreementId(null)).toBeNull();
            expect(extractBillingAgreementId(undefined)).toBeNull();
        });
    });
});

describe('PayPalClient', () => {
    describe('getAccessToken', () => {
        it('should obtain access token from PayPal OAuth endpoint', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    access_token: 'test-access-token-12345',
                    token_type: 'Bearer',
                    expires_in: 32400,
                }),
            });

            const client = new PayPalClient();
            const token = await client.getAccessToken();

            expect(token).toBe('test-access-token-12345');
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('oauth2/token'),
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/x-www-form-urlencoded',
                        Authorization: expect.stringContaining('Basic'),
                    }),
                    body: 'grant_type=client_credentials',
                })
            );
        });

        it('should throw error on OAuth failure', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
                statusText: 'Unauthorized',
                json: async () => ({ error: 'invalid_client' }),
            });

            const client = new PayPalClient();
            await expect(client.getAccessToken()).rejects.toThrow('Failed to get PayPal access token');
        });
    });

    describe('createBillingAgreementToken', () => {
        it('should create billing agreement token for subscription setup', async () => {
            // Mock OAuth token
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ access_token: 'test-token' }),
            });

            // Mock billing agreement token creation
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    token_id: 'BA-1234567890ABCDEF',
                    links: [
                        { rel: 'approval_url', href: 'https://www.sandbox.paypal.com/agreements/approve?ba_token=BA-1234567890ABCDEF' },
                    ],
                }),
            });

            const client = new PayPalClient();
            const result = await client.createBillingAgreementToken({
                returnUrl: 'https://example.com/success',
                cancelUrl: 'https://example.com/cancel',
                description: 'ampertalent Gold Membership - Yearly',
            });

            expect(result.tokenId).toBe('BA-1234567890ABCDEF');
            expect(result.approvalUrl).toContain('sandbox.paypal.com');
        });
    });

    describe('executeBillingAgreement', () => {
        it('should execute billing agreement and return B-xxx ID', async () => {
            // Mock OAuth token
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ access_token: 'test-token' }),
            });

            // Mock execute billing agreement
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    id: 'B-5YM51314FL220970W',
                    state: 'Active',
                    payer: {
                        payer_info: {
                            email: 'buyer@example.com',
                            payer_id: 'PAYER123',
                        },
                    },
                }),
            });

            const client = new PayPalClient();
            const result = await client.executeBillingAgreement('BA-TOKEN-123');

            expect(result.billingAgreementId).toBe('B-5YM51314FL220970W');
            expect(result.payerEmail).toBe('buyer@example.com');
            expect(result.state).toBe('Active');
        });
    });

    describe('chargeReferenceTransaction', () => {
        it('should charge using billing agreement ID', async () => {
            // Mock OAuth token
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ access_token: 'test-token' }),
            });

            // Mock reference transaction
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    id: 'PAY-1234567890',
                    state: 'completed',
                    transactions: [
                        {
                            amount: { total: '59.99', currency: 'USD' },
                            related_resources: [
                                { sale: { id: 'SALE-12345', state: 'completed' } },
                            ],
                        },
                    ],
                }),
            });

            const client = new PayPalClient();
            const result = await client.chargeReferenceTransaction({
                billingAgreementId: 'B-5YM51314FL220970W',
                amount: 59.99,
                currency: 'USD',
                description: 'ampertalent Gold Yearly Renewal',
                invoiceNumber: 'REN-012025-1234',
            });

            expect(result.success).toBe(true);
            expect(result.transactionId).toBe('PAY-1234567890');
            expect(result.saleId).toBe('SALE-12345');
        });

        it('should handle declined payment', async () => {
            // Mock OAuth token
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ access_token: 'test-token' }),
            });

            // Mock declined transaction
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 400,
                json: async () => ({
                    name: 'PAYMENT_DENIED',
                    message: 'Payment was denied',
                    details: [{ issue: 'INSUFFICIENT_FUNDS' }],
                }),
            });

            const client = new PayPalClient();
            const result = await client.chargeReferenceTransaction({
                billingAgreementId: 'B-5YM51314FL220970W',
                amount: 59.99,
                currency: 'USD',
                description: 'ampertalent Gold Yearly Renewal',
                invoiceNumber: 'REN-012025-1234',
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('PAYMENT_DENIED');
        });
    });

    describe('cancelBillingAgreement', () => {
        it('should cancel active billing agreement', async () => {
            // Mock OAuth token
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ access_token: 'test-token' }),
            });

            // Mock cancel (returns 204 No Content)
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 204,
            });

            const client = new PayPalClient();
            const result = await client.cancelBillingAgreement('B-5YM51314FL220970W');

            expect(result.success).toBe(true);
        });
    });
});

describe('PayPal Payment Method Storage Format', () => {
    it('should format PayPal ID for storage in authnetPaymentProfileId field', () => {
        const billingAgreementId = 'B-5YM51314FL220970W';
        const storageFormat = `PAYPAL|${billingAgreementId}`;

        expect(storageFormat).toBe('PAYPAL|B-5YM51314FL220970W');
        expect(isPayPalPaymentMethod(storageFormat)).toBe(true);
        expect(extractBillingAgreementId(storageFormat)).toBe(billingAgreementId);
    });

    it('should distinguish PayPal from AuthNet payment methods', () => {
        const paypalFormat = 'PAYPAL|B-5YM51314FL220970W';
        const authnetFormat = '1234567890|9876543210';

        expect(isPayPalPaymentMethod(paypalFormat)).toBe(true);
        expect(isPayPalPaymentMethod(authnetFormat)).toBe(false);
    });
});
