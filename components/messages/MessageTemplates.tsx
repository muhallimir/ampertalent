'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileText, Plus, Search, Trash2 } from 'lucide-react'

interface MessageTemplate {
    id: string
    name: string
    category: string
    subject?: string
    content: string
    isDefault: boolean
    usageCount: number
    createdAt: string
}

interface MessageTemplatesProps {
    onSelectTemplate: (template: MessageTemplate) => void
    className?: string
}

export function MessageTemplates({ onSelectTemplate, className }: MessageTemplatesProps) {
    const [templates, setTemplates] = useState<MessageTemplate[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isOpen, setIsOpen] = useState(false)
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [isRestoring, setIsRestoring] = useState(false)
    const [newTemplate, setNewTemplate] = useState({
        name: '',
        category: 'General',
        content: ''
    })
    const [isCreating, setIsCreating] = useState(false)

    useEffect(() => {
        loadTemplates()
    }, [])

    const loadTemplates = async () => {
        try {
            const response = await fetch('/api/messages/templates')
            if (response.ok) {
                const data = await response.json()
                // Combine custom and default templates
                const allTemplates = [
                    ...(Array.isArray(data.custom) ? data.custom : []),
                    ...(Array.isArray(data.default) ? data.default : [])
                ]

                setTemplates(allTemplates)
            }
        } catch (error) {
            console.error('Error loading templates:', error)
        } finally {
            setIsLoading(false)
        }
    }

    // Note: Removed auto-creation of default templates on empty state
    // Users must now explicitly use "Restore Defaults" button to create templates

    const handleSelectTemplate = (template: MessageTemplate) => {
        onSelectTemplate(template)
        setIsOpen(false)
    }

    const handleCreateTemplate = async () => {
        if (!newTemplate.name.trim() || !newTemplate.content.trim()) return

        try {
            setIsCreating(true)
            const response = await fetch('/api/messages/templates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newTemplate),
            })

            if (response.ok) {
                // Refresh templates from API to ensure consistency
                await loadTemplates()
                setNewTemplate({ name: '', category: 'General', content: '' })
                setIsCreateOpen(false)
            }
        } catch (error) {
            console.error('Error creating template:', error)
        } finally {
            setIsCreating(false)
        }
    }

    const handleDeleteTemplate = async (templateId: string, e: React.MouseEvent) => {
        e.stopPropagation() // Prevent template selection when clicking delete

        if (!confirm('Are you sure you want to delete this template?')) return

        try {
            const response = await fetch(`/api/messages/templates/${templateId}`, {
                method: 'DELETE',
            })

            if (response.ok) {
                await loadTemplates()
            }
        } catch (error) {
            console.error('Error deleting template:', error)
        }
    }

    const handleRestoreDefaults = async () => {
        if (!confirm('This will delete ALL templates (custom and default) and restore only the predefined default templates. Continue?')) return

        try {
            setIsRestoring(true)
            const response = await fetch('/api/messages/templates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ action: 'restore' }),
            })

            if (response.ok) {
                const result = await response.json()
                if (result.unchanged) {
                    alert('Default templates are already up to date. No changes made.')
                }
                await loadTemplates()
            }
        } catch (error) {
            console.error('Error restoring default templates:', error)
        } finally {
            setIsRestoring(false)
        }
    }

    // Filter templates based on search query
    const filteredTemplates = templates.filter(template =>
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.category.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (isLoading) {
        return (
            <Button variant="outline" size="sm" disabled className={`text-gray-500 ${className || ''}`}>
                <FileText className="h-4 w-4 mr-2" />
                Templates
            </Button>
        )
    }

    return (
        <>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        className={`text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-600 ${className || ''}`}
                    >
                        <FileText className="h-4 w-4 mr-2" />
                        Templates
                        {templates.length > 0 && (
                            <Badge variant="secondary" className="ml-2 text-xs bg-gray-100 text-gray-600">
                                {templates.length}
                            </Badge>
                        )}
                    </Button>
                </DialogTrigger>

                <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <DialogTitle className="flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-br from-brand-teal to-brand-coral rounded-lg">
                                    <FileText className="h-5 w-5 text-white" />
                                </div>
                                Message Templates
                                <Badge variant="outline" className="text-xs">
                                    {templates.length} available
                                </Badge>
                            </DialogTitle>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleRestoreDefaults}
                                    disabled={isRestoring}
                                    className="flex items-center gap-2 text-brand-teal hover:text-brand-teal hover:bg-brand-teal/10"
                                >
                                    <FileText className="h-4 w-4" />
                                    {isRestoring ? 'Restoring...' : 'Restore Defaults'}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsCreateOpen(true)}
                                    className="flex items-center gap-2"
                                >
                                    <Plus className="h-4 w-4" />
                                    Create
                                </Button>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search templates..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-[calc(80vh-180px)]">
                        {templates.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full w-fit mx-auto mb-4">
                                    <FileText className="h-8 w-8 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No templates yet</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Create templates to quickly respond to common messages
                                </p>
                            </div>
                        ) : filteredTemplates.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full w-fit mx-auto mb-4">
                                    <Search className="h-8 w-8 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No templates found</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Try a different search term
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Group templates by category */}
                                {Array.isArray(filteredTemplates) && Object.entries(
                                    filteredTemplates.reduce((acc, template) => {
                                        if (!acc[template.category]) {
                                            acc[template.category] = []
                                        }
                                        acc[template.category].push(template)
                                        return acc
                                    }, {} as Record<string, MessageTemplate[]>)
                                ).map(([category, categoryTemplates]) => (
                                    <div key={category} className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className="h-px bg-gradient-to-r from-brand-teal/30 to-transparent flex-1"></div>
                                            <h4 className="text-sm font-semibold text-brand-teal bg-white dark:bg-gray-900 px-3 py-1 rounded-full border border-brand-teal/20 capitalize">
                                                {category}
                                            </h4>
                                            <div className="h-px bg-gradient-to-l from-brand-teal/30 to-transparent flex-1"></div>
                                        </div>

                                        <div className="grid gap-3 sm:grid-cols-2">
                                            {categoryTemplates.map((template) => (
                                                <div
                                                    key={template.id}
                                                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-brand-teal/50 hover:shadow-md transition-all duration-200 cursor-pointer bg-white dark:bg-gray-800 group"
                                                    onClick={() => handleSelectTemplate(template)}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-2 bg-brand-teal/10 rounded-lg group-hover:bg-brand-teal/20 transition-colors flex-shrink-0">
                                                            <FileText className="h-4 w-4 text-brand-teal" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <h5 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-brand-teal transition-colors truncate">
                                                                    {template.name}
                                                                </h5>
                                                                {template.isDefault && (
                                                                    <Badge variant="outline" className="text-xs px-1.5 py-0.5 border-yellow-300 text-yellow-700 bg-yellow-50">
                                                                        Default
                                                                    </Badge>
                                                                )}
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={(e) => handleDeleteTemplate(template.id, e)}
                                                                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
                                                                    title={template.isDefault ? "Delete default template (can be restored)" : "Delete custom template"}
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </div>
                                                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 leading-relaxed">
                                                                {template.content}
                                                            </p>
                                                            <div className="flex items-center justify-between mt-3">
                                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                    Used {template.usageCount} {template.usageCount === 1 ? 'time' : 'times'}
                                                                </span>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="text-brand-teal hover:text-brand-teal hover:bg-brand-teal/10 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                                                                >
                                                                    Use Template
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Create Template Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-brand-teal to-brand-coral rounded-lg">
                                <Plus className="h-5 w-5 text-white" />
                            </div>
                            Create Template
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="template-name">Template Name</Label>
                            <Input
                                id="template-name"
                                placeholder="e.g., Thank you for applying"
                                value={newTemplate.name}
                                onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="template-category">Category</Label>
                            <Select
                                value={newTemplate.category}
                                onValueChange={(value) => setNewTemplate(prev => ({ ...prev, category: value }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="General">General</SelectItem>
                                    <SelectItem value="Interview">Interview</SelectItem>
                                    <SelectItem value="Rejection">Rejection</SelectItem>
                                    <SelectItem value="Acceptance">Acceptance</SelectItem>
                                    <SelectItem value="Follow-up">Follow-up</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="template-content">Message Content</Label>
                            <Textarea
                                id="template-content"
                                placeholder="Type your template message here..."
                                value={newTemplate.content}
                                onChange={(e) => setNewTemplate(prev => ({ ...prev, content: e.target.value }))}
                                rows={4}
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button
                                variant="outline"
                                onClick={() => setIsCreateOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreateTemplate}
                                disabled={!newTemplate.name.trim() || !newTemplate.content.trim() || isCreating}
                                className="bg-brand-teal hover:bg-brand-teal/90"
                            >
                                {isCreating ? 'Creating...' : 'Create Template'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}