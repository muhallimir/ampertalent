'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CreditCard,
  Zap,
  CheckCircle,
  Plus,
} from 'lucide-react';
import { getWithImpersonation } from '@/lib/api-client';

interface PaymentMethod {
  id: string;
  type: 'card';
  last4: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
}

interface ResumeCritiquePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (paymentMethodId: string) => void;
  onAddPaymentMethod: () => void;
  amount: number;
  description: string;
  isLoading: boolean;
}

export function ResumeCritiquePaymentModal({
  isOpen,
  onClose,
  onConfirm,
  onAddPaymentMethod,
  amount,
  description,
  isLoading
}: ResumeCritiquePaymentModalProps) {

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadPaymentMethods();
    }
  }, [isOpen]);

  const loadPaymentMethods = async () => {
    try {
      setIsLoadingPaymentMethods(true);
      const response = await getWithImpersonation(
        '/api/seeker/subscription/payment-methods'
      );
      if (response.ok) {
        const data = await response.json();
        const methods = data.paymentMethods || [];
        setPaymentMethods(methods);

        // Auto-select default payment method
        const defaultMethod = methods.find(
          (method: PaymentMethod) => method.isDefault
        );
        if (defaultMethod) {
          setSelectedPaymentMethod(defaultMethod.id);
        } else if (methods.length > 0) {
          setSelectedPaymentMethod(methods[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
    } finally {
      setIsLoadingPaymentMethods(false);
    }
  };

  const handleConfirm = () => {
    if (selectedPaymentMethod) {
      onConfirm(selectedPaymentMethod);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5 text-blue-600" />
            <span>Select Payment Method</span>
          </DialogTitle>
          <DialogDescription>
            Complete your purchase for {description} - ${amount.toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {isLoadingPaymentMethods ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="md" />
            </div>
          ) : paymentMethods.length > 0 ? (
            <div className="space-y-3">
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedPaymentMethod === method.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedPaymentMethod(method.id)}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-4 h-4 rounded-full border-2 ${
                        selectedPaymentMethod === method.id
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300'
                      }`}
                    >
                      {selectedPaymentMethod === method.id && (
                        <div className="w-full h-full rounded-full bg-white scale-50"></div>
                      )}
                    </div>
                    <CreditCard className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium">
                        {method.brand} ****{method.last4}
                      </p>
                      <p className="text-sm text-gray-600">
                        Expires{' '}
                        {method.expiryMonth.toString().padStart(2, '0')}/
                        {method.expiryYear}
                        {method.isDefault && (
                          <span className="ml-2 text-blue-600 font-medium">
                            • Default
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              <Button
                variant="outline"
                className="w-full"
                onClick={onAddPaymentMethod}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Payment Method
              </Button>
            </div>
          ) : (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Payment Methods
              </h3>
              <p className="text-gray-600 mb-4">
                Add a payment method to complete your purchase
              </p>
              <Button onClick={onAddPaymentMethod}>
                <Plus className="h-4 w-4 mr-2" />
                Add Payment Method
              </Button>
            </div>
          )}

          {paymentMethods.length > 0 && (
            <div className="flex justify-between space-x-3 pt-4 border-t">
              <Button variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isLoading || !selectedPaymentMethod}
                className="min-w-[120px]"
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Pay ${amount.toFixed(2)}
                  </>
                )}
              </Button>
            </div>
          )}

          {!isLoadingPaymentMethods && paymentMethods.length === 0 && (
            <div className="flex justify-between space-x-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
