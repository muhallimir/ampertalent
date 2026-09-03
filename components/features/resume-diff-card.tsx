import type { ResumeDiff } from '@/lib/resume-diff'

export function ResumeDiffCard(props: ResumeDiff) {
  if (props.addedSkills.length === 0 && props.removedSkills.length === 0 && props.addedBullets.length === 0) {
    return <div data-testid="diff-empty" className="rounded-md border border-dashed p-3 text-sm text-gray-500">No changes.</div>
  }
  return (
    <div data-testid="diff-card" className="rounded-md border p-3 text-sm">
      <p data-testid="diff-summary" className="text-xs text-gray-600">{props.summary}</p>
      <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
        <div>
          <h4 className="font-medium text-emerald-700">Added</h4>
          {props.addedSkills.length > 0 && (
            <ul>{props.addedSkills.map((s) => <li key={s}>+ {s}</li>)}</ul>
          )}
          {props.addedBullets.length > 0 && (
            <ul className="mt-1 text-gray-500">
              {props.addedBullets.map((b) => <li key={b}>+ {b}</li>)}
            </ul>
          )}
        </div>
        <div>
          <h4 className="font-medium text-red-700">Removed</h4>
          {props.removedSkills.length > 0 && (
            <ul>{props.removedSkills.map((s) => <li key={s}>- {s}</li>)}</ul>
          )}
          {props.removedBullets.length > 0 && (
            <ul className="mt-1 text-gray-500">
              {props.removedBullets.map((b) => <li key={b}>- {b}</li>)}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
