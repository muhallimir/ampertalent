'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useToast } from '@/components/ui/toast';
import { postWithImpersonation } from '@/lib/api-client';

interface CancellationSurveyFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    onError: (message: string) => void;
    subscriptionId: string;
}

interface FormData {
    primaryReason: string;
    reasonOtherText: string;
    jobSatisfaction: string;
    overallExperience: string;
    improvementFeedback: string;
    recommendToOthers: string;
}

export function CancellationSurveyForm({
    isOpen,
    onClose,
    onSuccess,
    onError,
    subscriptionId,
}: CancellationSurveyFormProps) {
    const { addToast } = useToast();
    const [formData, setFormData] = useState<FormData>({
        primaryReason: '',
        reasonOtherText: '',
        jobSatisfaction: '',
        overallExperience: '',
        improvementFeedback: '',
        recommendToOthers: '',
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [currentStep, setCurrentStep] = useState(1);

    const handleInputChange = (field: keyof FormData, value: string) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
        // Clear error for this field when user starts typing
        if (errors[field]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const validateStep = (step: number): boolean => {
        const newErrors: Record<string, string> = {};

        if (step === 1) {
            if (!formData.primaryReason) {
                newErrors.primaryReason = 'Please select a reason';
            }
            if (formData.primaryReason === 'other' && formData.reasonOtherText.trim().length < 10) {
                newErrors.reasonOtherText = 'Please provide at least 10 characters for your reason';
            }
        } else if (step === 2) {
            if (!formData.jobSatisfaction) {
                newErrors.jobSatisfaction = 'Please select your satisfaction level';
            }
            if (!formData.overallExperience) {
                newErrors.overallExperience = 'Please rate your overall experience';
            }
        } else if (step === 3) {
            if (!formData.recommendToOthers) {
                newErrors.recommendToOthers = 'Please select an option';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validateStep(currentStep)) {
            setCurrentStep((prev) => prev + 1);
        }
    };

    const handlePrevious = () => {
        setCurrentStep((prev) => Math.max(1, prev - 1));
    };

    const handleSubmit = async () => {
        if (!validateStep(currentStep)) {
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await postWithImpersonation('/api/seeker/subscription/cancellation-survey', {
                subscriptionId,
                primaryReason: formData.primaryReason,
                reasonOtherText: formData.reasonOtherText || undefined,
                jobSatisfaction: formData.jobSatisfaction,
                overallExperience: formData.overallExperience,
                improvementFeedback: formData.improvementFeedback || undefined,
                recommendToOthers: formData.recommendToOthers,
            });

            const result = await response.json();

            if (result.success) {
                addToast({
                    title: 'Thank You!',
                    description: 'Your feedback has been submitted successfully.',
                    variant: 'success',
                });
                // Reset form state before calling onSuccess
                setFormData({
                    primaryReason: '',
                    reasonOtherText: '',
                    jobSatisfaction: '',
                    overallExperience: '',
                    improvementFeedback: '',
                    recommendToOthers: '',
                });
                setCurrentStep(1);
                // Only call onSuccess - it handles closing the survey and
                // proceeding with cancellation. Do NOT call onClose here as it
                // would reset isCancelling before the cancel API call runs.
                onSuccess();
            } else {
                onError(result.error || 'Failed to submit survey');
                addToast({
                    title: 'Error',
                    description: result.error || 'Failed to submit survey',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Error submitting survey:', error);
            const errorMessage = 'Failed to submit survey. Please try again.';
            onError(errorMessage);
            addToast({
                title: 'Error',
                description: errorMessage,
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            onClose();
            setFormData({
                primaryReason: '',
                reasonOtherText: '',
                jobSatisfaction: '',
                overallExperience: '',
                improvementFeedback: '',
                recommendToOthers: '',
            });
            setCurrentStep(1);
            setErrors({});
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>We&apos;d Love Your Feedback</DialogTitle>
                    <DialogDescription>
                        Before you go, could you help us improve by sharing your feedback? (Step {currentStep} of 3)
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Step 1: Primary Reason */}
                    {currentStep === 1 && (
                        <div className="space-y-4">
                            <h3 className="font-semibold text-gray-900">What is the primary reason for canceling your subscription?</h3>
                            <div className="space-y-3">
                                {[
                                    { value: 'found_hiremymom', label: 'I found a job through HireMyMom.com' },
                                    { value: 'found_other', label: 'I found a job through another source' },
                                    { value: 'no_suitable_job', label: 'I could not find a suitable job' },
                                    { value: 'budget_tight', label: 'My budget is too tight right now' },
                                    { value: 'other', label: 'Other (please specify)' },
                                ].map((option) => (
                                    <div key={option.value} className="flex items-start space-x-3">
                                        <input
                                            type="radio"
                                            id={option.value}
                                            name="primaryReason"
                                            value={option.value}
                                            checked={formData.primaryReason === option.value}
                                            onChange={(e) => handleInputChange('primaryReason', e.target.value)}
                                            className="mt-1 h-4 w-4 cursor-pointer"
                                        />
                                        <label htmlFor={option.value} className="cursor-pointer text-sm text-gray-700">
                                            {option.label}
                                        </label>
                                    </div>
                                ))}
                            </div>

                            {/* Other reason text field */}
                            {formData.primaryReason === 'other' && (
                                <div className="mt-4 space-y-2">
                                    <label htmlFor="reasonOtherText" className="block text-sm font-medium text-gray-900">
                                        Please specify:
                                    </label>
                                    <textarea
                                        id="reasonOtherText"
                                        value={formData.reasonOtherText}
                                        onChange={(e) => handleInputChange('reasonOtherText', e.target.value)}
                                        placeholder="Enter your reason (minimum 10 characters)..."
                                        className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-brand-teal focus:ring-1 focus:ring-brand-teal"
                                        rows={3}
                                    />
                                    {errors.reasonOtherText && (
                                        <p className="text-sm text-red-600">{errors.reasonOtherText}</p>
                                    )}
                                </div>
                            )}

                            {errors.primaryReason && (
                                <p className="text-sm text-red-600">{errors.primaryReason}</p>
                            )}
                        </div>
                    )}

                    {/* Step 2: Satisfaction & Experience */}
                    {currentStep === 2 && (
                        <div className="space-y-6">
                            {/* Job Satisfaction */}
                            <div className="space-y-3">
                                <h3 className="font-semibold text-gray-900">How satisfied were you with the jobs posted on HireMyMom.com?</h3>
                                <div className="space-y-2">
                                    {[
                                        { value: 'very_satisfied', label: 'Very satisfied' },
                                        { value: 'satisfied', label: 'Satisfied' },
                                        { value: 'neutral', label: 'Neutral' },
                                        { value: 'unsatisfied', label: 'Unsatisfied' },
                                        { value: 'very_unsatisfied', label: 'Very unsatisfied' },
                                    ].map((option) => (
                                        <div key={option.value} className="flex items-center space-x-3">
                                            <input
                                                type="radio"
                                                id={`satisfaction_${option.value}`}
                                                name="jobSatisfaction"
                                                value={option.value}
                                                checked={formData.jobSatisfaction === option.value}
                                                onChange={(e) => handleInputChange('jobSatisfaction', e.target.value)}
                                                className="h-4 w-4 cursor-pointer"
                                            />
                                            <label htmlFor={`satisfaction_${option.value}`} className="cursor-pointer text-sm text-gray-700">
                                                {option.label}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                                {errors.jobSatisfaction && (
                                    <p className="text-sm text-red-600">{errors.jobSatisfaction}</p>
                                )}
                            </div>

                            {/* Overall Experience */}
                            <div className="space-y-3">
                                <h3 className="font-semibold text-gray-900">How would you rate your overall experience with HireMyMom.com?</h3>
                                <div className="space-y-2">
                                    {[
                                        { value: 'excellent', label: 'Excellent' },
                                        { value: 'good', label: 'Good' },
                                        { value: 'fair', label: 'Fair' },
                                        { value: 'poor', label: 'Poor' },
                                        { value: 'very_poor', label: 'Very poor' },
                                    ].map((option) => (
                                        <div key={option.value} className="flex items-center space-x-3">
                                            <input
                                                type="radio"
                                                id={`experience_${option.value}`}
                                                name="overallExperience"
                                                value={option.value}
                                                checked={formData.overallExperience === option.value}
                                                onChange={(e) => handleInputChange('overallExperience', e.target.value)}
                                                className="h-4 w-4 cursor-pointer"
                                            />
                                            <label htmlFor={`experience_${option.value}`} className="cursor-pointer text-sm text-gray-700">
                                                {option.label}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                                {errors.overallExperience && (
                                    <p className="text-sm text-red-600">{errors.overallExperience}</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Feedback & Recommendation */}
                    {currentStep === 3 && (
                        <div className="space-y-6">
                            {/* Improvement Feedback */}
                            <div className="space-y-2">
                                <h3 className="font-semibold text-gray-900">What feedback do you have for us or how could we improve our services for job seekers like you?</h3>
                                <textarea
                                    value={formData.improvementFeedback}
                                    onChange={(e) => handleInputChange('improvementFeedback', e.target.value)}
                                    placeholder="Share your thoughts (optional)..."
                                    className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-brand-teal focus:ring-1 focus:ring-brand-teal"
                                    rows={3}
                                />
                            </div>

                            {/* Recommendation */}
                            <div className="space-y-3">
                                <h3 className="font-semibold text-gray-900">Would you recommend HireMyMom.com to others?</h3>
                                <div className="space-y-2">
                                    {[
                                        { value: 'definitely', label: 'Definitely' },
                                        { value: 'probably', label: 'Probably' },
                                        { value: 'not_sure', label: 'Not sure' },
                                        { value: 'probably_not', label: 'Probably not' },
                                        { value: 'definitely_not', label: 'Definitely not' },
                                    ].map((option) => (
                                        <div key={option.value} className="flex items-center space-x-3">
                                            <input
                                                type="radio"
                                                id={`recommend_${option.value}`}
                                                name="recommendToOthers"
                                                value={option.value}
                                                checked={formData.recommendToOthers === option.value}
                                                onChange={(e) => handleInputChange('recommendToOthers', e.target.value)}
                                                className="h-4 w-4 cursor-pointer"
                                            />
                                            <label htmlFor={`recommend_${option.value}`} className="cursor-pointer text-sm text-gray-700">
                                                {option.label}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                                {errors.recommendToOthers && (
                                    <p className="text-sm text-red-600">{errors.recommendToOthers}</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between space-x-3 border-t pt-4">
                    <Button
                        variant="outline"
                        onClick={handlePrevious}
                        disabled={currentStep === 1 || isSubmitting}
                    >
                        Previous
                    </Button>

                    <div className="flex space-x-3">
                        <Button
                            variant="outline"
                            onClick={handleClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>

                        {currentStep < 3 ? (
                            <Button
                                onClick={handleNext}
                                disabled={isSubmitting}
                            >
                                Next
                            </Button>
                        ) : (
                            <Button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <LoadingSpinner size="sm" className="mr-2" />
                                        Submitting...
                                    </>
                                ) : (
                                    'Submit Survey'
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
