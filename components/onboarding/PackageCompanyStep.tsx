import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PackageSelectionCard } from '@/components/onboarding/PackageSelectionCard'
import { SEEKER_SUBSCRIPTION_PLANS } from '@/lib/subscription-plans'
import { getServiceInfoById } from '@/lib/wordpress-sku-mapping'
import { Sparkles, ArrowRight } from 'lucide-react'

const CLEAR_SELECT_VALUE = '__clear__'

interface PackageCompanyStepProps {
  role: 'seeker' | 'employer'
  // For seeker:
  selectedPackage?: string
  onPackageSelect?: (packageId: string) => void
  // For employer:
  companyName?: string
  companySize?: string
  onCompanyUpdate?: (data: { companyName?: string; companySize?: string }) => void
  // For premium service pre-selection (Phase 2)
  pendingServiceId?: string | null
}

export function PackageCompanyStep({
  role,
  selectedPackage,
  onPackageSelect,
  companyName,
  companySize,
  onCompanyUpdate,
  pendingServiceId,
}: PackageCompanyStepProps) {
  // Get service info if there's a pending service purchase
  const pendingServiceInfo = pendingServiceId ? getServiceInfoById(pendingServiceId) : null

  if (role === 'employer') {
    // Employer: Show Company Details
    return (
      <div className="space-y-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">About Your Company</h2>
          <p className="text-gray-600">Help us understand your hiring needs</p>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          <div className="space-y-2">
            <Label htmlFor="companyName" className="text-gray-700 font-medium">
              Company Name *
            </Label>
            <Input
              id="companyName"
              value={companyName || ''}
              onChange={(e) => onCompanyUpdate?.({ companyName: e.target.value })}
              placeholder="Your company name"
              className="border-gray-300 focus:border-brand-teal focus:ring-brand-teal"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="companySize" className="text-gray-700 font-medium">
              Company Size
            </Label>
            <Select
              value={companySize || undefined}
              onValueChange={(value) =>
                onCompanyUpdate?.({ companySize: value === CLEAR_SELECT_VALUE ? '' : value })
              }
            >
              <SelectTrigger className="w-full border-gray-300 focus:ring-brand-teal focus:border-brand-teal">
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1-10">1-10 employees</SelectItem>
                <SelectItem value="11-50">11-50 employees</SelectItem>
                <SelectItem value="51-200">51-200 employees</SelectItem>
                <SelectItem value="201-500">201-500 employees</SelectItem>
                <SelectItem value="501+">501+ employees</SelectItem>
                <SelectItem value={CLEAR_SELECT_VALUE}>Clear selection</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    )
  }

  // Seeker: Show Package Selection
  return (
    <div className="space-y-8">
      {/* Premium Service Banner - shows when user clicked a service link from WordPress */}
      {pendingServiceInfo && (
        <div className="bg-gradient-to-r from-brand-teal/10 via-brand-coral/10 to-brand-teal/10 border border-brand-teal/30 rounded-xl p-5 mb-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-brand-teal/20 rounded-full flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-brand-teal" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                You&apos;re on your way to: {pendingServiceInfo.name}
              </h3>
              <p className="text-gray-700 text-sm mb-3">
                To purchase <strong>{pendingServiceInfo.name}</strong> ({pendingServiceInfo.priceDescription}),
                a minimum of the <strong>3-Day Free Trial</strong> is required. After your trial ends,
                it will auto-renew at $34.99/month—you can cancel anytime. Want more benefits?
                Feel free to select a different plan below.
              </p>
              <div className="flex items-center gap-2 text-sm text-brand-teal font-medium">
                <span>Select Membership</span>
                <ArrowRight className="w-4 h-4" />
                <span>Complete Checkout</span>
                <ArrowRight className="w-4 h-4" />
                <span>Purchase {pendingServiceInfo.name}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Choose Your Membership Plan</h2>
        <p className="text-gray-600">Select a plan to access job opportunities and get started</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {SEEKER_SUBSCRIPTION_PLANS.map((plan) => (
          <PackageSelectionCard
            key={plan.id}
            plan={plan}
            selected={selectedPackage === plan.id}
            onSelect={() => onPackageSelect?.(plan.id)}
          />
        ))}
      </div>

      <div className="text-center">
        <p className="text-sm text-gray-500">
          You'll be redirected to secure checkout after completing your profile
        </p>
      </div>
    </div>
  )
}
