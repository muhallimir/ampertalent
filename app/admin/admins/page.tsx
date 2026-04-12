'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'
import { useUserProfile } from '@/hooks/useUserProfile'
import {
    Shield,
    Users,
    UserCheck,
    MoreHorizontal,
    User
} from 'lucide-react'

interface AdminUser {
    id: string
    clerkUserId: string
    email: string
    firstName: string
    lastName: string
    role: 'admin' | 'super_admin'
    createdAt: string
    isActive: boolean
    profilePictureUrl?: string
}

export default function AdminManagementPage() {
    const router = useRouter()
    const { toast } = useToast()
    const { profile } = useUserProfile()

    const [admins, setAdmins] = useState<AdminUser[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const loadAdmins = useCallback(async () => {
        try {
            setIsLoading(true)
            const response = await fetch('/api/admin/admins')

            if (!response.ok) {
                throw new Error('Failed to load admins')
            }

            const data = await response.json()
            setAdmins(data.admins)
        } catch (error) {
            console.error('Error loading admins:', error)
            toast({
                title: 'Error',
                description: 'Failed to load admin users.',
                variant: 'destructive'
            })
        } finally {
            setIsLoading(false)
        }
    }, [toast])

    // Redirect if not super admin
    useEffect(() => {
        if (profile && profile.role !== 'super_admin') {
            router.push('/admin/dashboard')
            toast({
                title: 'Access Denied',
                description: 'You do not have permission to access this page.',
                variant: 'destructive'
            })
        }
    }, [profile, router, toast])

    // Load admins
    useEffect(() => {
        if (profile?.role === 'super_admin') {
            loadAdmins()
        }
    }, [profile, loadAdmins])

    const handleRoleChange = async (adminId: string, action: 'promote' | 'demote') => {
        try {
            const response = await fetch(`/api/admin/admins/${adminId}/role`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action })
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || 'Failed to update admin role')
            }

            toast({
                title: 'Success',
                description: action === 'promote'
                    ? 'Admin promoted to super admin successfully.'
                    : 'Super admin demoted to normal admin successfully.'
            })

            loadAdmins()
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to update admin role.',
                variant: 'destructive'
            })
        }
    }

    if (profile && profile.role !== 'super_admin') {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
                    <p className="text-gray-600">You do not have permission to access this page.</p>
                </div>
            </div>
        )
    }

    if (!profile || isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <LoadingSpinner size="lg" />
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
                        <Shield className="h-8 w-8 mr-3 text-red-600" />
                        Admins
                    </h1>
                    <p className="text-gray-600">
                        Manage administrator accounts and permissions
                    </p>
                </div>

                <Button
                    className="flex items-center space-x-2"
                    onClick={() => router.push('/admin/users')}
                >
                    <Users className="h-4 w-4" />
                    <span>Manage Users</span>
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Admins</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{admins.length}</div>
                        <p className="text-xs text-muted-foreground">
                            Active administrator accounts
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Admins</CardTitle>
                        <UserCheck className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {admins.filter(admin => admin.isActive).length}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Currently active accounts
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Super Admins</CardTitle>
                        <Shield className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {admins.filter(admin => admin.role === 'super_admin').length}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Including yourself
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Admins Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Administrator Accounts</CardTitle>
                    <CardDescription>
                        Manage administrator accounts and permissions. Your own account cannot be modified here - use the profile page for personal changes.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {admins.map((admin) => (
                                <TableRow key={admin.id}>
                                    <TableCell className="font-medium">
                                        {admin.firstName} {admin.lastName}
                                    </TableCell>
                                    <TableCell>{admin.email}</TableCell>
                                    <TableCell>
                                        <Badge variant={admin.role === 'super_admin' ? 'destructive' : 'secondary'}>
                                            {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={admin.isActive ? 'default' : 'outline'}>
                                            {admin.isActive ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {new Date(admin.createdAt).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric'
                                        })}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {admin.clerkUserId === profile?.clerkUserId ? (
                                            <Badge variant="outline" className="text-blue-600 border-blue-600">
                                                <User className="h-3 w-3 mr-1" />
                                                You
                                            </Badge>
                                        ) : (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>

                                                    {/* Role management actions */}
                                                    {admin.role === 'admin' && (
                                                        <DropdownMenuItem
                                                            onClick={() => handleRoleChange(admin.id, 'promote')}
                                                        >
                                                            <Shield className="mr-2 h-4 w-4" />
                                                            Promote to Super Admin
                                                        </DropdownMenuItem>
                                                    )}

                                                    {admin.role === 'super_admin' && admin.clerkUserId !== profile?.clerkUserId && (
                                                        <DropdownMenuItem
                                                            onClick={() => handleRoleChange(admin.id, 'demote')}
                                                        >
                                                            <User className="mr-2 h-4 w-4" />
                                                            Demote to Admin
                                                        </DropdownMenuItem>
                                                    )}

                                                    {/* Status management - don't allow suspending self */}
                                                    {/* Suspend functionality removed - Coming Soon */}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    {admins.length === 0 && (
                        <div className="text-center py-12">
                            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                No Admin Accounts
                            </h3>
                            <p className="text-gray-600 mb-4">
                                Get started by managing users and creating admin accounts.
                            </p>
                            <Button onClick={() => router.push('/admin/users')}>
                                <Users className="h-4 w-4 mr-2" />
                                Manage Users
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}