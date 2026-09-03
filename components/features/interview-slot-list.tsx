import type { InterviewSlot } from '@/lib/interview-slot-picker'

export function InterviewSlotList({ slots }: { slots: InterviewSlot[] }) {
  if (slots.length === 0) {
    return (
      <div data-testid="slots-empty" className="rounded-md border border-dashed p-3 text-sm text-gray-500">
        No slots available.
      </div>
    )
  }
  return (
    <ul data-testid="slots-list" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {slots.map((s) => {
        const t = new Date(s.start)
        const label = t.toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })
        return (
          <li key={s.start}>
            <button
              type="button"
              data-slot={s.start}
              className="w-full rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
            >
              {label}
              <span className="block text-[10px] text-gray-500">{s.interviewer}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
