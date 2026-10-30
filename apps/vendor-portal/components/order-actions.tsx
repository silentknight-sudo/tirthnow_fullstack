'use client';

import { useState } from 'react';
import { errorMessage } from '../lib/api';
import { type Order, type OrderAction, availableActions, useOrderAction } from '../lib/orders';
import { Button, ErrorBox, Field, Modal, Textarea } from './ui';

const LABEL: Record<OrderAction, string> = {
  accept: 'Accept',
  start: 'Start service',
  complete: 'Mark completed',
  reject: 'Reject',
  cancel: 'Cancel booking',
};

/** Buttons for the next legal steps; reject/cancel ask for a reason (guest is refunded). */
export function OrderActions({
  order,
  vid,
  disabled,
}: {
  order: Order;
  vid: string;
  disabled?: boolean;
}) {
  const mutation = useOrderAction(vid);
  const [asking, setAsking] = useState<OrderAction | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const actions = availableActions(order);
  if (actions.length === 0 || disabled) return null;

  const run = async (action: OrderAction, why?: string) => {
    setError(null);
    try {
      await mutation.mutateAsync({ id: order.id, action, ...(why ? { reason: why } : {}) });
      setAsking(null);
      setReason('');
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map((a) => (
        <Button
          key={a}
          variant={
            a === 'reject' || a === 'cancel' ? 'secondary' : a === 'accept' ? 'accent' : 'primary'
          }
          loading={mutation.isPending && mutation.variables.action === a}
          onClick={() => {
            if (a === 'reject' || a === 'cancel') setAsking(a);
            else void run(a);
          }}
        >
          {LABEL[a]}
        </Button>
      ))}
      {!asking && <ErrorBox message={error} />}
      <Modal
        open={asking !== null}
        title={asking ? LABEL[asking] : ''}
        onClose={() => {
          setAsking(null);
        }}
      >
        <p className="mb-3 text-sm text-muted">
          The guest is told why and refunded according to the cancellation policy.
        </p>
        <Field label="Reason">
          <Textarea
            rows={3}
            value={reason}
            maxLength={500}
            onChange={(e) => {
              setReason(e.target.value);
            }}
          />
        </Field>
        <div className="mt-3">
          <ErrorBox message={error} />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              setAsking(null);
            }}
          >
            Back
          </Button>
          <Button
            variant="danger"
            disabled={reason.trim().length < 3}
            loading={mutation.isPending}
            onClick={() => asking && void run(asking, reason.trim())}
          >
            {asking ? LABEL[asking] : ''}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
