import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Manage Job Postings - Hire My Mom",
  description: "Manage your job postings, review applications, and find qualified remote professionals. Track hiring progress and candidate interactions.",
}

export default function EmployerJobsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}