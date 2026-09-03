import type { CandidateNote } from '@/lib/candidate-notes'

export function NotesList({ notes }: { notes: CandidateNote[] }) {
  if (notes.length === 0) {
    return (
      <div data-testid="notes-empty" className="rounded-md border border-dashed p-3 text-sm text-gray-500">
        No notes yet.
      </div>
    )
  }
  return (
    <ul data-testid="notes-list" className="space-y-2">
      {notes.map((n) => (
        <li key={n.id} className="rounded-md border p-2 text-sm">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">{new Date(n.at).toLocaleString()}</div>
            {n.pinned && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800">pinned</span>}
          </div>
          <p className="mt-1">{n.body}</p>
          {n.tags.length > 0 && (
            <ul className="mt-1 flex flex-wrap gap-1">
              {n.tags.map((t) => (
                <li key={t} className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px]">{t}</li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  )
}
