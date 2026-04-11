'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X, Upload, FileText, Image as ImageIcon, File, CheckCircle } from 'lucide-react'

export interface Attachment {
    id: string
    file: File
    fileName: string
    fileType: string
    fileSize: number
    mimeType: string
    previewUrl?: string
    uploadProgress?: number
    fileUrl?: string
}

interface FileAttachmentUploadProps {
    // Optional controlled value to allow parents to reset/override attachments
    attachments?: Attachment[]
    onAttachmentsChange: (attachments: Attachment[]) => void
    onUploadStateChange?: (isUploading: boolean) => void
    maxFiles?: number
    maxFileSize?: number // in bytes
}

const MAX_FILES = 5
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export function FileAttachmentUpload({
    attachments: externalAttachments,
    onAttachmentsChange,
    onUploadStateChange,
    maxFiles = MAX_FILES,
    maxFileSize = MAX_FILE_SIZE
}: FileAttachmentUploadProps) {
    const [attachments, setAttachments] = useState<Attachment[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Keep internal state in sync when parent clears or overrides attachments
    useEffect(() => {
        if (externalAttachments) {
            setAttachments(externalAttachments)

            // Reset the file input when everything is cleared so the same file can be re-selected
            if (externalAttachments.length === 0 && fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        }
    }, [externalAttachments])

    const getFileType = (file: File): string => {
        if (file.type.startsWith('image/')) return 'image'
        if (file.type.includes('pdf') || file.type.includes('document') || file.type.includes('text')) return 'document'
        return 'file'
    }

    const getFileIcon = (fileType: string) => {
        switch (fileType) {
            case 'image':
                return <ImageIcon className="h-4 w-4" />
            case 'document':
                return <FileText className="h-4 w-4" />
            default:
                return <File className="h-4 w-4" />
        }
    }

    const handleFileSelect = async (files: FileList | null) => {
        if (!files) return

        const newAttachments: Attachment[] = []

        // Allowed image types (no AI/EPS files)
        const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']

        for (let i = 0; i < files.length; i++) {
            const file = files[i]

            // Validate image file types (reject AI and EPS)
            if (file.type.startsWith('image/') && !allowedImageTypes.includes(file.type.toLowerCase())) {
                alert(`File "${file.name}" has an unsupported image format. Please use JPG, JPEG, PNG, or GIF.`)
                continue
            }

            // Validate file size
            if (file.size > maxFileSize) {
                alert(`File "${file.name}" is too large. Maximum size is ${maxFileSize / (1024 * 1024)}MB.`)
                continue
            }

            // Validate total files
            if (attachments.length + newAttachments.length >= maxFiles) {
                alert(`Maximum ${maxFiles} files allowed.`)
                break
            }

            const attachment: Attachment = {
                id: Math.random().toString(36).substr(2, 9),
                file,
                fileName: file.name,
                fileType: getFileType(file),
                fileSize: file.size,
                mimeType: file.type,
                uploadProgress: 0,
            }

            // Create preview for images
            if (attachment.fileType === 'image') {
                const previewUrl = URL.createObjectURL(file)
                attachment.previewUrl = previewUrl
            }

            newAttachments.push(attachment)
        }

        if (newAttachments.length > 0) {
            const updatedAttachments = [...attachments, ...newAttachments]
            setAttachments(updatedAttachments)
            onAttachmentsChange(updatedAttachments)

            // Auto-upload the new files
            await uploadFiles(newAttachments)
        }

        // Always clear the file input so selecting the same file again triggers onChange
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const uploadAttachment = async (attachment: Attachment): Promise<Attachment> => {
        try {
            // Update progress to show uploading
            setAttachments(prev => prev.map(att =>
                att.id === attachment.id ? { ...att, uploadProgress: 0 } : att
            ))

            const response = await fetch('/api/upload/presigned-url', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fileName: attachment.file.name,
                    fileType: attachment.file.type,
                    fileSize: attachment.file.size,
                }),
            })

            if (!response.ok) {
                throw new Error('Failed to get presigned URL')
            }

            const { uploadUrl, fileUrl } = await response.json()

            // Update progress to 50%
            setAttachments(prev => prev.map(att =>
                att.id === attachment.id ? { ...att, uploadProgress: 50 } : att
            ))

            // Upload the file to S3
            const uploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                body: attachment.file,
                headers: {
                    'Content-Type': attachment.file.type,
                },
            })

            if (!uploadResponse.ok) {
                throw new Error('Failed to upload file to S3')
            }

            // Update progress to 100%
            setAttachments(prev => prev.map(att =>
                att.id === attachment.id ? { ...att, uploadProgress: 100 } : att
            ))

            // Return attachment with upload URL (attachment record will be created when message is sent)
            return {
                ...attachment,
                fileUrl: fileUrl,
                uploadProgress: 100,
            }
        } catch (error) {
            console.error('Upload failed:', error)
            // Reset progress on error
            setAttachments(prev => prev.map(att =>
                att.id === attachment.id ? { ...att, uploadProgress: undefined } : att
            ))
            throw error
        }
    }

    const uploadFiles = async (filesToUpload: Attachment[] = attachments) => {
        if (filesToUpload.length === 0) return

        onUploadStateChange?.(true)

        try {
            const uploadedAttachments: Attachment[] = []

            for (const attachment of filesToUpload) {
                if (!attachment.fileUrl) {
                    const uploaded = await uploadAttachment(attachment)
                    uploadedAttachments.push(uploaded)
                } else {
                    uploadedAttachments.push(attachment)
                }
            }

            // Update the attachments with uploaded versions using functional update
            setAttachments(prevAttachments => {
                const updatedAttachments = prevAttachments.map(att => {
                    const uploaded = uploadedAttachments.find(u => u.id === att.id)
                    return uploaded || att
                })
                onAttachmentsChange(updatedAttachments)
                return updatedAttachments
            })
        } catch (error) {
            console.error('Upload failed:', error)
            alert('Failed to upload some files. Please try again.')
        } finally {
            onUploadStateChange?.(false)
        }
    }

    const removeAttachment = async (id: string) => {
        const attachmentToRemove = attachments.find(att => att.id === id)

        // If the attachment has been uploaded to S3, delete it from storage
        if (attachmentToRemove?.fileUrl) {
            try {
                await fetch('/api/upload/delete', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        fileUrl: attachmentToRemove.fileUrl,
                    }),
                })
            } catch (error) {
                console.error('Failed to delete file from storage:', error)
                // Continue with local removal even if S3 deletion fails
            }
        }

        const updatedAttachments = attachments.filter(att => att.id !== id)
        setAttachments(updatedAttachments)
        onAttachmentsChange(updatedAttachments)

        // Clean up preview URLs
        if (attachmentToRemove?.previewUrl) {
            URL.revokeObjectURL(attachmentToRemove.previewUrl)
        }

        // Clear the file input so users can re-attach the same file if needed
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    return (
        <div className="space-y-3">
            {/* File Input */}
            <div className="flex items-center gap-2">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={attachments.length >= maxFiles}
                    className="flex items-center gap-2"
                >
                    <Upload className="h-4 w-4" />
                    Add Files
                </Button>
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.mp4,.mov"
                    onChange={(e) => handleFileSelect(e.target.files)}
                    className="hidden"
                />
            </div>

            {/* Attachment List */}
            {attachments.length > 0 && (
                <div className="space-y-2">
                    {attachments.map((attachment, index) => (
                        <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border"
                        >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="flex-shrink-0">
                                    {getFileIcon(attachment.file.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                        {attachment.file.name}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {formatFileSize(attachment.file.size)}
                                        {attachment.fileUrl ? (
                                            <span className="ml-2 text-green-600 dark:text-green-400 flex items-center gap-1">
                                                <CheckCircle className="h-3 w-3" />
                                                Ready to send
                                            </span>
                                        ) : (attachment.uploadProgress && attachment.uploadProgress > 0) ? (
                                            <span className="ml-2 text-blue-600 dark:text-blue-400">
                                                Uploading... {attachment.uploadProgress}%
                                            </span>
                                        ) : (
                                            <span className="ml-2 text-orange-600 dark:text-orange-400">
                                                Pending upload
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeAttachment(attachment.id)}
                                className="flex-shrink-0 text-gray-400 hover:text-red-500"
                                disabled={false}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
