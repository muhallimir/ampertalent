import { Metadata } from 'next'
import WebhookManager from '@/components/admin/WebhookManager'

export const metadata: Metadata = {
  title: 'Webhook Management - Admin Dashboard',
  description: 'Manage and test external webhook endpoints'
}

export default function WebhooksPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Webhook Management</h1>
        <p className="text-gray-600 mt-2">
          Configure and test external webhook endpoints for real-time notifications
        </p>
      </div>
      
      <WebhookManager />
    </div>
  )
}