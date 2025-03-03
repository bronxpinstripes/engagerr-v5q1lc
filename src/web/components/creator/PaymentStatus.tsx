import React, { useMemo } from 'react'; // version: ^18.0.0
import { DollarSign, Clock, CheckCircle2, AlertTriangle } from 'lucide-react'; // version: ^0.279.0
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { formatCurrency, formatDate, formatRelativeTime } from '../../lib/formatters';
import { cn } from '../../lib/utils';
import { Payment, PaymentStatus } from '../../types/partnership';
import { usePartnerships } from '../../hooks/usePartnerships';

/**
 * Interface defining the props for the PaymentStatus component
 */
interface PaymentStatusProps {
  payments: Payment[];
  className?: string;
}

/**
 * Helper function that returns the appropriate badge variant and label based on payment status
 * @param status PaymentStatus
 * @returns {{variant: string, label: string}}
 */
const getStatusBadge = (status: PaymentStatus) => {
  const statusMap = {
    [PaymentStatus.PENDING]: { variant: 'secondary', label: 'Pending' },
    [PaymentStatus.PROCESSING]: { variant: 'secondary', label: 'Processing' },
    [PaymentStatus.HELD_IN_ESCROW]: { variant: 'warning', label: 'Held in Escrow' },
    [PaymentStatus.RELEASED]: { variant: 'success', label: 'Released' },
    [PaymentStatus.COMPLETED]: { variant: 'success', label: 'Completed' },
    [PaymentStatus.REFUNDED]: { variant: 'destructive', label: 'Refunded' },
    [PaymentStatus.FAILED]: { variant: 'destructive', label: 'Failed' },
    [PaymentStatus.DISPUTED]: { variant: 'destructive', label: 'Disputed' },
  };

  return statusMap[status] || { variant: 'default', label: 'Unknown' };
};

/**
 * Component that displays payment information and status for a partnership
 * @param props PaymentStatusProps
 * @returns {JSX.Element} Rendered payment status component
 */
const PaymentStatus: React.FC<PaymentStatusProps> = ({ payments, className }) => {
  // Access partnership functions
  const { releasePayment } = usePartnerships();

  // Handle empty payments array
  if (!payments || payments.length === 0) {
    return (
      <Card className={cn('shadow-none border-dashed', className)}>
        <CardHeader>
          <CardTitle>No Payments Yet</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No payment information available for this partnership.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group payments by status
  const groupedPayments = useMemo(() => {
    return payments.reduce((acc: { [key: string]: Payment[] }, payment: Payment) => {
      const status = payment.status;
      if (!acc[status]) {
        acc[status] = [];
      }
      acc[status].push(payment);
      return acc;
    }, {});
  }, [payments]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Payment Status</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {Object.entries(groupedPayments).map(([status, payments]) => (
          <div key={status}>
            <h4 className="mb-2 font-semibold capitalize">{status.replace(/_/g, ' ')} Payments</h4>
            <ul className="space-y-2">
              {payments.map((payment) => {
                const { label, variant } = getStatusBadge(payment.status);
                const isReleased = payment.status === PaymentStatus.RELEASED || payment.status === PaymentStatus.COMPLETED;
                const isPending = payment.status === PaymentStatus.HELD_IN_ESCROW;

                return (
                  <li key={payment.id} className="border rounded-md p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-gray-500" />
                        <span>{payment.description}</span>
                      </div>
                      <Badge variant={variant}>{label}</Badge>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                      <span>Amount: {formatCurrency(payment.amount)}</span>
                      <span>
                        {payment.processedAt && (
                          <>
                            Processed: {formatDate(payment.processedAt)} ({formatRelativeTime(payment.processedAt)})
                          </>
                        )}
                      </span>
                    </div>
                    {isPending && (
                      <div className="mt-2 flex justify-end">
                        <Button size="sm" onClick={() => releasePayment({ paymentId: payment.id, note: 'Payment released by creator' })}>
                          Release Payment
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default PaymentStatus;