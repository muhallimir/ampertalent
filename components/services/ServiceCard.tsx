'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, CreditCard, Shield, Clock, Star } from 'lucide-react';
import { AdditionalServiceConfig, formatServicePrice } from '@/lib/additional-services';
import Image from 'next/image';

interface ServiceCardProps {
  service: AdditionalServiceConfig;
  onPurchase: (serviceId: string) => void;
}

export function ServiceCard({ service, onPurchase }: ServiceCardProps) {
  return (
    <div className="relative h-full">
      {service.popular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
          <Badge className="bg-yellow-500 text-white px-3 py-1">
            <Star className="h-3 w-3 mr-1" />
            Most Popular
          </Badge>
        </div>
      )}
      <Card className={`transition-all duration-200 flex flex-col h-full ${
        service.popular
          ? 'border-2 border-yellow-500 shadow-lg'
          : 'border-2 border-blue-100 hover:shadow-md hover:border-blue-200'
      }`}>

      <CardHeader className="bg-blue-50 rounded-t-lg text-center pb-4">
        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-blue-200 overflow-hidden">
          <Image
            src={`/images/services/${service.icon}`}
            alt={service.name}
            width={48}
            height={48}
            className="object-cover"
          />
        </div>
        <CardTitle className="text-xl font-bold text-gray-900">
          {service.name}
        </CardTitle>
        <Badge variant="secondary" className="mt-2 mx-auto">
          {service.category.replace('_', ' ')}
        </Badge>
        <div className="space-y-1 mt-3">
          <div className="text-3xl font-bold text-gray-900">{formatServicePrice(service.price)}</div>
          <div className="text-sm text-gray-600">One-time purchase</div>
        </div>
        <CardDescription className="mt-3 text-gray-700">
          {service.shortDescription}
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6 flex flex-col flex-grow">
        {/* Features List */}
        <div className="space-y-3 flex-grow">
          <div className="font-semibold text-gray-900 border-b pb-2">
            What&apos;s included:
          </div>
          {service.features.map((feature, index) => (
            <div key={index} className="flex items-start space-x-2">
              <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-gray-700">{feature}</span>
            </div>
          ))}
        </div>

        {/* Purchase Button */}
        <div className="pt-4">
          <Button
            onClick={() => onPurchase(service.id)}
            disabled={!service.isActive}
            className="w-full bg-brand-teal hover:bg-brand-teal/90 text-white"
            size="lg"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Purchase for {formatServicePrice(service.price)}
          </Button>
          {!service.isActive && (
            <p className="text-sm text-center text-red-500 mt-2">Currently unavailable</p>
          )}
        </div>

        {/* Additional Info */}
        <div className="pt-4 border-t border-gray-100">
          <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
            <span className="flex items-center gap-1 w-1/2 justify-center">
              <Shield className="h-4 w-4 mr-1" />
              <span className="w-1/2 text-center">Secure Payment</span>
            </span>
            <span className="flex items-center gap-1 w-1/2 justify-center">
              <Clock className="h-4 w-4 mr-1" />
              <span className="w-1/2 text-center">Quick Delivery</span>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
    </div>
  );
}
