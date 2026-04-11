import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, CheckCircle, Star } from 'lucide-react'
import { SeekerSubscriptionPlan } from '@/lib/subscription-plans'

interface PackageSelectionCardProps {
  plan: SeekerSubscriptionPlan
  selected: boolean
  onSelect: () => void
}

export function PackageSelectionCard({ plan, selected, onSelect }: PackageSelectionCardProps) {
  const IconComponent = plan.icon

  return (
    <Card
      className={`cursor-pointer transition-all duration-200 relative ${selected
        ? `ring-2 ring-brand-teal ${plan.borderColor} border-2 shadow-lg`
        : 'border-gray-200 hover:border-brand-teal/50 hover:shadow-md'
        }`}
      onClick={onSelect}
    >
      {/* Popular badge - always show if plan.popular is true */}
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
          <Badge className="bg-yellow-500 text-white px-3 py-1">
            <Star className="h-3 w-3 mr-1" />
            Popular
          </Badge>
        </div>
      )}

      <CardHeader className={`${plan.bgColor} rounded-t-lg text-center pb-4`}>
        <div className={`w-12 h-12 ${plan.bgColor} rounded-full flex items-center justify-center mx-auto mb-3 border-2 ${plan.borderColor}`}>
          <IconComponent className={`h-6 w-6 ${plan.color}`} />
        </div>
        <CardTitle className="text-lg font-bold text-gray-900">
          {plan.name}
        </CardTitle>
        <div className="text-2xl font-bold text-gray-900">
          ${plan.price}
        </div>
        <div className="text-sm text-gray-600">
          ${plan.price} / {plan.billing} to post{' '}
          {plan.resumeLimit >= 999 || plan.resumeLimit === -1
            ? 'unlimited resumes'
            : `${plan.resumeLimit} resume${plan.resumeLimit !== 1 ? 's' : ''}`}{' '}
          {plan.trialDays ? 'per period' : `for ${plan.duration} days`}
        </div>
        {plan.trialDays && (
          <div className="text-sm font-medium text-brand-teal">
            {plan.trialDays}-day free trial
          </div>
        )}
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        <div className="space-y-2">

          {plan.features.slice(0, 3).map((feature, index) => (
            <div key={index} className="flex items-start space-x-2">
              <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-gray-700">{feature}</span>
            </div>
          ))}
        </div>

        {plan.includes && plan.includes.length > 0 && (
          <div className="border-t pt-3">
            {plan.includes.map((item, index) => (
              <div key={index} className="flex items-start space-x-2">
                <Check className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-purple-700 font-medium">
                  Free "Get The Job Done! Hire A Mom" T-shirt
                </span>
              </div>
            ))}
            <p className="text-xs text-gray-500 mt-1">
              (US Residents only for t-shirts)
            </p>
          </div>
        )}

        <div className="border-t pt-3">
          {plan.support.map((support, index) => (
            <div key={index} className="flex items-start space-x-2">
              <Check className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-gray-700">{support}</span>
            </div>
          ))}
        </div>

        {selected && (
          <div className="pt-2 border-t">
            <div className="flex items-center justify-center space-x-2 text-brand-teal">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Selected</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}