export function ImportResultPanel({ total, imported, issues }: { total: number; imported: number; issues: { line: number; field: string; message: string }[] }) {
  if (total > 0 && issues.length === 0) {
    return (
      <div data-testid="import-success" className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
        All rows imported ({imported}/{total}).
      </div>
    )
  }
  return (
    <div data-testid="import-result" className="rounded-md border p-3 text-sm">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold">Import result</h3>
        <span data-testid="import-count" className="font-mono">{imported}/{total}</span>
      </div>
      {issues.length > 0 ? (
        <ul className="space-y-0.5 text-xs">
          {issues.map((i, idx) => (
            <li key={idx}>
              Line {i.line}, {i.field}: {i.message}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-gray-500">No rows found in input.</p>
      )}
    </div>
  )
}
