import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Saved Jobs - Hire My Mom",
    description: "Keep track of jobs you're interested in applying to. Manage your saved job opportunities from family-friendly employers.",
};

export default function SavedJobsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}