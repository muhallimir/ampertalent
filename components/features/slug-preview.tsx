export function SlugPreview({ source, slug }: { source: string; slug: string }) {
  return (
    <div data-testid="slug-preview" className="rounded-md border p-3 text-sm">
      <div className="text-xs text-gray-500">From: {source}</div>
      <code data-testid="slug-value" className="mt-1 block font-mono">{slug}</code>
    </div>
  )
}
