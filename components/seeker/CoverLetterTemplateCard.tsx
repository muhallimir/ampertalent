'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Edit, Trash2, Star, StarOff, FileText, Loader2 } from 'lucide-react'

interface CoverLetterTemplate {
  id: string
  title: string
  content: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

interface CoverLetterTemplateCardProps {
  template: CoverLetterTemplate
  onEdit: (template: CoverLetterTemplate) => void
  onDelete: (templateId: string) => Promise<void> | void
  onSetDefault: (templateId: string) => Promise<void> | void
  isDeleting?: boolean
  isSettingDefault?: boolean
}

export function CoverLetterTemplateCard({
  template,
  onEdit,
  onDelete,
  onSetDefault,
  isDeleting = false,
  isSettingDefault = false
}: CoverLetterTemplateCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleEdit = () => {
    onEdit(template)
  }

  const handleDelete = () => {
    setShowDeleteDialog(true)
  }

  const confirmDelete = async () => {
    await onDelete(template.id)
    setShowDeleteDialog(false)
  }

  const handleSetDefault = () => {
    if (!template.isDefault && !isSettingDefault) {
      onSetDefault(template.id)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getPreviewText = (content: string, maxLength: number = 150) => {
    // Strip HTML tags for preview
    const textContent = content.replace(/<[^>]*>/g, '')
    if (textContent.length <= maxLength) return textContent
    return textContent.substring(0, maxLength) + '...'
  }

  return (
    <>
      <Card className="h-full flex flex-col hover:shadow-md transition-shadow">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-medium truncate">
                {template.title}
              </CardTitle>
              <CardDescription className="text-sm text-gray-500 mt-1">
                Updated {formatDate(template.updatedAt)}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-1 ml-2">
              {template.isDefault && (
                <Badge variant="default" className="text-xs">
                  Default
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col">
          {/* Content Preview */}
          <div className="flex-1 mb-4">
            <div className="text-sm text-gray-600 leading-relaxed">
              {getPreviewText(template.content)}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleEdit}
                className="flex items-center space-x-1"
                disabled={isDeleting || isSettingDefault}
              >
                <Edit className="h-3 w-3" />
                <span>Edit</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                className="flex items-center space-x-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3 w-3" />
                    <span>Delete</span>
                  </>
                )}
              </Button>
            </div>

            <Button
              variant={template.isDefault ? "secondary" : "outline"}
              size="sm"
              onClick={handleSetDefault}
              disabled={template.isDefault || isSettingDefault || isDeleting}
              className="flex items-center space-x-1"
            >
              {isSettingDefault ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Updating...</span>
                </>
              ) : template.isDefault ? (
                <>
                  <Star className="h-3 w-3 fill-current" />
                  <span>Default</span>
                </>
              ) : (
                <>
                  <StarOff className="h-3 w-3" />
                  <span>Set Default</span>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{template.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete Template'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
