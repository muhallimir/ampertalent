"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConnectionTab } from '@/components/admin/crm-sync/ConnectionTab'
import { FieldReferenceTab } from '@/components/admin/crm-sync/FieldReferenceTab'
import { FieldMappingsTab } from '@/components/admin/crm-sync/FieldMappingsTab'
import { FieldGroupsTab } from '@/components/admin/crm-sync/FieldGroupsTab'
import { SettingsTab } from '@/components/admin/crm-sync/SettingsTab'
import { ChangeLogTab } from '@/components/admin/crm-sync/ChangeLogTab'
import { useUserProfile } from '@/hooks/useUserProfile'
import { useToast } from '@/hooks/use-toast'

export default function CRMSyncPage() {
    const [activeTab, setActiveTab] = useState('connection')
    const { profile } = useUserProfile()
    const router = useRouter()
    const { toast } = useToast()

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

    return (
        <div className="container mx-auto p-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold">CRM Sync Configuration</h1>
                <p className="text-gray-600 mt-2">
                    Configure CRM synchronization settings and field mappings
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>CRM Integration</CardTitle>
                    <CardDescription>
                        Manage your CRM connection, field mappings, and sync settings
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-6">
                            <TabsTrigger value="connection">Connection</TabsTrigger>
                            <TabsTrigger value="fields">Field Reference</TabsTrigger>
                            <TabsTrigger value="mappings">Field Mappings</TabsTrigger>
                            <TabsTrigger value="groups">Field Groups</TabsTrigger>
                            <TabsTrigger value="settings">Settings</TabsTrigger>
                            <TabsTrigger value="changelog">Change Log</TabsTrigger>
                        </TabsList>

                        <TabsContent value="connection" className="mt-6">
                            <ConnectionTab />
                        </TabsContent>

                        <TabsContent value="fields" className="mt-6">
                            <FieldReferenceTab />
                        </TabsContent>

                        <TabsContent value="mappings" className="mt-6">
                            <FieldMappingsTab />
                        </TabsContent>

                        <TabsContent value="groups" className="mt-6">
                            <FieldGroupsTab />
                        </TabsContent>

                        <TabsContent value="settings" className="mt-6">
                            <SettingsTab />
                        </TabsContent>

                        <TabsContent value="changelog" className="mt-6">
                            <ChangeLogTab />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    )
}
