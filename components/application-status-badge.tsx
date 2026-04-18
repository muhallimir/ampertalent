"use client";

import React from "react";

interface ApplicationBadgeProps {
    status: string;
    submittedAt: Date;
    lastUpdatedAt?: Date;
    resumeFilename: string;
    jobTitle: string;
    onViewJob?: () => void;
    onWithdraw?: () => void;
    onAccept?: () => void;
    onViewDetails?: () => void;
    onMessageEmployer?: () => void;
    onApplyAgain?: () => void;
}

export function ApplicationStatusBadge({
    status,
    submittedAt,
    lastUpdatedAt,
    resumeFilename,
    jobTitle,
    onViewJob,
    onWithdraw,
    onAccept,
    onViewDetails,
    onMessageEmployer,
    onApplyAgain,
}: ApplicationBadgeProps) {
    const statusColors: Record<string, string> = {
        pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
        viewed: "bg-blue-100 text-blue-800 border-blue-200",
        shortlisted: "bg-green-100 text-green-800 border-green-200",
        rejected: "bg-red-100 text-red-800 border-red-200",
        accepted: "bg-green-200 text-green-900 border-green-300",
    };

    const statusLabels: Record<string, string> = {
        pending: "Pending Review",
        viewed: "Viewed",
        shortlisted: "Shortlisted",
        rejected: "Not Selected",
        accepted: "Accepted",
    };

    const getActionButtons = (stat: string): Array<{ label: string; onClick?: () => void }> => {
        const actions: Record<string, Array<{ label: string; onClick?: () => void }>> = {
            pending: [
                { label: "View Job", onClick: onViewJob },
                { label: "Withdraw", onClick: onWithdraw },
            ],
            viewed: [
                { label: "View Job", onClick: onViewJob },
                { label: "Withdraw", onClick: onWithdraw },
            ],
            shortlisted: [
                { label: "Accept", onClick: onAccept },
                { label: "Withdraw", onClick: onWithdraw },
            ],
            rejected: [
                { label: "View Job", onClick: onViewJob },
                { label: "Apply Again", onClick: onApplyAgain },
            ],
            accepted: [
                { label: "View Details", onClick: onViewDetails },
                { label: "Message Employer", onClick: onMessageEmployer },
            ],
        };
        return actions[stat] || [];
    };

    const daysSince = Math.floor((new Date().getTime() - submittedAt.getTime()) / (1000 * 60 * 60 * 24));
    const actionButtons = getActionButtons(status);

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <h4 className="text-lg font-semibold text-gray-900">{jobTitle}</h4>
                </div>
                <div
                    className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColors[status] || statusColors.pending}`}
                >
                    {statusLabels[status] || status}
                </div>
            </div>

            <div className="space-y-2 mb-4 pb-4 border-b border-gray-100">
                <p className="text-sm text-gray-600">
                    <span className="font-semibold text-gray-700">Resume:</span>
                    <span className="ml-2 text-gray-900 font-medium">{resumeFilename}</span>
                </p>
                <p className="text-sm text-gray-500">Applied {daysSince > 0 ? `${daysSince} days ago` : "today"}</p>
                {lastUpdatedAt && (
                    <p className="text-xs text-gray-400">
                        Last updated:{" "}
                        {lastUpdatedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                )}
            </div>

            <div className="flex flex-wrap gap-2">
                {actionButtons.map((action) => (
                    <button
                        key={action.label}
                        onClick={action.onClick}
                        className="px-3 py-2 text-sm font-medium rounded-md transition-colors bg-gray-100 text-gray-900 hover:bg-gray-200"
                    >
                        {action.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
