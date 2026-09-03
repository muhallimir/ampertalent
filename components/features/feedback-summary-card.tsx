import type { InterviewFeedbackSummary } from '@/lib/interview-feedback'
import { recommendationLabel } from '@/lib/interview-feedback'

export function FeedbackSummaryCard({ overall, recommendation, weighted, redFlags, highlights }: InterviewFeedbackSummary) {
  return (
    <div data-testid="feedback-summary" className="rounded-md border p-4 text-sm">
      <div className="flex items-center justify-between">
        <div>
          <div data-testid="feedback-overall" className="text-2xl font-semibold">{overall}%</div>
          <div className="text-xs text-gray-500">Weighted {weighted.toFixed(2)} / 5</div>
        </div>
        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
          {recommendationLabel(recommendation)}
        </span>
      </div>
      {highlights.length > 0 && (
        <div className="mt-3">
          <h4 className="text-xs font-semibold uppercase text-emerald-700">Highlights</h4>
          <ul className="mt-1 space-y-0.5 text-xs">
            {highlights.map((h) => <li key={h}>• {h}</li>)}
          </ul>
        </div>
      )}
      {redFlags.length > 0 && (
        <div className="mt-3">
          <h4 className="text-xs font-semibold uppercase text-red-700">Red flags</h4>
          <ul className="mt-1 space-y-0.5 text-xs">
            {redFlags.map((h) => <li key={h}>• {h}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}
