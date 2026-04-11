import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "My Profile - Hire My Mom",
  description: "Manage your professional profile, upload your resume, and showcase your skills to potential employers. Build a compelling profile that stands out.",
}

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}