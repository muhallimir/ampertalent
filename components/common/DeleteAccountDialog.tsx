'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

interface DeleteAccountDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  description?: string
  confirmText?: string
}

export function DeleteAccountDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Delete Account",
  description = "Are you sure you want to delete your account? This action is permanent and cannot be undone. All your data will be removed from our system.",
  confirmText = "Delete Account"
}: DeleteAccountDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleConfirm = async () => {
    setIsDeleting(true)
    try {
      await onConfirm()
    } finally {
      setIsDeleting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 !my-0">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center mb-4">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 ml-3">{title}</h3>
          </div>
          <p className="text-gray-600 mb-6">
            {description}
          </p>
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
