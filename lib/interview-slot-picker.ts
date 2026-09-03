export interface InterviewSlot {
  /** ISO start. */
  start: string
  /** ISO end. */
  end: string
  interviewer: string
}

export interface DayConfig {
  /** 0 = Sunday, 6 = Saturday */
  weekday: number
  /** Local time "HH:MM". */
  start: string
  end: string
  /** Slot length in minutes. */
  slotMinutes: number
  interviewer: string
}

/** Generate the slots for one weekday given a calendar date (ISO yyyy-mm-dd) and a day config. */
export function slotsForDay(date: string, config: DayConfig): InterviewSlot[] {
  const dt = new Date(`${date}T00:00:00`)
  if (Number.isNaN(dt.getTime())) throw new Error(`slotsForDay: invalid date ${date}`)
  if (dt.getDay() !== config.weekday) return []
  const [sh, sm] = config.start.split(':').map(Number)
  const [eh, em] = config.end.split(':').map(Number)
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) throw new Error('invalid time in config')
  const startMin = sh * 60 + sm
  const endMin = eh * 60 + em
  if (endMin <= startMin) throw new Error('end must be after start')
  const out: InterviewSlot[] = []
  for (let m = startMin; m + config.slotMinutes <= endMin; m += config.slotMinutes) {
    const sH = Math.floor(m / 60)
    const sM = m % 60
    const eH = Math.floor((m + config.slotMinutes) / 60)
    const eM = (m + config.slotMinutes) % 60
    out.push({
      start: `${date}T${String(sH).padStart(2, '0')}:${String(sM).padStart(2, '0')}:00`,
      end: `${date}T${String(eH).padStart(2, '0')}:${String(eM).padStart(2, '0')}:00`,
      interviewer: config.interviewer,
    })
  }
  return out
}

/** Return the next N days (inclusive) that match the given weekday. */
export function nextMatchingDays(today: string, weekday: number, count: number): string[] {
  const start = new Date(`${today}T00:00:00`)
  if (Number.isNaN(start.getTime())) throw new Error(`invalid today ${today}`)
  const out: string[] = []
  const cursor = new Date(start)
  let safety = 0
  while (out.length < count && safety < 366) {
    if (cursor.getDay() === weekday) {
      out.push(cursor.toISOString().slice(0, 10))
    }
    cursor.setDate(cursor.getDate() + 1)
    safety++
  }
  return out
}

export function pickFirstAvailable(
  configs: DayConfig[],
  today: string,
  count: number
): InterviewSlot[] {
  const out: InterviewSlot[] = []
  for (const cfg of configs) {
    const days = nextMatchingDays(today, cfg.weekday, Math.max(1, Math.ceil(count / configs.length) + 2))
    for (const d of days) {
      for (const slot of slotsForDay(d, cfg)) {
        out.push(slot)
        if (out.length >= count) return out
      }
    }
  }
  return out
}
