'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

interface ConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive' | 'warning'
  isLoading?: boolean
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  isLoading = false
}: ConfirmationDialogProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'destructive':
        return {
          icon: 'text-red-600',
          button: 'bg-red-600 hover:bg-red-700'
        }
      case 'warning':
        return {
          icon: 'text-orange-600',
          button: 'bg-orange-600 hover:bg-orange-700'
        }
      default:
        return {
          icon: 'text-blue-600',
          button: 'bg-blue-600 hover:bg-blue-700'
        }
    }
  }

  const styles = getVariantStyles()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-full bg-gray-100`}>
              <AlertTriangle className={`h-6 w-6 ${styles.icon}`} />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                {title}
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-gray-600 mt-2">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex space-x-2 sm:space-x-0 gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className={styles.button}
          >
            {isLoading ? 'Processing...' : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}