'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Search,
  Download,
  Trash2,
  SortAsc,
  SortDesc,
  FileText,
  Image,
  HardDrive,
  Users,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'

interface FileData {
  id: string
  fileName: string
  fileType: 'resume' | 'logo' | 'avatar'
  fileSize: number
  uploadedAt: string
  fileUrl: string
  s3Key: string
  owner: {
    id: string
    name: string
    email: string
    type: 'seeker' | 'employer'
    companyName?: string
  }
}

interface StorageStats {
  totalFiles: number
  totalSize: number
  resumeCount: number
  logoCount: number
  avatarCount: number
  averageFileSize: number
}

interface PaginationData {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function AdminStoragePage() {
  const [files, setFiles] = useState<FileData[]>([])
  const [stats, setStats] = useState<StorageStats | null>(null)
  const [pagination, setPagination] = useState<PaginationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Filters and search
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [fileType, setFileType] = useState('all')
  const [sortBy, setSortBy] = useState('uploadedAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)

    return () => {
      clearTimeout(timer)
    }
  }, [search])

  const fetchFiles = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        search: debouncedSearch,
        fileType,
        sortBy,
        sortOrder,
        page: currentPage.toString(),
        limit: '50',
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo })
      })

      const response = await fetch(`/api/admin/storage?${params}`)
      if (!response.ok) throw new Error('Failed to fetch files')

      const text = await response.text()
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        // Session expired, redirect to sign-in
        window.location.href = '/sign-in'
        return
      }
      const data = JSON.parse(text)
      setFiles(data.files)
      setStats(data.stats)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error fetching files:', error)
      setAlert({ type: 'error', message: 'Failed to load storage data' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFiles()
  }, [debouncedSearch, fileType, sortBy, sortOrder, dateFrom, dateTo, currentPage])

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const truncateFileName = (fileName: string, maxLength: number = 50) => {
    if (fileName.length <= maxLength) return fileName
    const extension = fileName.split('.').pop()
    const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'))
    const truncatedName = nameWithoutExt.substring(0, maxLength - extension!.length - 4) + '...'
    return `${truncatedName}.${extension}`
  }

  const getShortS3Key = (s3Key: string) => {
    const parts = s3Key.split('/')
    if (parts.length <= 2) return s3Key
    return `.../${parts[parts.length - 1]}`
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFiles(new Set(files.map(f => f.id)))
    } else {
      setSelectedFiles(new Set())
    }
  }

  const handleSelectFile = (fileId: string, checked: boolean) => {
    const newSelected = new Set(selectedFiles)
    if (checked) {
      newSelected.add(fileId)
    } else {
      newSelected.delete(fileId)
    }
    setSelectedFiles(newSelected)
  }

  const handleBulkDelete = async () => {
    if (selectedFiles.size === 0) return

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedFiles.size} selected files? This action cannot be undone.`
    )
    
    if (!confirmed) return

    try {
      setBulkDeleting(true)
      const response = await fetch('/api/admin/storage', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileIds: Array.from(selectedFiles),
          bulkAction: 'delete'
        })
      })

      if (!response.ok) throw new Error('Failed to delete files')

      const text = await response.text()
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        // Session expired, redirect to sign-in
        window.location.href = '/sign-in'
        return
      }
      const result = JSON.parse(text)
      setAlert({
        type: 'success', 
        message: `Successfully deleted ${result.results.deleted} files` 
      })
      
      setSelectedFiles(new Set())
      fetchFiles()
    } catch (error) {
      console.error('Error deleting files:', error)
      setAlert({ type: 'error', message: 'Failed to delete files' })
    } finally {
      setBulkDeleting(false)
    }
  }

  const handleDeleteOldFiles = async (years: number) => {
    const cutoffDate = new Date()
    cutoffDate.setFullYear(cutoffDate.getFullYear() - years)
    
    const oldFiles = files.filter(file => 
      new Date(file.uploadedAt) < cutoffDate
    )

    if (oldFiles.length === 0) {
      setAlert({ type: 'error', message: `No files older than ${years} years found` })
      return
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete ${oldFiles.length} files older than ${years} years? This action cannot be undone.`
    )
    
    if (!confirmed) return

    try {
      setBulkDeleting(true)
      const response = await fetch('/api/admin/storage', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileIds: oldFiles.map(f => f.id),
          bulkAction: `delete_older_than_${years}_years`
        })
      })

      if (!response.ok) throw new Error('Failed to delete files')

      const text = await response.text()
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        // Session expired, redirect to sign-in
        window.location.href = '/sign-in'
        return
      }
      const result = JSON.parse(text)
      setAlert({
        type: 'success', 
        message: `Successfully deleted ${result.results.deleted} old files` 
      })
      
      fetchFiles()
    } catch (error) {
      console.error('Error deleting old files:', error)
      setAlert({ type: 'error', message: 'Failed to delete old files' })
    } finally {
      setBulkDeleting(false)
    }
  }

  const getDateFilterPresets = () => [
    { label: 'Last 30 days', value: () => {
      const date = new Date()
      date.setDate(date.getDate() - 30)
      return date.toISOString().split('T')[0]
    }},
    { label: 'Last 3 months', value: () => {
      const date = new Date()
      date.setMonth(date.getMonth() - 3)
      return date.toISOString().split('T')[0]
    }},
    { label: 'Last year', value: () => {
      const date = new Date()
      date.setFullYear(date.getFullYear() - 1)
      return date.toISOString().split('T')[0]
    }},
    { label: 'Older than 2 years', value: () => {
      const date = new Date()
      date.setFullYear(date.getFullYear() - 2)
      return date.toISOString().split('T')[0]
    }},
    { label: 'Older than 5 years', value: () => {
      const date = new Date()
      date.setFullYear(date.getFullYear() - 5)
      return date.toISOString().split('T')[0]
    }}
  ]

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Storage Management</h1>
          <p className="text-muted-foreground">Manage uploaded files and storage usage</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="destructive"
            onClick={() => handleDeleteOldFiles(5)}
            disabled={bulkDeleting}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete 5+ Year Old Files
          </Button>
        </div>
      </div>

      {alert && (
        <Alert className={alert.type === 'error' ? 'border-red-500' : 'border-green-500'}>
          {alert.type === 'error' ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
          <AlertDescription>{alert.message}</AlertDescription>
        </Alert>
      )}

      {/* Storage Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Files</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalFiles.toLocaleString()}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Size</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatFileSize(stats.totalSize)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resumes</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.resumeCount.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Logos</CardTitle>
              <Image className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.logoCount.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avatars</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avatarCount.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Size</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatFileSize(stats.averageFileSize)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Filters & Search</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={fileType} onValueChange={(value: string) => setFileType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="File Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Files</SelectItem>
                <SelectItem value="resume">Resumes</SelectItem>
                <SelectItem value="logo">Logos</SelectItem>
                <SelectItem value="avatar">Avatars</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(value: string) => setSortBy(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="uploadedAt">Upload Date</SelectItem>
                <SelectItem value="fileName">File Name</SelectItem>
                <SelectItem value="fileSize">File Size</SelectItem>
                <SelectItem value="fileType">File Type</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
              {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Date From</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Date To</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Quick Date Filters</label>
              <Select onValueChange={(value: string) => setDateFrom(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select preset..." />
                </SelectTrigger>
                <SelectContent>
                  {getDateFilterPresets().map((preset, index) => (
                    <SelectItem key={index} value={preset.value()}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedFiles.size > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedFiles.size} files selected
              </span>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={handleBulkDelete}
                  disabled={bulkDeleting}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedFiles(new Set())}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Files Table */}
      <Card>
        <CardHeader>
          <CardTitle>Files</CardTitle>
          <CardDescription>
            {pagination && `Showing ${files.length} of ${pagination.total} files`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading files...</div>
          ) : files.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No files found</div>
          ) : (
            <div className="space-y-4">
              {/* Table Header */}
              <div className="flex items-center space-x-4 p-4 bg-muted/50 rounded-lg font-medium overflow-x-auto">
                <Checkbox
                  checked={selectedFiles.size === files.length && files.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <div className="w-80 min-w-80">File</div>
                <div className="w-24 min-w-24">Type</div>
                <div className="w-24 min-w-24">Size</div>
                <div className="w-32 min-w-32 hidden sm:block">Uploaded</div>
                <div className="w-48 min-w-48 hidden md:block">Owner</div>
                <div className="w-24 min-w-24">Actions</div>
              </div>

              {/* Table Rows */}
              {files.map((file) => (
                <div key={file.id} className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-muted/25 overflow-x-auto">
                  <Checkbox
                    checked={selectedFiles.has(file.id)}
                    onCheckedChange={(checked: boolean) => handleSelectFile(file.id, checked)}
                  />
                  
                  <div className="w-80 min-w-80">
                    <div
                      className="font-medium truncate cursor-help"
                      title={file.fileName}
                    >
                      {truncateFileName(file.fileName)}
                    </div>
                    <div
                      className="text-sm text-muted-foreground truncate cursor-help"
                      title={file.s3Key}
                    >
                      {getShortS3Key(file.s3Key)}
                    </div>
                  </div>

                  <div className="w-24 min-w-24">
                    <Badge variant={file.fileType === 'resume' ? 'default' : file.fileType === 'avatar' ? 'outline' : 'secondary'}>
                      {file.fileType === 'resume' ? (
                        <FileText className="h-3 w-3 mr-1" />
                      ) : file.fileType === 'avatar' ? (
                        <Users className="h-3 w-3 mr-1" />
                      ) : (
                        <Image className="h-3 w-3 mr-1" />
                      )}
                      {file.fileType}
                    </Badge>
                  </div>

                  <div className="w-24 min-w-24 text-sm">
                    {formatFileSize(file.fileSize)}
                  </div>

                  <div className="w-32 min-w-32 text-sm hidden sm:block">
                    {formatDate(file.uploadedAt)}
                  </div>

                  <div className="w-48 min-w-48 hidden md:block">
                    <div className="text-sm font-medium truncate" title={file.owner.name}>
                      {file.owner.name}
                    </div>
                    <div className="text-xs text-muted-foreground truncate" title={file.owner.email}>
                      {file.owner.email}
                    </div>
                    {file.owner.companyName && (
                      <div className="text-xs text-muted-foreground truncate" title={file.owner.companyName}>
                        {file.owner.companyName}
                      </div>
                    )}
                  </div>

                  <div className="w-24 min-w-24">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(file.fileUrl, '_blank')}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
                  disabled={currentPage === pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}