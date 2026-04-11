import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Browse Remote Jobs - Hire My Mom",
  description: "Find vetted remote job opportunities from family-friendly employers. Search and filter jobs by location, salary, schedule, and more.",
}

export default function JobsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}