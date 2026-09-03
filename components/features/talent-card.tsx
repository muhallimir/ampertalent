export interface TalentCardProps {
  id: string
  name: string
  headline: string
  skills: string[]
  yearsExperience: number
  status: 'open' | 'casual' | 'closed'
  score: number
}

export function TalentCard(props: TalentCardProps) {
  return (
    <div data-testid="talent-card" data-talent-id={props.id} className="rounded-md border p-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">{props.name}</div>
          <div className="text-xs text-gray-500">{props.headline}</div>
        </div>
        {props.score > 0 && (
          <span data-testid="talent-score" className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
            {Math.round(props.score)}%
          </span>
        )}
      </div>
      <ul className="mt-2 flex flex-wrap gap-1">
        {props.skills.map((s) => (
          <li key={s} className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px]">{s}</li>
        ))}
      </ul>
      <div className="mt-2 text-[11px] text-gray-500">
        {props.yearsExperience}y exp · {props.status}
      </div>
    </div>
  )
}
