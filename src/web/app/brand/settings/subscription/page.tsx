'use client'

import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import useBrand from '@/hooks/useBrand';
import useAuth from '@/hooks/useAuth';
import useToast from '@/hooks/useToast';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Alert, AlertTitle, AlertDescription, AlertIcon } from '@/components/ui/Alert';
import PageHeader from '@/components/layout/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import Skeleton from '@/components/ui/Skeleton';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '@/components/ui/Modal';
import { SubscriptionTier, SubscriptionStatus } from '@/types/user';

// Initialize Stripe only in browser environment
const stripePromise = typeof window !== 'undefined' 
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')
  : null;

// Interface for subscription plan
interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number | string;
  features: string[];
  limitations: string[];
}

// Interface for subscription add-on
interface SubscriptionAddon {
  id: string;
  name: string;
  description: string;
  price: number;
  priceDescription: string;
}

// Interface for billing history item
interface BillingHistoryItem {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: string;
  invoiceUrl: string;
}

const SubscriptionPage: React.FC = () => {
  // Get brand data from the useBrand hook
  const { brand, brandLoading, brandError } = useBrand();
  const { user } = useAuth();
  const toast = useToast();
  
  // State for subscription data
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [subscriptionAddons, setSubscriptionAddons] = useState<SubscriptionAddon[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [loadingAddons, setLoadingAddons] = useState(true);
  
  // State for modals
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Payment history state
  const [billingHistory, setBillingHistory] = useState<BillingHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Fetch subscription plans, add-ons, and billing history on component mount
  useEffect(() => {
    if (brand?.id) {
      fetchSubscriptionPlans();
      fetchSubscriptionAddons();
      fetchBillingHistory();
    }
  }, [brand?.id]);
  
  // Fetch subscription plans from API
  const fetchSubscriptionPlans = async () => {
    setLoadingPlans(true);
    try {
      const plans = await api.get<SubscriptionPlan[]>('/api/subscriptions/plans');
      setSubscriptionPlans(plans);
    } catch (error) {
      toast.error('Failed to load subscription plans', 'Please try again later');
      // Set some default plans as fallback
      setSubscriptionPlans([
        {
          id: 'free',
          name: 'Free',
          description: 'Basic access for simple brand needs',
          price: 0,
          features: [
            'Limited creator discovery',
            'Basic analytics',
            'Up to 3 saved searches',
            'Manual outreach'
          ],
          limitations: [
            'No AI-powered matching',
            'Limited discovery filters',
            'No media kit access'
          ]
        },
        {
          id: 'basic',
          name: 'Basic',
          description: 'Essential tools for growing brands',
          price: 49,
          features: [
            'Enhanced creator discovery',
            'Advanced analytics',
            'Up to 10 saved searches',
            'Basic AI matching',
            'Campaign management'
          ],
          limitations: [
            'Limited AI-powered features',
            'Standard support only'
          ]
        },
        {
          id: 'pro',
          name: 'Pro',
          description: 'Advanced tools for established brands',
          price: 149,
          features: [
            'Full creator discovery access',
            'Comprehensive analytics',
            'Unlimited saved searches',
            'Advanced AI matching',
            'Priority support',
            'Media kit access',
            'Contract templates'
          ],
          limitations: []
        },
        {
          id: 'enterprise',
          name: 'Enterprise',
          description: 'Custom solutions for large brands',
          price: 'Custom',
          features: [
            'All Pro features',
            'Dedicated account manager',
            'Custom reporting',
            'API access',
            'White-label options',
            'Custom integrations'
          ],
          limitations: []
        }
      ]);
    } finally {
      setLoadingPlans(false);
    }
  };
  
  // Fetch subscription add-ons from API
  const fetchSubscriptionAddons = async () => {
    setLoadingAddons(true);
    try {
      const addons = await api.get<SubscriptionAddon[]>('/api/subscriptions/addons');
      setSubscriptionAddons(addons);
    } catch (error) {
      toast.error('Failed to load subscription add-ons', 'Please try again later');
      // Set some default add-ons as fallback
      setSubscriptionAddons([
        {
          id: 'additional_users',
          name: 'Additional Team Members',
          description: 'Add more users to your brand account',
          price: 19,
          priceDescription: 'per user/month'
        },
        {
          id: 'advanced_analytics',
          name: 'Advanced Analytics',
          description: 'Deeper insights and custom reporting',
          price: 39,
          priceDescription: 'per month'
        },
        {
          id: 'priority_support',
          name: 'Priority Support',
          description: 'Dedicated support with faster response times',
          price: 29,
          priceDescription: 'per month'
        }
      ]);
    } finally {
      setLoadingAddons(false);
    }
  };
  
  // Fetch billing history from API
  const fetchBillingHistory = async () => {
    if (!brand?.id) return;
    
    setLoadingHistory(true);
    try {
      const history = await api.get<BillingHistoryItem[]>(`/api/subscriptions/${brand.id}/invoices`);
      setBillingHistory(history);
    } catch (error) {
      toast.error('Failed to load billing history', 'Please try again later');
      setBillingHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };
  
  // Helper to get the current subscription plan details
  const getCurrentPlan = () => {
    if (!brand || !subscriptionPlans.length) return null;
    return subscriptionPlans.find(plan => plan.id === brand.subscriptionTier.toLowerCase()) || null;
  };
  
  // Handle subscription upgrade
  const handleUpgradeSubscription = async (planId: string) => {
    if (!brand?.id) return;
    
    setIsProcessing(true);
    try {
      // Create a checkout session via API
      const session = await api.post<{ sessionId: string }>('/api/subscriptions/create-checkout', {
        brandId: brand.id,
        planId: planId,
        successUrl: `${window.location.origin}/brand/settings/subscription?success=true`,
        cancelUrl: `${window.location.origin}/brand/settings/subscription?canceled=true`
      });
      
      // Redirect to Stripe Checkout
      if (stripePromise && session.sessionId) {
        const stripe = await stripePromise;
        await stripe?.redirectToCheckout({ sessionId: session.sessionId });
      } else {
        throw new Error('Failed to redirect to checkout');
      }
    } catch (error) {
      toast.error('Subscription upgrade failed', 'Please try again later');
    } finally {
      setIsProcessing(false);
      setShowUpgradeModal(false);
    }
  };
  
  // Handle subscription cancellation
  const handleCancelSubscription = async () => {
    if (!brand?.id) return;
    
    setIsProcessing(true);
    try {
      await api.post(`/api/subscriptions/${brand.id}/cancel`);
      toast.success('Subscription canceled', 'Your subscription will end at the current billing period');
      // In a real implementation, we would refresh the brand data here
      setShowCancelModal(false);
    } catch (error) {
      toast.error('Cancellation failed', 'Please try again later');
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Handle payment method update
  const handleUpdatePaymentMethod = async () => {
    if (!brand?.id) return;
    
    setIsProcessing(true);
    try {
      // Create a setup session via API
      const session = await api.post<{ sessionId: string }>('/api/subscriptions/update-payment-method', {
        brandId: brand.id,
        successUrl: `${window.location.origin}/brand/settings/subscription?payment_updated=true`,
        cancelUrl: `${window.location.origin}/brand/settings/subscription?payment_update_canceled=true`
      });
      
      // Redirect to Stripe Setup
      if (stripePromise && session.sessionId) {
        const stripe = await stripePromise;
        await stripe?.redirectToCheckout({ sessionId: session.sessionId });
      } else {
        throw new Error('Failed to redirect to payment update');
      }
    } catch (error) {
      toast.error('Payment method update failed', 'Please try again later');
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Handle add-on purchase
  const handlePurchaseAddon = async (addonId: string) => {
    if (!brand?.id) return;
    
    setIsProcessing(true);
    try {
      // Create a checkout session for add-on via API
      const session = await api.post<{ sessionId: string }>('/api/subscriptions/add-on', {
        brandId: brand.id,
        addonId: addonId,
        successUrl: `${window.location.origin}/brand/settings/subscription?addon_success=true`,
        cancelUrl: `${window.location.origin}/brand/settings/subscription?addon_canceled=true`
      });
      
      // Redirect to Stripe Checkout
      if (stripePromise && session.sessionId) {
        const stripe = await stripePromise;
        await stripe?.redirectToCheckout({ sessionId: session.sessionId });
      } else {
        throw new Error('Failed to redirect to checkout');
      }
    } catch (error) {
      toast.error('Add-on purchase failed', 'Please try again later');
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Check URL parameters for success/canceled notifications
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      
      if (urlParams.get('success') === 'true') {
        toast.success('Subscription updated successfully', 'Your plan has been upgraded');
      }
      
      if (urlParams.get('canceled') === 'true') {
        toast.info('Subscription update canceled', 'Your current plan remains unchanged');
      }
      
      if (urlParams.get('payment_updated') === 'true') {
        toast.success('Payment method updated', 'Your payment information has been updated');
      }
      
      if (urlParams.get('addon_success') === 'true') {
        toast.success('Add-on purchased', 'Your add-on has been activated');
      }
      
      // Clean up URL parameters after processing
      if (urlParams.has('success') || urlParams.has('canceled') || 
          urlParams.has('payment_updated') || urlParams.has('addon_success')) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [toast]);
  
  // Error state
  if (brandError) {
    return (
      <Alert variant="error" className="mb-8">
        <AlertIcon variant="error" />
        <AlertTitle>Error loading subscription information</AlertTitle>
        <AlertDescription>
          {brandError.message || 'Please try refreshing the page or contact support if the problem persists.'}
        </AlertDescription>
      </Alert>
    );
  }
  
  // Loading state for the entire page
  if (brandLoading || loadingPlans) {
    return (
      <div className="space-y-6">
        <Skeleton height={150} className="w-full" />
        <Skeleton height={300} className="w-full" />
        <Skeleton height={200} className="w-full" />
      </div>
    );
  }
  
  // If no brand data is available, show an error
  if (!brand) {
    return (
      <Alert variant="error" className="mb-8">
        <AlertIcon variant="error" />
        <AlertTitle>Subscription information not available</AlertTitle>
        <AlertDescription>
          Unable to load your subscription details. Please try refreshing the page or contact support.
        </AlertDescription>
      </Alert>
    );
  }
  
  const currentPlan = getCurrentPlan();
  
  return (
    <>
      <PageHeader 
        title="Subscription Settings" 
        description="Manage your subscription plan, billing information, and add-ons"
        breadcrumbs={[
          { label: 'Dashboard', href: '/brand/dashboard' },
          { label: 'Settings', href: '/brand/settings' },
          { label: 'Subscription', href: '/brand/settings/subscription', active: true }
        ]}
      />
      
      {/* Current Subscription Information */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>Your current subscription plan and status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {brand.subscriptionStatus === SubscriptionStatus.PAST_DUE && (
            <Alert variant="error" className="mb-4">
              <AlertIcon variant="error" />
              <AlertTitle>Payment Overdue</AlertTitle>
              <AlertDescription>
                Your payment is past due. Please update your payment method to avoid service interruption.
              </AlertDescription>
            </Alert>
          )}
          
          {brand.subscriptionStatus === SubscriptionStatus.CANCELED && (
            <Alert variant="warning" className="mb-4">
              <AlertIcon variant="warning" />
              <AlertTitle>Subscription Canceled</AlertTitle>
              <AlertDescription>
                Your subscription has been canceled and will end on your next billing date. You can reactivate your subscription before that date.
              </AlertDescription>
            </Alert>
          )}
          
          <div className="flex flex-col md:flex-row justify-between gap-6">
            <div>
              <h3 className="text-lg font-medium">{currentPlan?.name || brand.subscriptionTier}</h3>
              <p className="text-gray-600">
                Status: <span className="font-medium">{brand.subscriptionStatus}</span>
              </p>
              {brand.subscriptionRenewsAt && (
                <p className="text-gray-600">
                  Renews on: <span className="font-medium">
                    {new Date(brand.subscriptionRenewsAt).toLocaleDateString()}
                  </span>
                </p>
              )}
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Included Features:</h4>
                <ul className="space-y-1">
                  {currentPlan?.features.map((feature, index) => (
                    <li key={index} className="text-sm flex items-start">
                      <span className="text-green-500 mr-2">✓</span> {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <Button
                variant="primary"
                onClick={() => {
                  setShowUpgradeModal(true);
                }}
                disabled={brand.subscriptionTier === SubscriptionTier.ENTERPRISE}
              >
                Upgrade Plan
              </Button>
              
              <Button
                variant="outline"
                onClick={handleUpdatePaymentMethod}
              >
                Update Payment Method
              </Button>
              
              {brand.subscriptionStatus !== SubscriptionStatus.CANCELED && 
               brand.subscriptionTier !== SubscriptionTier.FREE && (
                <Button
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => setShowCancelModal(true)}
                >
                  Cancel Subscription
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Subscription Management */}
      <Tabs.Root defaultValue="plans" className="mt-6">
        <Tabs.List className="mb-4">
          <Tabs.Trigger value="plans">Available Plans</Tabs.Trigger>
          <Tabs.Trigger value="addons">Add-ons</Tabs.Trigger>
          <Tabs.Trigger value="billing">Billing History</Tabs.Trigger>
        </Tabs.List>
        
        {/* Available Plans Tab */}
        <Tabs.Content value="plans" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {subscriptionPlans.map((plan) => (
              <Card 
                key={plan.id} 
                className={`flex flex-col h-full ${
                  plan.id === brand.subscriptionTier.toLowerCase() 
                    ? 'border-blue-500 shadow-md' 
                    : ''
                }`}
              >
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    {plan.name}
                    {plan.id === brand.subscriptionTier.toLowerCase() && (
                      <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                        Current
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="mb-4">
                    <p className="text-2xl font-bold">
                      {typeof plan.price === 'number' 
                        ? plan.price === 0 
                          ? 'Free' 
                          : `$${plan.price}/mo` 
                        : plan.price}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2">Features:</h4>
                    <ul className="space-y-1 mb-4">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="text-sm flex items-start">
                          <span className="text-green-500 mr-2">✓</span> {feature}
                        </li>
                      ))}
                    </ul>
                    {plan.limitations.length > 0 && (
                      <>
                        <h4 className="text-sm font-medium mb-2">Limitations:</h4>
                        <ul className="space-y-1">
                          {plan.limitations.map((limitation, index) => (
                            <li key={index} className="text-sm flex items-start">
                              <span className="text-red-500 mr-2">×</span> {limitation}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  {plan.id === brand.subscriptionTier.toLowerCase() ? (
                    <Button variant="outline" className="w-full" disabled>
                      Current Plan
                    </Button>
                  ) : plan.id === 'enterprise' ? (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => {
                        toast.info(
                          'Contact sales for Enterprise plan', 
                          'Please contact our sales team for a custom quote.',
                          { duration: 5000 }
                        );
                      }}
                    >
                      Contact Sales
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      className="w-full"
                      onClick={() => {
                        setSelectedPlanId(plan.id);
                        setShowUpgradeModal(true);
                      }}
                      disabled={isProcessing}
                    >
                      {isProcessing ? 'Processing...' : 'Select Plan'}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        </Tabs.Content>
        
        {/* Add-ons Tab */}
        <Tabs.Content value="addons" className="space-y-6">
          {loadingAddons ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} height={250} className="w-full" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {subscriptionAddons.map((addon) => (
                <Card key={addon.id} className="flex flex-col h-full">
                  <CardHeader>
                    <CardTitle>{addon.name}</CardTitle>
                    <CardDescription>{addon.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <div className="mb-4">
                      <p className="text-xl font-bold">${addon.price}</p>
                      <p className="text-sm text-gray-500">{addon.priceDescription}</p>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handlePurchaseAddon(addon.id)}
                      disabled={isProcessing || brand.subscriptionTier === SubscriptionTier.FREE}
                    >
                      {isProcessing ? 'Processing...' : 'Add to Subscription'}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
          
          {brand.subscriptionTier === SubscriptionTier.FREE && (
            <Alert variant="info" className="mt-4">
              <AlertIcon variant="info" />
              <AlertTitle>Upgrade Required</AlertTitle>
              <AlertDescription>
                Add-ons are only available for paid subscription plans. Please upgrade your plan to access add-ons.
              </AlertDescription>
            </Alert>
          )}
        </Tabs.Content>
        
        {/* Billing History Tab */}
        <Tabs.Content value="billing" className="space-y-6">
          {loadingHistory ? (
            <div className="space-y-4">
              <Skeleton height={50} className="w-full" />
              <Skeleton height={50} className="w-full" />
              <Skeleton height={50} className="w-full" />
            </div>
          ) : billingHistory.length > 0 ? (
            <div className="bg-white overflow-hidden border rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {billingHistory.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(invoice.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {invoice.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${invoice.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          invoice.status === 'paid' 
                            ? 'bg-green-100 text-green-800' 
                            : invoice.status === 'pending' 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-red-100 text-red-800'
                        }`}>
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <a 
                          href={invoice.invoiceUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-600">No billing history available</p>
            </div>
          )}
        </Tabs.Content>
      </Tabs.Root>
      
      {/* Upgrade Confirmation Modal */}
      <Modal open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Upgrade Subscription</ModalTitle>
            <ModalDescription>
              Are you sure you want to upgrade your subscription plan?
            </ModalDescription>
          </ModalHeader>
          <div className="p-6">
            {selectedPlanId && (
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  You are about to upgrade to the{' '}
                  <span className="font-medium">
                    {subscriptionPlans.find(plan => plan.id === selectedPlanId)?.name}
                  </span>{' '}
                  plan. Your payment method will be charged immediately, and your subscription will be upgraded.
                </p>
              </div>
            )}
          </div>
          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => setShowUpgradeModal(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => selectedPlanId && handleUpgradeSubscription(selectedPlanId)}
              disabled={isProcessing}
              isLoading={isProcessing}
            >
              Confirm Upgrade
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      
      {/* Cancellation Confirmation Modal */}
      <Modal open={showCancelModal} onOpenChange={setShowCancelModal}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Cancel Subscription</ModalTitle>
            <ModalDescription>
              Are you sure you want to cancel your subscription?
            </ModalDescription>
          </ModalHeader>
          <div className="p-6">
            <p className="text-sm text-gray-600 mb-4">
              Your subscription will remain active until the end of your current billing period. After that, your account will be downgraded to the Free tier.
            </p>
            <Alert variant="warning">
              <AlertIcon variant="warning" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                Canceling your subscription will limit your access to premium features and data. This action cannot be undone.
              </AlertDescription>
            </Alert>
          </div>
          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => setShowCancelModal(false)}
              disabled={isProcessing}
            >
              Keep Subscription
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelSubscription}
              disabled={isProcessing}
              isLoading={isProcessing}
            >
              Confirm Cancellation
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default SubscriptionPage;