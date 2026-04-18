"use client";

import React from "react";

interface SubscriptionDetailsProps {
    plan: string;
    status: string;
    price: number;
    billingFrequency: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    nextBillingDate: Date;
    resumeLimit: number;
}

export function SubscriptionDetails({
    plan,
    status,
    price,
    billingFrequency,
    currentPeriodStart,
    currentPeriodEnd,
    nextBillingDate,
    resumeLimit,
}: SubscriptionDetailsProps) {
    const planNames: Record<string, string> = {
        trial_monthly: "Trial - Monthly",
        gold_bimonthly: "Gold - Bi-Monthly",
        vip_quarterly: "VIP Platinum - Quarterly",
        annual_platinum: "Annual Platinum",
    };

    const frequencyText: Record<string, string> = {
        "1-month": "Monthly",
        "2-months": "Every 2 Months",
        "3-months": "Quarterly",
        "12-months": "Annually",
    };

    const daysRemaining = Math.floor(
        (currentPeriodEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    const formatDate = (date: Date): string =>
        date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    return (
        <div className="space-y-6 bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="border-b border-gray-200 pb-6">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">{planNames[plan] || plan}</h2>
                        <p className="text-sm text-gray-500 mt-1">{frequencyText[billingFrequency] || billingFrequency}</p>
                    </div>
                    <div
                        className={`px-3 py-1 rounded-full text-sm font-medium ${status === "active"
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-700"
                            }`}
                    >
                        {status === "active" ? "✓ Active" : status}
                    </div>
                </div>

                <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-gray-900">${price.toFixed(2)}</span>
                    <span className="text-gray-500">{frequencyText[billingFrequency]}</span>
                </div>
            </div>

            <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                    Current Billing Period
                </h3>
                <p className="text-gray-900 mb-2">
                    <span className="font-medium">{formatDate(currentPeriodStart)}</span>
                    <span className="text-gray-400 mx-2">—</span>
                    <span className="font-medium">{formatDate(currentPeriodEnd)}</span>
                </p>
                <p className="text-lg font-semibold text-blue-600">{daysRemaining} days remaining</p>
            </div>

            <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Next Billing Date</h3>
                <p className="text-lg font-semibold text-gray-900">{formatDate(nextBillingDate)}</p>
            </div>

            <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Plan Includes</h3>
                <ul className="space-y-2">
                    {[
                        `${resumeLimit} Resumes`,
                        "Job Applications Tracking",
                        "Resume Analytics",
                        "Priority Support",
                    ].map((feature) => (
                        <li key={feature} className="flex items-center text-gray-700">
                            <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-3" />
                            <span className={feature.includes("Resumes") ? "font-medium" : ""}>{feature}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
