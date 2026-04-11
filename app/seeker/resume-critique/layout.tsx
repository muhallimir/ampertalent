import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Resume Critique Service - AmperTalent",
  description: "Get professional feedback on your resume from industry experts. Improve your resume with AI-powered analysis and personalized recommendations.",
}

export default function ResumeCritiqueLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}