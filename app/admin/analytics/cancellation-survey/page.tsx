'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/useUserProfile';
import {
    Download,
    TrendingUp,
    TrendingDown,
    RefreshCw,
} from '@/components/icons';
import { getWithImpersonation } from '@/lib/api-client';

interface SurveyStats {
    totalResponses: number;
    nps: number;
    satisfactionScore: number;
    experienceScore: number;
    recommendationRate: number;
    primaryReasonBreakdown: Record<string, number>;
    jobSatisfactionBreakdown: Record<string, number>;
    overallExperienceBreakdown: Record<string, number>;
    recommendToOthersBreakdown: Record<string, number>;
}

interface SurveyData {
    id: string;
    seekerId: string;
    subscriptionId: string;
    primaryReason: string;
    reasonOtherText: string | null;
    jobSatisfaction: string;
    overallExperience: string;
    improvementFeedback: string | null;
    recommendToOthers: string;
    createdAt: string;
}

interface PaginationMeta {
    total: number;
    page: number;
    limit: number;
    pages: number;
    hasMore: boolean;
}

export default function CancellationSurveyAnalyticsPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { profile } = useUserProfile();

    const [stats, setStats] = useState<SurveyStats | null>(null);
    const [surveyData, setSurveyData] = useState<SurveyData[]>([]);
    const [pagination, setPagination] = useState<PaginationMeta | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedReason, setSelectedReason] = useState<string | undefined>(undefined);
    const [selectedSatisfaction, setSelectedSatisfaction] = useState<string | undefined>(undefined);
    const [selectedExperience, setSelectedExperience] = useState<string | undefined>(undefined);
    const [selectedRecommendation, setSelectedRecommendation] = useState<string | undefined>(undefined);

    // Check access control
    useEffect(() => {
        if (profile && profile.role) {
            if (!['admin', 'super_admin'].includes(profile.role)) {
                setError('Access denied. Admin privileges required.');
                setIsLoading(false);
            }
        }
        // If profile is still loading, don't set error yet
    }, [profile]);

    // Always show all data - no date filtering
    const dateRangeData = useMemo(() => {
        const endDate = new Date();
        const startDate = new Date('2025-01-01'); // Show data from beginning
        return { startDate, endDate };
    }, []);

    const loadAnalytics = useCallback(async () => {
        if (profile && profile.role && !['admin', 'super_admin'].includes(profile.role)) {
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            const { startDate, endDate } = dateRangeData;
            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];

            // Load stats
            const statsUrl = `/api/admin/analytics/cancellation-survey/stats?startDate=${startDateStr}&endDate=${endDateStr}`;
            const statsResponse = await getWithImpersonation(statsUrl);

            if (!statsResponse.ok) {
                if (statsResponse.status === 403) {
                    throw new Error('Access denied. Admin privileges required.');
                }
                throw new Error(`Failed to load statistics: ${statsResponse.statusText}`);
            }

            const statsResult = await statsResponse.json();
            setStats(statsResult);

            // Load survey data for current page
            let dataUrl = `/api/admin/analytics/cancellation-survey/data?startDate=${startDateStr}&endDate=${endDateStr}&limit=50&offset=${(currentPage - 1) * 50}`;

            if (selectedReason) dataUrl += `&primaryReason=${encodeURIComponent(selectedReason)}`;
            if (selectedSatisfaction) dataUrl += `&jobSatisfaction=${encodeURIComponent(selectedSatisfaction)}`;
            if (selectedExperience) dataUrl += `&overallExperience=${encodeURIComponent(selectedExperience)}`;
            if (selectedRecommendation) dataUrl += `&recommendToOthers=${encodeURIComponent(selectedRecommendation)}`;

            const dataResponse = await getWithImpersonation(dataUrl);

            if (!dataResponse.ok) {
                throw new Error(`Failed to load survey data: ${dataResponse.statusText}`);
            }

            const dataResult = await dataResponse.json();
            setSurveyData(dataResult.data);
            setPagination({
                total: dataResult.total,
                page: dataResult.page,
                limit: dataResult.limit,
                pages: Math.ceil(dataResult.total / dataResult.limit),
                hasMore: dataResult.hasMore,
            });
        } catch (error) {
            console.error('Error loading analytics:', error);
            setError(
                error instanceof Error ? error.message : 'Failed to load analytics data'
            );
        } finally {
            setIsLoading(false);
        }
    }, [dateRangeData, profile, currentPage, selectedReason, selectedSatisfaction, selectedExperience, selectedRecommendation]);

    useEffect(() => {
        loadAnalytics();
    }, [loadAnalytics]);

    const handleExportCSV = async () => {
        try {
            setIsExporting(true);

            const { startDate, endDate } = dateRangeData;
            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];

            const response = await getWithImpersonation(
                `/api/admin/analytics/cancellation-survey/export?startDate=${startDateStr}&endDate=${endDateStr}`
            );

            if (!response.ok) {
                throw new Error('Failed to export data');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cancellation-survey-${startDateStr}-${endDateStr}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast({
                title: 'Export Successful',
                description: 'Survey data exported to CSV',
                variant: 'default',
            });
        } catch (error) {
            console.error('Export error:', error);
            toast({
                title: 'Export Failed',
                description: 'Failed to export survey data',
                variant: 'destructive',
            });
        } finally {
            setIsExporting(false);
        }
    };

    if (!profile) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <LoadingSpinner />
            </div>
        );
    }

    if (!profile.role || !['admin', 'super_admin'].includes(profile.role)) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Access Denied</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            You don&apos;t have permission to access this page. Admin privileges are required.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (isLoading && !stats) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <LoadingSpinner />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Error</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-destructive">{error}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Cancellation Survey Analytics</h1>
                    <p className="text-gray-600">
                        Track reasons for subscription cancellations and satisfaction metrics
                    </p>
                </div>
                <Button onClick={handleExportCSV} disabled={isExporting}>
                    <Download className="w-4 h-4 mr-2" />
                    {isExporting ? 'Exporting...' : 'Export CSV'}
                </Button>
            </div>

            {/* Date Range Indicator */}
            <div className="text-right text-sm text-gray-600 mb-4">
                Showing all cancellation survey data
            </div>

            {/* Toolbar - Refresh and View App Analytics Buttons */}
            <div className="flex items-center space-x-3 mb-6">
                <Button
                    onClick={() => loadAnalytics()}
                    variant="outline"
                    size="sm"
                >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>

                <Button
                    onClick={() => router.push('/admin/analytics')}
                    variant="outline"
                    size="sm"
                >
                    View App Analytics
                </Button>
            </div>

            {/* KPI Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Total Responses
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalResponses}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                NPS Score
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.nps.toFixed(1)}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {stats.nps >= 50 ? (
                                    <span className="text-green-600 flex items-center">
                                        <TrendingUp className="w-3 h-3 mr-1" /> Excellent
                                    </span>
                                ) : stats.nps >= 0 ? (
                                    <span className="text-yellow-600 flex items-center">
                                        <TrendingUp className="w-3 h-3 mr-1" /> Good
                                    </span>
                                ) : (
                                    <span className="text-red-600 flex items-center">
                                        <TrendingDown className="w-3 h-3 mr-1" /> Needs Improvement
                                    </span>
                                )}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Satisfaction Score
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {(stats.satisfactionScore * 20).toFixed(1)}%
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {stats.satisfactionScore.toFixed(2)} / 5
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Experience Score
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {(stats.experienceScore * 20).toFixed(1)}%
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {stats.experienceScore.toFixed(2)} / 5
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Would Recommend
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.recommendationRate.toFixed(1)}%</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Promoters rate
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Tabs for Different Views */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-6">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="reasons">By Reason</TabsTrigger>
                    <TabsTrigger value="satisfaction">Satisfaction</TabsTrigger>
                    <TabsTrigger value="experience">Experience</TabsTrigger>
                    <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
                    <TabsTrigger value="feedback">Feedback</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {stats && (
                            <>
                                {/* Primary Reason Distribution */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Cancellation Reasons</CardTitle>
                                        <CardDescription>
                                            Distribution of primary reasons for cancellation
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            {Object.entries(stats.primaryReasonBreakdown).map(([reason, count]) => {
                                                const percentage =
                                                    stats.totalResponses > 0
                                                        ? ((count / stats.totalResponses) * 100).toFixed(1)
                                                        : 0;
                                                return (
                                                    <div key={reason} className="flex items-center justify-between">
                                                        <div className="flex-1">
                                                            <p className="text-sm font-medium capitalize">
                                                                {reason.replace(/_/g, ' ')}
                                                            </p>
                                                            <div className="mt-1 bg-secondary rounded-full h-2 overflow-hidden">
                                                                <div
                                                                    className="bg-primary h-full"
                                                                    style={{ width: `${percentage}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="ml-4 text-right">
                                                            <p className="text-sm font-bold">{count}</p>
                                                            <p className="text-xs text-muted-foreground">{percentage}%</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Recommendation Distribution */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Recommendation Likelihood</CardTitle>
                                        <CardDescription>
                                            Would users recommend the service to others
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            {Object.entries(stats.recommendToOthersBreakdown).map(([recommendation, count]) => {
                                                const percentage =
                                                    stats.totalResponses > 0
                                                        ? ((count / stats.totalResponses) * 100).toFixed(1)
                                                        : 0;

                                                const badgeVariant =
                                                    recommendation === 'definitely'
                                                        ? 'default'
                                                        : recommendation === 'probably'
                                                            ? 'secondary'
                                                            : 'destructive';

                                                return (
                                                    <div key={recommendation} className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant={badgeVariant}>
                                                                {recommendation.charAt(0).toUpperCase() + recommendation.slice(1)}
                                                            </Badge>
                                                            <p className="text-sm text-muted-foreground">{count} responses</p>
                                                        </div>
                                                        <p className="text-sm font-bold">{percentage}%</p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                            </>
                        )}
                    </div>
                </TabsContent>

                {/* By Reason Tab */}
                <TabsContent value="reasons" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Cancellation Reasons Breakdown</CardTitle>
                            <CardDescription>
                                Click on a reason to filter raw data
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {stats && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {Object.entries(stats.primaryReasonBreakdown).map(([reason, count]) => {
                                        const percentage =
                                            stats.totalResponses > 0
                                                ? ((count / stats.totalResponses) * 100).toFixed(1)
                                                : 0;
                                        const isSelected = selectedReason === reason;

                                        return (
                                            <button
                                                key={reason}
                                                onClick={() => {
                                                    setSelectedReason(isSelected ? undefined : reason);
                                                    setCurrentPage(1);
                                                }}
                                                className={`p-4 rounded-lg border-2 transition-all ${isSelected
                                                    ? 'border-primary bg-primary/5'
                                                    : 'border-secondary hover:border-primary/50'
                                                    }`}
                                            >
                                                <p className="font-medium capitalize text-left">
                                                    {reason.replace(/_/g, ' ')}
                                                </p>
                                                <p className="text-2xl font-bold mt-2">{count}</p>
                                                <p className="text-sm text-muted-foreground">{percentage}%</p>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Satisfaction Tab */}
                <TabsContent value="satisfaction" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Job Satisfaction Ratings</CardTitle>
                            <CardDescription>
                                How satisfied users were with job postings on the platform
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {stats && (
                                <div className="space-y-4">
                                    {Object.entries(stats.jobSatisfactionBreakdown).map(([rating, count]) => {
                                        const percentage =
                                            stats.totalResponses > 0
                                                ? ((count / stats.totalResponses) * 100).toFixed(1)
                                                : 0;

                                        let ratingLabel = '';
                                        let ratingColor = '';

                                        switch (rating) {
                                            case 'very_satisfied':
                                                ratingLabel = 'Very Satisfied';
                                                ratingColor = 'bg-green-500';
                                                break;
                                            case 'satisfied':
                                                ratingLabel = 'Satisfied';
                                                ratingColor = 'bg-blue-500';
                                                break;
                                            case 'neutral':
                                                ratingLabel = 'Neutral';
                                                ratingColor = 'bg-yellow-500';
                                                break;
                                            case 'unsatisfied':
                                                ratingLabel = 'Unsatisfied';
                                                ratingColor = 'bg-orange-500';
                                                break;
                                            case 'very_unsatisfied':
                                                ratingLabel = 'Very Unsatisfied';
                                                ratingColor = 'bg-red-500';
                                                break;
                                            default:
                                                ratingLabel = rating.charAt(0).toUpperCase() + rating.slice(1);
                                                ratingColor = 'bg-gray-500';
                                        }

                                        const isSelected = selectedSatisfaction === rating;

                                        return (
                                            <button
                                                key={rating}
                                                onClick={() => {
                                                    setSelectedSatisfaction(isSelected ? undefined : rating);
                                                    setCurrentPage(1);
                                                }}
                                                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${isSelected
                                                    ? 'border-primary bg-primary/5'
                                                    : 'border-secondary hover:border-primary/50'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="font-medium">{ratingLabel}</p>
                                                        <p className="text-sm text-muted-foreground mt-1">{count} responses</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-2xl font-bold">{percentage}%</p>
                                                        <div className="mt-2 w-20 bg-secondary rounded-full h-3 overflow-hidden">
                                                            <div
                                                                className={`${ratingColor} h-full`}
                                                                style={{ width: `${percentage}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Experience Tab */}
                <TabsContent value="experience" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Overall Experience Ratings</CardTitle>
                            <CardDescription>
                                How users rated their overall experience on the platform
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {stats && (
                                <div className="space-y-4">
                                    {Object.entries(stats.overallExperienceBreakdown).map(([rating, count]) => {
                                        const percentage =
                                            stats.totalResponses > 0
                                                ? ((count / stats.totalResponses) * 100).toFixed(1)
                                                : 0;

                                        let ratingLabel = '';
                                        let ratingColor = '';

                                        switch (rating) {
                                            case 'excellent':
                                                ratingLabel = 'Excellent';
                                                ratingColor = 'bg-green-500';
                                                break;
                                            case 'good':
                                                ratingLabel = 'Good';
                                                ratingColor = 'bg-blue-500';
                                                break;
                                            case 'fair':
                                                ratingLabel = 'Fair';
                                                ratingColor = 'bg-yellow-500';
                                                break;
                                            case 'poor':
                                                ratingLabel = 'Poor';
                                                ratingColor = 'bg-orange-500';
                                                break;
                                            case 'very_poor':
                                                ratingLabel = 'Very Poor';
                                                ratingColor = 'bg-red-500';
                                                break;
                                            default:
                                                ratingLabel = rating.charAt(0).toUpperCase() + rating.slice(1);
                                                ratingColor = 'bg-gray-500';
                                        }

                                        const isSelected = selectedExperience === rating;

                                        return (
                                            <button
                                                key={rating}
                                                onClick={() => {
                                                    setSelectedExperience(isSelected ? undefined : rating);
                                                    setCurrentPage(1);
                                                }}
                                                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${isSelected
                                                    ? 'border-primary bg-primary/5'
                                                    : 'border-secondary hover:border-primary/50'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="font-medium">{ratingLabel}</p>
                                                        <p className="text-sm text-muted-foreground mt-1">{count} responses</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-2xl font-bold">{percentage}%</p>
                                                        <div className="mt-2 w-20 bg-secondary rounded-full h-3 overflow-hidden">
                                                            <div
                                                                className={`${ratingColor} h-full`}
                                                                style={{ width: `${percentage}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Recommendations Tab */}
                <TabsContent value="recommendations" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Recommendation Distribution</CardTitle>
                            <CardDescription>
                                Would users recommend the service to others
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {stats && (
                                <div className="space-y-4">
                                    {Object.entries(stats.recommendToOthersBreakdown).map(([recommendation, count]) => {
                                        const percentage =
                                            stats.totalResponses > 0
                                                ? ((count / stats.totalResponses) * 100).toFixed(1)
                                                : 0;

                                        let label = '';
                                        let color = '';

                                        switch (recommendation) {
                                            case 'definitely':
                                                label = 'Definitely (Promoter)';
                                                color = 'bg-green-500';
                                                break;
                                            case 'probably':
                                                label = 'Probably (Passive)';
                                                color = 'bg-yellow-500';
                                                break;
                                            case 'probably_not':
                                                label = 'Probably Not (Detractor)';
                                                color = 'bg-orange-500';
                                                break;
                                            case 'definitely_not':
                                                label = 'Definitely Not (Detractor)';
                                                color = 'bg-red-500';
                                                break;
                                        }

                                        const isSelected = selectedRecommendation === recommendation;

                                        return (
                                            <button
                                                key={recommendation}
                                                onClick={() => {
                                                    setSelectedRecommendation(isSelected ? undefined : recommendation);
                                                    setCurrentPage(1);
                                                }}
                                                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${isSelected
                                                    ? 'border-primary bg-primary/5'
                                                    : 'border-secondary hover:border-primary/50'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="font-medium">{label}</p>
                                                        <p className="text-sm text-muted-foreground mt-1">{count} responses</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-2xl font-bold">{percentage}%</p>
                                                        <div className="mt-2 w-20 bg-secondary rounded-full h-3 overflow-hidden">
                                                            <div
                                                                className={`${color} h-full`}
                                                                style={{ width: `${percentage}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Feedback Tab */}
                <TabsContent value="feedback" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">User Feedback</CardTitle>
                            <CardDescription>
                                Detailed responses and improvement suggestions from survey respondents
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {surveyData.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">
                                        No survey responses with feedback text found
                                    </p>
                                ) : (
                                    <>
                                        <div className="space-y-4">
                                            {surveyData.map((data) => (
                                                <div key={data.id} className="border rounded-lg p-4 space-y-3">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <Badge>{data.primaryReason.replace(/_/g, ' ')}</Badge>
                                                                <span className="text-xs text-muted-foreground">
                                                                    {new Date(data.createdAt).toLocaleDateString()}
                                                                </span>
                                                            </div>

                                                            {data.reasonOtherText && (
                                                                <div className="mb-3 p-2 bg-secondary/50 rounded">
                                                                    <p className="text-sm">
                                                                        <span className="font-semibold">Other reason:</span> {data.reasonOtherText}
                                                                    </p>
                                                                </div>
                                                            )}

                                                            {data.improvementFeedback && (
                                                                <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded">
                                                                    <p className="text-sm">
                                                                        <span className="font-semibold">Feedback:</span> {data.improvementFeedback}
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap gap-2 text-xs border-t pt-3">
                                                        <Badge variant="outline">
                                                            Satisfaction: {data.jobSatisfaction}
                                                        </Badge>
                                                        <Badge variant="outline">
                                                            Experience: {data.overallExperience}
                                                        </Badge>
                                                        <Badge variant="outline">
                                                            Recommend: {data.recommendToOthers.replace(/_/g, ' ')}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Pagination */}
                                        {pagination && pagination.pages > 1 && (
                                            <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                                    disabled={currentPage === 1}
                                                >
                                                    Previous
                                                </Button>
                                                <span className="text-sm text-muted-foreground">
                                                    Page {pagination.page} of {pagination.pages}
                                                </span>
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setCurrentPage((p) => p + 1)}
                                                    disabled={!pagination.hasMore}
                                                >
                                                    Next
                                                </Button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
