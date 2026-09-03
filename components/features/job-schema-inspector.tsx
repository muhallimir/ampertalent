import type { JobPostingSchema } from '@/lib/job-posting-schema'

export function JobSchemaInspector({ schema }: { schema: JobPostingSchema }) {
  return (
    <div data-testid="schema-inspector" className="rounded-md border p-3 text-sm">
      <div>
        <span className="text-xs text-gray-500">Title: </span>
        <span data-testid="schema-title">{schema.title}</span>
      </div>
      <div>
        <span className="text-xs text-gray-500">Org: </span>
        <span data-testid="schema-org">{schema.hiringOrganization.name}</span>
      </div>
      <details className="mt-2">
        <summary className="cursor-pointer text-xs">JSON-LD</summary>
        <pre className="mt-1 overflow-auto rounded bg-gray-50 p-2 text-[10px]">{JSON.stringify(schema, null, 2)}</pre>
      </details>
    </div>
  )
}
