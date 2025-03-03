import React, { useState, useEffect, useMemo } from 'react'; // react 18.0+
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'; // ^0.8.0
import { useRouter } from 'next/navigation'; // ^14.0.0
import { useQuery, useMutation } from '@tanstack/react-query'; // ^5.0.0
import { loadStripe } from '@stripe/stripe-js'; // ^1.54.0
import { CreditCard, CheckCircle, AlertCircle, Calendar, CreditCardIcon } from 'lucide-react'; // v0.279.0

import PageHeader from '../../../../../components/layout/PageHeader';
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
  CardFooter,
} from '../../../../../components/ui/Card';
import { Button } from '../../../../../components/ui/Button';
import { Badge } from '../../../../../components/ui/Badge';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '../../../../../components/ui/Tabs';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '../../../../../components/ui/Table';
import { Skeleton } from '../../../../../components/ui/Skeleton';
import { useToast } from '../../../../../hooks/useToast';
import { useCreator } from '../../../../../hooks/useCreator';
import { formatCurrency, formatDate } from '../../../../../lib/formatters';
import { cn } from '../../../../../lib/utils';
import { api } from '../../../../../lib/api';
import { SUBSCRIPTION_TIERS, FEATURE_FLAGS } from '../../../../../lib/constants';
import { SubscriptionTier, SubscriptionStatus } from '../../../../../types/user';

/**
 * Interface for subscription details
 */
interface SubscriptionDetails {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  renewsAt: Date | null;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  priceId: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod | null;
  cancelAtPeriodEnd: boolean;
  featureAccess: Record<string, boolean>;
}

/**
 * Interface for payment method details
 */
interface PaymentMethod {
  id: string;
  type: string;
  last4: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
}

/**
 * Interface for billing history item
 */
interface BillingHistoryItem {
  id: string;
  date: Date;
  description: string;
  amount: number;
  currency: string;
  status: string;
  invoiceUrl: string | null;
}

/**
 * Fetches current subscription details including tier, status, and billing information
 * @returns {Promise<SubscriptionDetails>} Details about the creator's subscription
 */
const getSubscriptionDetails = async (): Promise<SubscriptionDetails> => {
  // Initialize Supabase client for authenticated requests
  const supabase = createClientComponentClient();

  // Call the API to fetch subscription details
  const { data, error } = await supabase.functions.invoke('get-subscription');

  if (error) {
    console.error('Error fetching subscription details:', error);
    throw new Error(error.message);
  }

  // Transform response into standardized subscription details object
  const subscription = data as any; // Replace 'any' with a more specific type if possible

  // Add feature access information based on subscription tier
  const featureAccess: Record<string, boolean> = {
    aiSuggestions: subscription.tier !== SubscriptionTier.FREE && FEATURE_FLAGS.ENABLE_AI_SUGGESTIONS,
    mediaKit: subscription.tier !== SubscriptionTier.FREE && FEATURE_FLAGS.ENABLE_MEDIA_KIT,
    advancedAnalytics: subscription.tier === SubscriptionTier.PRO && FEATURE_FLAGS.ENABLE_ADVANCED_ANALYTICS,
  };

  // Return subscription details for rendering
  return {
    tier: subscription.tier,
    status: subscription.status,
    renewsAt: subscription.renewsAt ? new Date(subscription.renewsAt) : null,
    currentPeriodStart: new Date(subscription.currentPeriodStart),
    currentPeriodEnd: new Date(subscription.currentPeriodEnd),
    priceId: subscription.priceId,
    amount: subscription.amount,
    currency: subscription.currency,
    paymentMethod: subscription.paymentMethod,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    featureAccess,
  };
};

/**
 * Fetches billing history for the creator's subscription
 * @returns {Promise<BillingHistoryItem[]>} Array of billing history items
 */
const getBillingHistory = async (): Promise<BillingHistoryItem[]> => {
  // Initialize Supabase client for authenticated requests
  const supabase = createClientComponentClient();

  // Call the API to fetch billing history
  const { data, error } = await supabase.functions.invoke('get-billing-history');

  if (error) {
    console.error('Error fetching billing history:', error);
    throw new Error(error.message);
  }

  // Transform response into standardized billing history items
  const billingHistory = (data as any[]).map((item: any) => ({
    id: item.id,
    date: new Date(item.date),
    description: item.description,
    amount: item.amount,
    currency: item.currency,
    status: item.status,
    invoiceUrl: item.invoiceUrl,
  }));

  // Sort items by date in descending order
  billingHistory.sort((a, b) => b.date.getTime() - a.date.getTime());

  // Return billing history for rendering
  return billingHistory;
};

interface SubscriptionPageClientProps {
  subscription: SubscriptionDetails;
  billingHistory: BillingHistoryItem[];
}

/**
 * Client component for subscription management functionality
 * @param {object} { subscription, billingHistory }
 * @returns {JSX.Element} Rendered subscription management interface
 */
const SubscriptionPageClient: React.FC<SubscriptionPageClientProps> = ({
  subscription,
  billingHistory,
}) => {
  // Initialize state for loading states and modal visibility
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isDowngrading, setIsDowngrading] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);

  // Access toast notifications
  const { toast } = useToast();

  // Access NextJS router for navigation
  const router = useRouter();

  // Set up query for real-time subscription data
  const { data: subscriptionData, refetch: refetchSubscription } = useQuery(
    ['subscription'],
    getSubscriptionDetails,
    {
      staleTime: 60 * 1000, // 1 minute
      onError: (error: any) => {
        toast.error('Failed to load subscription details', error.message);
      },
    }
  );

  // Set up mutation for subscription changes
  const { mutate: changeSubscription } = useMutation(
    async (priceId: string) => {
      const supabase = createClientComponentClient();
      const { error } = await supabase.functions.invoke('change-subscription', {
        body: { priceId },
      });
      if (error) {
        throw new Error(error.message);
      }
    },
    {
      onSuccess: () => {
        toast.success('Subscription updated successfully');
        refetchSubscription();
      },
      onError: (error: any) => {
        toast.error('Failed to update subscription', error.message);
      },
      onSettled: () => {
        setIsUpgrading(false);
        setIsDowngrading(false);
      },
    }
  );

  // Create function to handle subscription upgrade
  const handleUpgrade = async (priceId: string) => {
    setIsUpgrading(true);
    changeSubscription(priceId);
  };

  // Create function to handle subscription downgrade
  const handleDowngrade = async (priceId: string) => {
    setIsDowngrading(true);
    changeSubscription(priceId);
  };

  // Create function to handle subscription cancellation
  const handleCancel = async () => {
    setIsCanceling(true);
    const supabase = createClientComponentClient();
    const { error } = await supabase.functions.invoke('cancel-subscription');
    if (error) {
      toast.error('Failed to cancel subscription', error.message);
    } else {
      toast.success('Subscription cancellation requested');
      refetchSubscription();
    }
    setIsCanceling(false);
  };

  // Create function to handle payment method update
  const handleUpdatePaymentMethod = async () => {
    setIsUpdatingPayment(true);
    try {
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');
      if (!stripe) {
        throw new Error('Stripe is not initialized');
      }

      const supabase = createClientComponentClient();
      const { data, error } = await supabase.functions.invoke('create-billing-portal-session');

      if (error) {
        throw new Error(error.message);
      }

      const { url } = data as { url: string };
      if (url) {
        stripe.redirectToCheckout({ sessionId: url });
      } else {
        throw new Error('No URL returned from Stripe');
      }
    } catch (error: any) {
      toast.error('Failed to update payment method', error.message);
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  // Render subscription details card with current plan information
  return (
    <Tabs defaultValue="plan" className="w-full">
      <TabsList className="w-full justify-center">
        <TabsTrigger value="plan">Subscription Plan</TabsTrigger>
        <TabsTrigger value="billing">Billing History</TabsTrigger>
      </TabsList>
      <TabsContent value="plan" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Current Subscription</CardTitle>
            <CardDescription>
              {subscription.tier === SubscriptionTier.FREE
                ? 'You are currently on the free plan.'
                : `You are subscribed to the ${subscription.tier} plan.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>
                Status: <Badge variant={subscription.status === SubscriptionStatus.ACTIVE ? 'success' : 'outline'}>{subscription.status}</Badge>
              </p>
              {subscription.renewsAt && (
                <p>Renews on: {formatDate(subscription.renewsAt)}</p>
              )}
              <p>Amount: {formatCurrency(subscription.amount / 100, subscription.currency)}</p>
              {subscription.paymentMethod && (
                <p>
                  Payment Method: {subscription.paymentMethod.brand} ending in {subscription.paymentMethod.last4}
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter className="justify-between">
            <Button variant="outline" onClick={handleUpdatePaymentMethod} disabled={isUpdatingPayment}>
              <CreditCardIcon className="mr-2 h-4 w-4" />
              Update Payment Method
            </Button>
            {subscription.tier !== SubscriptionTier.FREE && (
              <Button variant="destructive" onClick={handleCancel} disabled={isCanceling}>
                Cancel Subscription
              </Button>
            )}
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Available Plans</CardTitle>
            <CardDescription>
              Upgrade or downgrade your subscription to access more features.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {Object.values(SUBSCRIPTION_TIERS).map((tier) => (
              tier !== SubscriptionTier.FREE && (
                <PlanCard
                  key={tier}
                  tier={tier}
                  price={9.99} // Replace with actual prices
                  features={['Feature 1', 'Feature 2', 'Feature 3']} // Replace with actual features
                  currentTier={subscription.tier}
                  onSelect={
                    subscription.tier === tier
                      ? undefined
                      : tier > subscription.tier
                      ? handleUpgrade
                      : handleDowngrade
                  }
                />
              )
            ))}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="billing" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Billing History</CardTitle>
            <CardDescription>View your past transactions and download invoices.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Invoice</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billingHistory.length > 0 ? (
                  billingHistory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{formatDate(item.date, 'MMM d, yyyy')}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>{formatCurrency(item.amount / 100, item.currency)}</TableCell>
                      <TableCell>{item.status}</TableCell>
                      <TableCell className="text-right">
                        {item.invoiceUrl ? (
                          <a href={item.invoiceUrl} target="_blank" rel="noopener noreferrer" className="underline">
                            Download
                          </a>
                        ) : (
                          'N/A'
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      No billing history available.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

interface PlanCardProps {
  tier: SubscriptionTier;
  price: number;
  features: string[];
  currentTier: SubscriptionTier;
  onSelect?: (priceId: string) => void;
}

/**
 * Card component for displaying a subscription plan with its features
 * @param {object} { tier, price, features, currentTier, onSelect }
 * @returns {JSX.Element} Rendered plan card
 */
const PlanCard: React.FC<PlanCardProps> = ({ tier, price, features, currentTier, onSelect }) => {
  const isCurrent = tier === currentTier;
  const isBetter = tier > currentTier;

  return (
    <Card className={cn(isCurrent ? 'border-2 border-primary' : 'border-gray-200')}>
      <CardHeader>
        <CardTitle>{tier}</CardTitle>
        <CardDescription>
          {formatCurrency(price)} / month
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <ul>
          {features.map((feature) => (
            <li key={feature} className="flex items-center gap-2">
              {FEATURE_FLAGS.ENABLE_AI_SUGGESTIONS ? <CheckCircle className="h-4 w-4 text-green-500" /> : null}
              {feature}
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        {onSelect ? (
          <Button onClick={() => onSelect('price_123')} disabled={isCurrent}>
            {isCurrent ? 'Current Plan' : isBetter ? 'Upgrade' : 'Downgrade'}
          </Button>
        ) : (
          <Button variant="secondary" disabled>
            Current Plan
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

interface BillingDetailsProps {
  subscription: SubscriptionDetails;
}

/**
 * Component for displaying billing details and payment methods
 * @param {object} { subscription }
 * @returns {JSX.Element} Rendered billing details
 */
const BillingDetails: React.FC<BillingDetailsProps> = ({ subscription }) => {
  return (
    <div>
      {/* Implement billing details display here */}
    </div>
  );
};

/**
 * Main page component that fetches data and renders the subscription management interface
 * @returns {Promise<JSX.Element>} Rendered subscription page with data
 */
const SubscriptionPage: React.FC = async () => {
  // Fetch initial subscription data from server
  const subscription = await getSubscriptionDetails();

  // Fetch billing history data from server
  const billingHistory = await getBillingHistory();

  // Render PageHeader with appropriate title and description
  return (
    <div>
      <PageHeader
        title="Subscription"
        description="Manage your subscription plan, billing details, and payment methods."
      />
      <SubscriptionPageClient subscription={subscription} billingHistory={billingHistory} />
    </div>
  );
};

export const metadata = {
  title: 'Subscription - Engagerr',
  description: 'Manage your subscription plan and billing details.',
};

export default SubscriptionPage;