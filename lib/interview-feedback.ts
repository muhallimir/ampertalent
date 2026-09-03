export interface InterviewFeedbackInput {
  interviewer: string
  candidateId: string
  /** 1..5 rubric scores. */
  scores: {
    technical: number
    communication: number
    culture: number
    problemSolving: number
  }
  notes: string
  recommendation: 'strong_hire' | 'hire' | 'no_hire' | 'strong_no_hire'
}

export interface InterviewFeedbackSummary {
  overall: number
  recommendation: InterviewFeedbackInput['recommendation']
  weighted: number
  redFlags: string[]
  highlights: string[]
}

const WEIGHTS = {
  technical: 0.4,
  communication: 0.2,
  culture: 0.2,
  problemSolving: 0.2,
} as const

function clampScore(n: number) {
  if (Number.isNaN(n)) return 0
  return Math.max(1, Math.min(5, n))
}

export function summarizeFeedback(input: InterviewFeedbackInput): InterviewFeedbackSummary {
  const t = clampScore(input.scores.technical)
  const c = clampScore(input.scores.communication)
  const cu = clampScore(input.scores.culture)
  const p = clampScore(input.scores.problemSolving)
  const weighted = +(t * WEIGHTS.technical + c * WEIGHTS.communication + cu * WEIGHTS.culture + p * WEIGHTS.problemSolving).toFixed(2)
  const overall = Math.round((weighted / 5) * 100)

  const redFlags: string[] = []
  const highlights: string[] = []
  if (t <= 2) redFlags.push('Technical score is low')
  else if (t >= 4) highlights.push('Strong technical signal')
  if (c <= 2) redFlags.push('Communication may need work')
  else if (c >= 4) highlights.push('Clear communicator')
  if (cu <= 2) redFlags.push('Possible culture mismatch')
  if (p <= 2) redFlags.push('Struggled with problem solving')
  else if (p >= 4) highlights.push('Excellent problem solving')

  if (/no.{0,4}hire/i.test(input.notes)) redFlags.push('Negative phrasing in notes')
  if (/love|amazing|fantastic|excellent/i.test(input.notes)) highlights.push('Positive phrasing in notes')

  return {
    overall,
    recommendation: input.recommendation,
    weighted,
    redFlags,
    highlights,
  }
}

const RECOMMENDATION_LABEL: Record<InterviewFeedbackInput['recommendation'], string> = {
  strong_hire: 'Strong hire',
  hire: 'Hire',
  no_hire: 'No hire',
  strong_no_hire: 'Strong no hire',
}

export function recommendationLabel(rec: InterviewFeedbackInput['recommendation']): string {
  return RECOMMENDATION_LABEL[rec]
}
