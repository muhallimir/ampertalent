"use client";

import React from "react";

interface ResumeQuotaProps {
    current: number;
    limit: number;
    nextRefreshDate: Date;
}

export function ResumeQuota({ current, limit, nextRefreshDate }: ResumeQuotaProps) {
    const percent = (current / limit) * 100;
    const isWarning = percent >= 80;
    const isFull = percent === 100;

    const statusMessage = isFull
        ? "Resume limit reached"
        : isWarning
            ? `Resume quota nearly full (${Math.round(percent)}%)`
            : `Resume quota usage (${Math.round(percent)}%)`;

    return (
        <div className="space-y-4 bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">My Resumes</h3>
                <span className="text-2xl font-bold text-gray-700">
                    {current}/{limit}
                </span>
            </div>

            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                    className={`h-3 rounded-full transition-all duration-300 ${isFull ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-blue-500"
                        }`}
                    style={{ width: `${Math.min(percent, 100)}%` }}
                />
            </div>

            <p
                className={`text-sm font-medium ${isFull ? "text-red-600" : isWarning ? "text-amber-600" : "text-gray-600"
                    }`}
            >
                {statusMessage}
            </p>

            {isFull && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
                    <p className="font-medium text-red-900">Options to free up quota:</p>
                    <ul className="space-y-2">
                        <li className="flex items-start gap-2 text-red-800">
                            <span className="inline-block w-1.5 h-1.5 mt-2 bg-red-600 rounded-full flex-shrink-0" />
                            <span>Delete unused resumes</span>
                        </li>
                        <li className="flex items-start gap-2 text-red-800">
                            <span className="inline-block w-1.5 h-1.5 mt-2 bg-red-600 rounded-full flex-shrink-0" />
                            <a href="/upgrade" className="font-semibold hover:underline">
                                Upgrade to higher plan
                            </a>
                        </li>
                        <li className="flex items-start gap-2 text-red-800">
                            <span className="inline-block w-1.5 h-1.5 mt-2 bg-red-600 rounded-full flex-shrink-0" />
                            <span>Wait for next billing period ({nextRefreshDate.toLocaleDateString()})</span>
                        </li>
                    </ul>
                </div>
            )}

            {!isFull && (
                <p className="text-xs text-gray-500">
                    Quota refreshes on {nextRefreshDate.toLocaleDateString()}
                </p>
            )}
        </div>
    );
}
