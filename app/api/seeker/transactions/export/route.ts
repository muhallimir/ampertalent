import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

interface TransactionCSVRow {
  id: string;
  date: string;
  description: string;
  amount: string;
  currency: string;
  status: string;
  payment_method: string;
  subscription_id: string;
  plan: string;
  invoice_number: string;
}

const normalizePlanLabel = (planId: string) =>
  planId
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

interface PlanDisplayConfig {
  label: string;
  planLabel?: string;
  prefix: string;
  informational?: boolean;
}

const SUBSCRIPTION_PLAN_DISPLAY_MAP: Record<string, PlanDisplayConfig> = {
  trial_monthly: { label: 'Trial Monthly Subscription', planLabel: 'Trial Monthly Subscription', prefix: 'SUB', informational: true },
  gold_bimonthly: { label: 'Gold Bimonthly Subscription', planLabel: 'Gold Bimonthly Subscription', prefix: 'SUB' },
  vip_quarterly: { label: 'VIP Quarterly Subscription', planLabel: 'VIP Quarterly Subscription', prefix: 'SUB' },
  annual_platinum: { label: 'Annual Platinum Subscription', planLabel: 'Annual Platinum Subscription', prefix: 'SUB' },
  none: { label: 'No Plan', planLabel: 'No Plan', prefix: 'SUB', informational: true }
};

const EXTERNAL_PLAN_DISPLAY_MAP: Record<string, PlanDisplayConfig> = {
  trial: { label: 'Subscription payment for Trial', planLabel: 'Trial Subscription', prefix: 'SUB', informational: true },
  gold: { label: 'Subscription payment for Gold', planLabel: 'Gold Subscription', prefix: 'SUB' },
  vip: { label: 'Subscription payment for VIP', planLabel: 'VIP Subscription', prefix: 'SUB' },
  'vip-platinum': { label: 'Subscription payment for VIP Platinum', planLabel: 'VIP Platinum Subscription', prefix: 'SUB' },
  'annual-platinum': { label: 'Subscription payment for Annual Platinum', planLabel: 'Annual Platinum Subscription', prefix: 'SUB' },
  annual_platinum: { label: 'Subscription payment for Annual Platinum', planLabel: 'Annual Platinum Subscription', prefix: 'SUB' },
  rush_critique: { label: 'Payment for Rush Critique', planLabel: 'Rush Critique', prefix: 'PAY' },
  standard_critique: { label: 'Payment for Standard Critique', planLabel: 'Standard Critique', prefix: 'PAY' }
};

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a seeker
    if (currentUser.profile.role !== 'seeker') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const userId = currentUser.profile.id;

    // Fetch subscriptions for this seeker (primary payment records)
    const subscriptions = await db.subscription.findMany({
      where: {
        seekerId: userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`📊 SEEKER CSV EXPORT: Found ${subscriptions.length} subscriptions for user ${userId}`);

    // Also fetch external payments as backup data source
    const externalPayments = await db.externalPayment.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`📊 SEEKER CSV EXPORT: Found ${externalPayments.length} external payments for user ${userId}`);

    const externalGhlTransactionIds = new Set(
      externalPayments.map((payment: any) => payment.ghlTransactionId).filter((id: string | null | undefined): id is string => Boolean(id)),
    );

    // Transform subscriptions to CSV format, only when no matching external payment exists
    const subscriptionRows: TransactionCSVRow[] = subscriptions
      .filter((subscription: any) => {
        if (!subscription.ghlTransactionId) {
          return true;
        }
        return !externalGhlTransactionIds.has(subscription.ghlTransactionId);
      })
      .map((subscription: any) => {
        // Map plan names to readable format and estimated pricing
        const planPricing: Record<string, number> = {
          trial_monthly: 34.99,
          gold_bimonthly: 49.99,
          vip_quarterly: 79.99,
          annual_platinum: 299.0,
          none: 0,
        };

        const planNames: Record<string, string> = {
          trial_monthly: 'Trial Monthly',
          gold_bimonthly: 'Gold Bimonthly',
          vip_quarterly: 'VIP Quarterly',
          annual_platinum: 'Annual Platinum',
          none: 'Free Plan',
        };

        const planName = planNames[subscription.plan] || normalizePlanLabel(subscription.plan);
        const display =
          SUBSCRIPTION_PLAN_DISPLAY_MAP[subscription.plan] || {
            label: `${planName} Subscription`,
            planLabel: planName,
            prefix: 'SUB',
          };

        return {
          id: subscription.id,
          date: subscription.createdAt.toISOString().split('T')[0], // YYYY-MM-DD format
          description: display.label,
          amount: display.informational ? '0.00' : planPricing[subscription.plan] ? planPricing[subscription.plan].toFixed(2) : '0.00',
          currency: 'USD',
          status: display.informational
            ? 'Informational'
            : subscription.status === 'active'
            ? 'Paid'
            : subscription.status === 'canceled'
            ? 'Cancelled'
            : subscription.status === 'past_due'
            ? 'Past Due'
            : subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1),
          payment_method: display.informational ? 'N/A' : 'Credit Card',
          subscription_id: subscription.authnetSubscriptionId || subscription.id,
          plan: display.planLabel || planName,
          invoice_number: `${display.prefix}-${subscription.id.slice(-8).toUpperCase()}`,
        };
      });

    // Transform external payments to CSV format as additional data
    const externalRows: TransactionCSVRow[] = externalPayments.map((payment: any) => {
      const numericAmount = typeof payment.amount === 'string' ? parseFloat(payment.amount) : Number(payment.amount);
      const display =
        EXTERNAL_PLAN_DISPLAY_MAP[payment.planId] || {
          label: `Payment for ${normalizePlanLabel(payment.planId)}`,
          planLabel: normalizePlanLabel(payment.planId),
          prefix: 'PAY',
        };

      return {
        id: payment.id,
        date: payment.createdAt.toISOString().split('T')[0],
        description: display.label,
        amount: (isNaN(numericAmount) ? 0 : numericAmount).toFixed(2),
        currency: 'USD',
        status: display.informational ? 'Informational' : payment.status === 'completed' ? 'Paid' : payment.status,
        payment_method: display.informational ? 'N/A' : 'Credit Card',
        subscription_id: payment.ghlTransactionId || payment.id,
        plan: display.planLabel || normalizePlanLabel(payment.planId),
        invoice_number: `${display.prefix}-${payment.id.slice(-8).toUpperCase()}`,
      };
    });

    // Combine all transaction rows
    const transactionRows = [...subscriptionRows, ...externalRows].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    console.log(`📊 SEEKER CSV EXPORT: Total ${transactionRows.length} transactions to export`);

    // Generate CSV content
    const headers = [
      'Invoice Number',
      'Date',
      'Description',
      'Amount',
      'Currency',
      'Status',
      'Payment Method',
      'Subscription ID',
      'Plan',
      'Internal ID',
    ];

    let csvRows: string[];

    if (transactionRows.length === 0) {
      // If no data, add a sample row indicating no transactions
      csvRows = [headers.join(','), '"No transactions found","","No subscription history available","0.00","USD","","","","",""'];
      console.log(`📊 SEEKER CSV EXPORT: No transactions found, exporting empty CSV with headers`);
    } else {
      csvRows = [
        headers.join(','),
        ...transactionRows.map((row) =>
          [
            `"${row.invoice_number}"`,
            `"${row.date}"`,
            `"${row.description.replace(/"/g, '""')}"`, // Escape quotes in description
            `"${row.amount}"`,
            `"${row.currency}"`,
            `"${row.status}"`,
            `"${row.payment_method}"`,
            `"${row.subscription_id}"`,
            `"${row.plan}"`,
            `"${row.id}"`,
          ].join(','),
        ),
      ];
    }

    const csvContent = csvRows.join('\n');

    // Generate filename with current date
    const currentDate = new Date().toISOString().split('T')[0];
    const filename = `hiremymom-seeker-transactions-${currentDate}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error exporting seeker transactions:', error);
    return NextResponse.json({ error: 'Failed to export transaction history' }, { status: 500 });
  }
}
