"use client";

import React from "react";

interface TrashedResume {
    id: string;
    filename: string;
    deletedAt: Date;
}

interface ResumeTrashProps {
    trashedResumes: TrashedResume[];
    onRestore: (id: string) => Promise<void>;
}

export function ResumeTrash({ trashedResumes, onRestore }: ResumeTrashProps) {
    const calculateDaysUntilDelete = (trashedDate: Date): number => {
        const daysSinceDeleted = Math.floor((new Date().getTime() - trashedDate.getTime()) / (1000 * 60 * 60 * 24));
        return 30 - daysSinceDeleted;
    };

    const isExpired = (trashedDate: Date): boolean => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return trashedDate < thirtyDaysAgo;
    };

    if (trashedResumes.length === 0) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <p className="text-gray-500 text-lg">No resumes in trash. Your resumes are safe!</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Trash ({trashedResumes.length})</h3>
            </div>

            <div className="space-y-3">
                {trashedResumes.map((resume) => {
                    const daysRemaining = calculateDaysUntilDelete(resume.deletedAt);
                    const isExpiredResume = isExpired(resume.deletedAt);

                    return (
                        <div
                            key={resume.id}
                            className={`bg-gray-50 border rounded-lg p-4 flex items-center justify-between ${isExpiredResume ? "border-gray-300" : "border-gray-200"
                                }`}
                        >
                            <div className="flex-1">
                                <p className="font-medium text-gray-900">{resume.filename}</p>
                                {isExpiredResume ? (
                                    <p className="text-red-600 text-sm mt-1">Permanently deleted today</p>
                                ) : (
                                    <p className="text-gray-500 text-sm mt-1">
                                        Permanently deleted in {daysRemaining} day{daysRemaining !== 1 ? "s" : ""}
                                    </p>
                                )}
                            </div>

                            <div className="flex gap-2">
                                {!isExpiredResume && (
                                    <button
                                        onClick={() => onRestore(resume.id)}
                                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        Restore
                                    </button>
                                )}
                                {isExpiredResume && <p className="text-gray-500 text-sm font-medium">Permanently deleted</p>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
