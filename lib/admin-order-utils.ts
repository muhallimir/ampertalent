/**
 * Admin Order Notification Utilities
 * 
 * Centralized utilities for generating admin order notifications.
 * Follows DRY principle - reusable across all payment flows.
 */

import { NotificationService } from './notification-service';

export interface OrderDetails {
    orderNumber: string;
    orderDate: string;
    orderDateFormatted: string;
    orderTimeFormatted: string;
}

export interface AdminNotificationData {
    customerName: string;
    customerType: 'Seeker' | 'Employer';
    customerId: string;
    customerEmail: string;
    customerPhone?: string;
    productDescription: string;
    quantity?: number;
    price: number;
    subscriptionStartDate?: string;
    subscriptionEndDate?: string;
    nextPaymentDate?: string;
    recurringTotal?: string;
    billingAddress?: {
        name?: string;
        address?: string;
        city?: string;
        state?: string;
        zip?: string;
        country?: string;
    };
    howDidYouHear?: string;
    isRenewal?: boolean;
    isTrial?: boolean;
    paymentMethod?: string;
    transactionId?: string;
    billingFirstName?: string;
    billingLastName?: string;
    billingCardAddress?: string;
    billingCardCity?: string;
    billingCardState?: string;
    billingCardZipCode?: string;
    paymentType?: 'card' | 'paypal';
}

/**
 * Generate order details with consistent formatting
 */
export function generateOrderDetails(referenceId: string): OrderDetails {
    const orderDate = new Date();

    const orderDateFormatted = orderDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const orderTimeFormatted = orderDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short'
    });

    const orderSuffix = referenceId.slice(-4).toUpperCase();
    const orderNumber = `ORD-${orderDate.toISOString().slice(0, 10).replace(/-/g, '')}-${orderSuffix}`;

    return {
        orderNumber,
        orderDate: `${orderDateFormatted} at ${orderTimeFormatted}`,
        orderDateFormatted,
        orderTimeFormatted
    };
}

/**
 * Format customer ID consistently
 */
export function formatCustomerId(userId: string, prefix: string = 'USR'): string {
    return `${prefix}-${userId.slice(-4).toUpperCase()}`;
}

/**
 * Format recurring total string
 */
export function formatRecurringTotal(price: number, billingPeriod: string): string {
    return `$${price.toFixed(2)} / ${billingPeriod}`;
}

/**
 * Calculate and format next payment date
 */
export function formatNextPaymentDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * Send admin payment notification with error handling
 * Non-blocking - errors are logged but don't throw
 * 
 * @param data - Notification data
 * @param context - Context string for logging (e.g., 'SEEKER-PURCHASE', 'EMPLOYER-BILLING')
 */
export async function sendAdminOrderNotification(
    data: AdminNotificationData,
    referenceId: string,
    context: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const orderDetails = generateOrderDetails(referenceId);

        // For trials, show $0 price and mark as trial
        const displayPrice = data.isTrial ? 0 : data.price;
        const productDescription = data.isTrial
            ? `${data.productDescription} (Free Trial)`
            : data.productDescription;

        await NotificationService.sendAdminPaymentNotification({
            orderNumber: orderDetails.orderNumber,
            orderDate: orderDetails.orderDate,
            customerName: data.customerName,
            customerType: data.customerType,
            customerId: data.customerId,
            customerEmail: data.customerEmail,
            customerPhone: data.customerPhone,
            productDescription,
            quantity: data.quantity || 1,
            price: displayPrice,
            subscriptionStartDate: data.subscriptionStartDate || orderDetails.orderDateFormatted,
            subscriptionEndDate: data.subscriptionEndDate,
            nextPaymentDate: data.nextPaymentDate,
            recurringTotal: data.recurringTotal,
            billingAddress: data.billingAddress,
            howDidYouHear: data.howDidYouHear,
            isRenewal: data.isRenewal || false,
            paymentMethod: data.paymentMethod || 'Credit Card',
            transactionId: data.transactionId,
            billingFirstName: data.billingFirstName,
            billingLastName: data.billingLastName,
            billingCardAddress: data.billingCardAddress,
            billingCardCity: data.billingCardCity,
            billingCardState: data.billingCardState,
            billingCardZipCode: data.billingCardZipCode,
            paymentType: data.paymentType,
        });

        console.log(`✅ ${context}: Admin order notification email sent`);
        return { success: true };
    } catch (error) {
        console.error(`⚠️ ${context}: Admin order notification email failed:`, error);
        // Don't throw - email failure should not block payment processing
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
