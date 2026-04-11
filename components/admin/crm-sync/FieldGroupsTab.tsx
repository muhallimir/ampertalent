'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Plus,
    Edit2,
    Trash2,
    Loader2,
    FolderOpen,
    AlertTriangle
} from 'lucide-react'

interface FieldGroup {
    id: string
    name: string
    description?: string
    sortOrder: number
    mappingCount?: number
    createdAt: string
    updatedAt: string
}

export function FieldGroupsTab() {
    const { addToast } = useToast()
    const [groups, setGroups] = useState<FieldGroup[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [editingGroup, setEditingGroup] = useState<FieldGroup | null>(null)
    const [deletingGroup, setDeletingGroup] = useState<FieldGroup | null>(null)
    const [isSaving, setIsSaving] = useState(false)

    const [formData, setFormData] = useState({
        name: '',
        description: ''
    })

    useEffect(() => {
        loadGroups()
    }, [])

    const loadGroups = async () => {
        setIsLoading(true)
        try {
            const response = await fetch('/api/admin/crm-sync/groups')
            if (response.ok) {
                const data = await response.json()
                setGroups(data.groups || [])
            }
        } catch (error) {
            console.error('Error loading groups:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const openCreateDialog = () => {
        setEditingGroup(null)
        setFormData({ name: '', description: '' })
        setIsDialogOpen(true)
    }

    const openEditDialog = (group: FieldGroup) => {
        setEditingGroup(group)
        setFormData({
            name: group.name,
            description: group.description || ''
        })
        setIsDialogOpen(true)
    }

    const openDeleteDialog = (group: FieldGroup) => {
        setDeletingGroup(group)
        setIsDeleteDialogOpen(true)
    }

    const isNameUnique = (): boolean => {
        return !groups.some(g =>
            g.name.toLowerCase() === formData.name.toLowerCase() &&
            (!editingGroup || g.id !== editingGroup.id)
        )
    }

    const saveGroup = async () => {
        if (!formData.name.trim()) {
            addToast({ title: 'Validation Error', description: 'Group name is required', variant: 'destructive' })
            return
        }

        if (!isNameUnique()) {
            addToast({ title: 'Validation Error', description: 'A group with this name already exists', variant: 'destructive' })
            return
        }

        setIsSaving(true)
        try {
            const url = editingGroup
                ? `/api/admin/crm-sync/groups/${editingGroup.id}`
                : '/api/admin/crm-sync/groups'

            const method = editingGroup ? 'PUT' : 'POST'

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (response.ok) {
                await loadGroups()
                setIsDialogOpen(false)
                addToast({ title: 'Success', description: editingGroup ? 'Group updated successfully' : 'Group created successfully', variant: 'success' })
            } else {
                const data = await response.json()
                addToast({ title: 'Error', description: data.error || 'Failed to save group', variant: 'destructive' })
            }
        } catch (error) {
            console.error('Error saving group:', error)
            addToast({ title: 'Error', description: 'Failed to save group', variant: 'destructive' })
        } finally {
            setIsSaving(false)
        }
    }

    const deleteGroup = async () => {
        if (!deletingGroup) return

        setIsSaving(true)
        try {
            const response = await fetch(`/api/admin/crm-sync/groups/${deletingGroup.id}`, {
                method: 'DELETE'
            })

            if (response.ok) {
                await loadGroups()
                setIsDeleteDialogOpen(false)
                setDeletingGroup(null)
                addToast({ title: 'Success', description: 'Group deleted successfully', variant: 'success' })
            } else {
                const data = await response.json()
                addToast({ title: 'Error', description: data.error || 'Failed to delete group', variant: 'destructive' })
            }
        } catch (error) {
            console.error('Error deleting group:', error)
            addToast({ title: 'Error', description: 'Failed to delete group', variant: 'destructive' })
        } finally {
            setIsSaving(false)
        }
    }

    const getMappingCountLabel = (count: number = 0): string => {
        return count === 1 ? '1 mapping' : `${count} mappings`
    }

    if (isLoading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center h-96">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Field Groups</CardTitle>
                            <CardDescription>
                                Organize field mappings into logical groups for better management
                            </CardDescription>
                        </div>
                        <Button onClick={openCreateDialog} size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Create Group
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {groups.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 space-y-4">
                            <FolderOpen className="h-12 w-12 text-gray-400" />
                            <p className="text-gray-600">No field groups yet</p>
                            <p className="text-sm text-gray-500">
                                Create your first group to organize field mappings
                            </p>
                            <Button onClick={openCreateDialog} variant="outline">
                                <Plus className="h-4 w-4 mr-2" />
                                Create Group
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {groups.map(group => (
                                <Card key={group.id} className="hover:shadow-md transition-shadow">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <CardTitle className="text-lg">{group.name}</CardTitle>
                                                {group.description && (
                                                    <CardDescription className="mt-1">
                                                        {group.description}
                                                    </CardDescription>
                                                )}
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-600">Mappings:</span>
                                                <Badge variant="secondary">
                                                    {getMappingCountLabel(group.mappingCount)}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-2 pt-2 border-t">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex-1"
                                                    onClick={() => openEditDialog(group)}
                                                >
                                                    <Edit2 className="h-3 w-3 mr-1" />
                                                    Edit
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex-1 text-red-600 hover:text-red-700"
                                                    onClick={() => openDeleteDialog(group)}
                                                >
                                                    <Trash2 className="h-3 w-3 mr-1" />
                                                    Delete
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                    <CardTitle className="text-blue-900">About Field Groups</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-blue-800">
                    <p>
                        Field groups help you organize related field mappings for easier management.
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>Groups are optional - mappings can exist without a group</li>
                        <li>Use groups to categorize mappings by purpose (e.g., "Contact Info", "Subscription Details")</li>
                        <li>You can filter mappings by group in the Field Mappings tab</li>
                        <li>Groups with active mappings will show a warning before deletion</li>
                    </ul>
                </CardContent>
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingGroup ? 'Edit Field Group' : 'Create Field Group'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingGroup
                                ? 'Update the group details below'
                                : 'Create a new group to organize your field mappings'
                            }
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Name */}
                        <div className="space-y-2">
                            <Label htmlFor="name">
                                Group Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="e.g., Contact Information"
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label htmlFor="description">Description (Optional)</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Brief description of this group's purpose"
                                rows={3}
                            />
                        </div>

                        {/* Validation Errors */}
                        {formData.name && !isNameUnique() && (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                    A group with this name already exists
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={saveGroup}
                            disabled={isSaving || !formData.name.trim() || !isNameUnique()}
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                editingGroup ? 'Update Group' : 'Create Group'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Group</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete the group{' '}
                            <strong>{deletingGroup?.name}</strong>?
                        </DialogDescription>
                    </DialogHeader>

                    {deletingGroup && deletingGroup.mappingCount && deletingGroup.mappingCount > 0 && (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                                This group has {deletingGroup.mappingCount} active mapping{deletingGroup.mappingCount > 1 ? 's' : ''}.
                                These mappings will be unassigned from the group but will remain active.
                            </AlertDescription>
                        </Alert>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={deleteGroup} disabled={isSaving}>
                            {isSaving ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                'Delete Group'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}