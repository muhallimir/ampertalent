"use client";

import React, { useState } from "react";

interface ResumeDeleteDialogProps {
    isOpen: boolean;
    resumeFilename: string;
    activeApplicationCount: number;
    activeApplications?: Array<{ jobId: string; jobTitle: string }>;
    onConfirm: () => Promise<void>;
    onCancel: () => void;
}

export function ResumeDeleteDialog({
    isOpen,
    resumeFilename,
    activeApplicationCount,
    activeApplications = [],
    onConfirm,
    onCancel,
}: ResumeDeleteDialogProps) {
    const [isLoading, setIsLoading] = useState(false);

    const permanentDeleteDate = new Date();
    permanentDeleteDate.setDate(permanentDeleteDate.getDate() + 30);

    if (!isOpen) return null;

    const handleConfirm = async () => {
        setIsLoading(true);
        try {
            await onConfirm();
        } finally {
            setIsLoading(false);
        }
    };

    const canDelete = activeApplicationCount === 0;

    return (
        <>
            <div className="fixed inset-0 bg-black/50 z-40" onClick={onCancel} />
            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md">
                <div className="bg-white rounded-lg shadow-xl p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Delete Resume?</h2>
                    <p className="text-lg font-semibold text-gray-700 mb-6 p-3 bg-gray-50 rounded-md">
                        &quot;{resumeFilename}&quot;
                    </p>

                    {activeApplicationCount > 0 && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="font-semibold text-red-900 flex items-center gap-2 mb-2">
                                <span>⚠️</span>
                                <span>Active Applications Warning</span>
                            </p>
                            <p className="text-red-800 mb-3">
                                This resume is currently used in{" "}
                                <strong>
                                    {activeApplicationCount} job application{activeApplicationCount > 1 ? "s" : ""}
                                </strong>
                                :
                            </p>
                            <ul className="space-y-1 ml-4 mb-3">
                                {activeApplications.map((app) => (
                                    <li key={app.jobId} className="text-red-800 list-disc text-sm">
                                        {app.jobTitle}
                                    </li>
                                ))}
                            </ul>
                            <p className="text-red-800 font-medium">
                                You must withdraw or complete these applications first.
                            </p>
                        </div>
                    )}

                    {canDelete && (
                        <div className="space-y-4 mb-6">
                            <p className="text-gray-700">
                                This resume will be moved to trash and can be recovered within <strong>30 days</strong>.
                            </p>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm font-semibold text-blue-900 mb-1">Permanent deletion date:</p>
                                <p className="text-lg font-bold text-blue-900 mb-2">
                                    {permanentDeleteDate.toLocaleDateString("en-US", {
                                        month: "long",
                                        day: "numeric",
                                        year: "numeric",
                                    })}
                                </p>
                                <p className="text-xs text-gray-600">
                                    After this date, the resume will be permanently deleted and cannot be recovered.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={onCancel}
                            disabled={isLoading}
                            className="flex-1 px-4 py-2 rounded-lg font-medium transition-colors bg-gray-100 text-gray-900 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={isLoading || !canDelete}
                            className="flex-1 px-4 py-2 rounded-lg font-medium transition-colors bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? "Moving to Trash..." : "Move to Trash"}
                        </button>
                    </div>

                    {!canDelete && (
                        <p className="text-xs text-gray-500 mt-3 text-center">
                            Resolve active applications to delete this resume
                        </p>
                    )}
                </div>
            </div>
        </>
    );
}
