export interface OnboardingStep {
  id: string
  label: string
  completed: boolean
  required: boolean
  href?: string
}

export interface OnboardingProgress {
  total: number
  done: number
  requiredTotal: number
  requiredDone: number
  percent: number
  remaining: OnboardingStep[]
  blocked: boolean
}

export function progress(steps: OnboardingStep[]): OnboardingProgress {
  const total = steps.length
  const done = steps.filter((s) => s.completed).length
  const required = steps.filter((s) => s.required)
  const requiredTotal = required.length
  const requiredDone = required.filter((s) => s.completed).length
  const percent = total === 0 ? 100 : Math.round((done / total) * 100)
  return {
    total,
    done,
    requiredTotal,
    requiredDone,
    percent,
    remaining: steps.filter((s) => !s.completed),
    blocked: requiredDone < requiredTotal,
  }
}

export function nextStep(steps: OnboardingStep[]): OnboardingStep | null {
  const pending = steps.find((s) => !s.completed)
  return pending ?? null
}
