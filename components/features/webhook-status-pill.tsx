export function WebhookStatusPill({ status, attempts }: { status: 'pending' | 'delivered' | 'failed'; attempts: number }) {
  const tone =
    status === 'delivered'
      ? 'bg-emerald-100 text-emerald-800'
      : status === 'failed'
      ? 'bg-red-100 text-red-800'
      : 'bg-amber-100 text-amber-800'
  return (
    <span data-testid="webhook-pill" data-status={status} className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>
      {status === 'pending' ? `attempt ${attempts}` : status}
    </span>
  )
}
