'use client'

import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { FileText, Eye, Download, Loader2 } from 'lucide-react'

interface AttachmentPreviewProps {
    attachment: {
        id: string
        fileName: string
        fileUrl: string
        fileType: string
        fileSize: number
        mimeType?: string
    }
    isCurrentUser: boolean
    onDownload: (attachmentId: string, fileName: string) => void
    getHeaders?: () => HeadersInit
}

export function AttachmentPreview({ attachment, isCurrentUser, onDownload, getHeaders }: AttachmentPreviewProps) {
    const [isViewModalOpen, setIsViewModalOpen] = useState(false)
    const [imageError, setImageError] = useState(false)
    const [presignedUrl, setPresignedUrl] = useState<string | null>(null)
    const [isLoadingUrl, setIsLoadingUrl] = useState(false)
    const [isViewingPDF, setIsViewingPDF] = useState(false)
    const hasFetchedRef = useRef(false)

    // More comprehensive image detection
    const fileExtension = attachment.fileName.split('.').pop()?.toLowerCase()
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp']
    const isImage = attachment.mimeType?.startsWith('image/') ||
        attachment.fileType === 'image' ||
        (fileExtension && imageExtensions.includes(fileExtension))
    const isPDF = attachment.mimeType === 'application/pdf' || fileExtension === 'pdf'

    // Fetch presigned URL for images — runs once per attachment id
    useEffect(() => {
        if (!isImage || hasFetchedRef.current) return
        hasFetchedRef.current = true
        const fetchPresignedUrl = async () => {
            setIsLoadingUrl(true)
            try {
                const response = await fetch(
                    `/api/messages/attachments/download/${attachment.id}`,
                    { headers: getHeaders ? getHeaders() : {} }
                )
                if (response.ok) {
                    const data = await response.json()
                    setPresignedUrl(data.downloadUrl)
                } else {
                    setImageError(true)
                }
            } catch (error) {
                console.error('Failed to fetch presigned URL for image:', error)
                setImageError(true)
            } finally {
                setIsLoadingUrl(false)
            }
        }
        fetchPresignedUrl()
    }, [isImage, attachment.id]) // eslint-disable-line react-hooks/exhaustive-deps

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
    }

    const handleViewPDF = async () => {
        if (!isPDF) {
            setIsViewModalOpen(true)
            return
        }

        try {
            setIsViewingPDF(true)
            const response = await fetch(
                `/api/messages/attachments/download/${attachment.id}`,
                { headers: getHeaders ? getHeaders() : {} }
            )
            if (response.ok) {
                const data = await response.json()
                window.open(data.downloadUrl, '_blank')
            } else {
                console.error('Failed to get presigned URL for PDF')
                // Fallback to direct URL
                window.open(attachment.fileUrl, '_blank')
            }
        } catch (error) {
            console.error('Error viewing PDF:', error)
            // Fallback to direct URL
            window.open(attachment.fileUrl, '_blank')
        } finally {
            setIsViewingPDF(false)
        }
    }

    return (
        <>
            {/* Thumbnail Card */}
            <div className={`rounded-lg overflow-hidden border ${isCurrentUser
                ? 'bg-white/10 border-white/20'
                : 'bg-gray-50 border-gray-200'
                } max-w-[280px]`}>
                {/* Preview Area */}
                <div
                    className="relative cursor-pointer group"
                    onClick={handleViewPDF}
                >
                    {isImage && !imageError ? (
                        <div className="relative w-full h-[180px] bg-gray-900 overflow-hidden">
                            {isLoadingUrl ? (
                                <div className="w-full h-full flex items-center justify-center">
                                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                                </div>
                            ) : (
                                <img
                                    src={presignedUrl || attachment.fileUrl}
                                    alt={attachment.fileName}
                                    className="w-full h-full object-cover"
                                    onError={() => setImageError(true)}
                                />
                            )}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full p-2">
                                    <Eye className="h-5 w-5 text-gray-800" />
                                </div>
                            </div>
                        </div>
                    ) : isPDF ? (
                        <div className="relative w-full h-[180px] bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
                            <div className="text-center">
                                <FileText className="h-16 w-16 text-red-600 mx-auto mb-2" />
                                <div className="text-sm font-semibold text-red-800">PDF Document</div>
                            </div>
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center">
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full p-2">
                                    <Eye className="h-5 w-5 text-gray-800" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="relative w-full h-[180px] bg-gray-100 flex items-center justify-center">
                            <div className="text-center">
                                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                                <p className="text-xs text-gray-500 px-2">{attachment.fileName}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* File Info & Actions */}
                <div className={`p-3 ${isCurrentUser ? 'bg-white/5' : 'bg-white'
                    }`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                            <p className={`text-xs font-medium truncate ${isCurrentUser ? 'text-white' : 'text-gray-900'
                                }`}>
                                {attachment.fileName}
                            </p>
                            <p className={`text-[10px] ${isCurrentUser ? 'text-white/70' : 'text-gray-500'
                                }`}>
                                {formatFileSize(attachment.fileSize)}
                            </p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                        {isPDF ? (
                            // Single View button for PDFs
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleViewPDF}
                                disabled={isViewingPDF}
                                className={`flex-1 h-8 text-xs ${isCurrentUser
                                    ? 'bg-white/10 hover:bg-white/20 text-white border-white/30'
                                    : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'
                                    }`}
                            >
                                {isViewingPDF ? (
                                    <LoadingSpinner size="sm" className="mr-1" />
                                ) : (
                                    <Eye className="h-3 w-3 mr-1" />
                                )}
                                View
                            </Button>
                        ) : (
                            // View and Download buttons for other files
                            <>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleViewPDF}
                                    className={`flex-1 h-8 text-xs ${isCurrentUser
                                        ? 'bg-white/10 hover:bg-white/20 text-white border-white/30'
                                        : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'
                                        }`}
                                >
                                    <Eye className="h-3 w-3 mr-1" />
                                    View
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onDownload(attachment.id, attachment.fileName)}
                                    className={`flex-1 h-8 text-xs ${isCurrentUser
                                        ? 'bg-white/10 hover:bg-white/20 text-white border-white/30'
                                        : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'
                                        }`}
                                >
                                    <Download className="h-3 w-3 mr-1" />
                                    Download
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* View Modal */}
            <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
                <DialogContent className="max-w-5xl max-h-[95vh] p-0 overflow-hidden bg-black border-gray-800">
                    <div className="relative">
                        {/* File Header */}
                        <div className="absolute top-0 left-0 right-12 bg-gradient-to-b from-black/90 to-transparent p-4 z-10">
                            <h3 className="text-white font-medium truncate text-sm">{attachment.fileName}</h3>
                            <p className="text-white/60 text-xs">{formatFileSize(attachment.fileSize)}</p>
                        </div>

                        {/* Content */}
                        <div className="relative min-h-[400px] max-h-[85vh] flex items-center justify-center bg-black">
                            {isImage && !imageError ? (
                                <div className="relative w-full h-full flex items-center justify-center p-8 pt-20 pb-20">
                                    <div className="relative max-w-full max-h-[75vh]">
                                        <img
                                            src={presignedUrl || attachment.fileUrl}
                                            alt={attachment.fileName}
                                            className="max-w-full max-h-[75vh] w-auto h-auto object-contain"
                                            onError={() => setImageError(true)}
                                        />
                                    </div>
                                </div>
                            ) : isPDF ? (
                                <div className="w-full h-[85vh] pt-16">
                                    <iframe
                                        src={attachment.fileUrl}
                                        className="w-full h-full"
                                        title={attachment.fileName}
                                    />
                                </div>
                            ) : (
                                <div className="text-center p-8 pt-20">
                                    <FileText className="h-20 w-20 text-white/50 mx-auto mb-4" />
                                    <p className="text-white/70 mb-4">Preview not available</p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onDownload(attachment.id, attachment.fileName)}
                                        className="bg-white/10 hover:bg-white/20 text-white border-white/30"
                                    >
                                        <Download className="h-4 w-4 mr-2" />
                                        Download File
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Action Bar */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
                            <div className="flex items-center justify-center gap-3">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => onDownload(attachment.id, attachment.fileName)}
                                    className="bg-white/10 hover:bg-white/20 text-white border-white/30 h-9"
                                >
                                    <Download className="h-4 w-4 mr-2" />
                                    Download
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => window.open(attachment.fileUrl, '_blank')}
                                    className="bg-white/10 hover:bg-white/20 text-white border-white/30 h-9"
                                >
                                    Open in New Tab
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
