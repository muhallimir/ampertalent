import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Concierge Service - Hire My Mom",
  description: "Premium candidate shortlisting service. Let our experts find and pre-screen the best candidates for your job openings. Save time and find quality talent faster.",
}

export default function ConciergeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}