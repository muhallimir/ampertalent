import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Get Started - AmperTalent",
  description: "Complete your profile setup to start finding remote job opportunities or posting jobs for remote professionals. Quick and easy onboarding process.",
}

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}