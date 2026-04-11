import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Post a New Job - Hire My Mom",
  description: "Create a new job posting to find qualified remote professionals. Reach pre-screened candidates looking for family-friendly remote work opportunities.",
}

export default function NewJobLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}