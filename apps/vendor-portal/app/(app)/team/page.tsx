'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Badge,
  Button,
  Card,
  Empty,
  ErrorBox,
  Field,
  Input,
  Modal,
  PageHeader,
  Spinner,
  Table,
} from '../../../components/ui';
import { api, errorMessage, must } from '../../../lib/api';
import { type Permission, useVendor } from '../../../lib/session';

const PERMS: { key: Permission; label: string }[] = [
  { key: 'orders.manage', label: 'Bookings' },
  { key: 'listings.edit', label: 'Listings' },
  { key: 'inventory.edit', label: 'Prices & availability' },
  { key: 'reviews.reply', label: 'Reply to reviews' },
  { key: 'finance.view', label: 'Payouts' },
];

const schema = z.object({
  contact: z
    .string()
    .trim()
    .refine((v) => /^\S+@\S+\.\S+$/.test(v) || /^[6-9]\d{9}$/.test(v), 'Email or 10-digit mobile'),
  permissions: z.array(z.string()).min(1, 'Pick at least one'),
});

export default function TeamPage() {
  const { vid, vendor } = useVendor();
  const qc = useQueryClient();
  const isOwner = vendor.myRole === 'owner';
  const staff = useQuery({
    queryKey: ['staff', vid],
    enabled: isOwner,
    queryFn: async () =>
      must(await api.GET('/v1/vendors/{vid}/staff', { params: { path: { vid } } })),
  });
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { contact: '', permissions: ['orders.manage'] },
  });
  const { errors, isSubmitting } = form.formState;

  const onInvite = form.handleSubmit(async ({ contact, permissions }) => {
    setError(null);
    const isEmail = contact.includes('@');
    try {
      await api.POST('/v1/vendors/{vid}/staff', {
        params: { path: { vid } },
        body: {
          permissions: permissions as Permission[],
          ...(isEmail ? { email: contact } : { phoneE164: `+91${contact}` }),
        },
      });
      await qc.invalidateQueries({ queryKey: ['staff', vid] });
      form.reset();
      setOpen(false);
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  const remove = async (staffId: string, name: string) => {
    if (!window.confirm(`Remove ${name} from your team?`)) return;
    await api.DELETE('/v1/vendors/{vid}/staff/{staffId}', { params: { path: { vid, staffId } } });
    await qc.invalidateQueries({ queryKey: ['staff', vid] });
  };

  if (!isOwner) return <Card>Only the business owner can manage the team.</Card>;
  return (
    <>
      <PageHeader
        title="Team"
        subtitle="Give managers and front-desk staff access to just what they need."
        actions={
          <Button
            variant="secondary"
            onClick={() => {
              setOpen(true);
            }}
          >
            <UserPlus className="h-4 w-4" /> Add member
          </Button>
        }
      />
      {staff.isLoading ? (
        <Spinner />
      ) : (staff.data ?? []).length === 0 ? (
        <Empty title="Just you for now">
          Members need a Tirth Now account (app or portal) with that email or phone.
        </Empty>
      ) : (
        <Table head={['Member', 'Access', 'Status', '']}>
          {(staff.data ?? []).map((s) => (
            <tr key={s.id}>
              <td className="px-4 py-3 font-semibold">{s.displayName ?? '—'}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {s.permissions.map((p) => (
                    <Badge key={p} tone="blue">
                      {PERMS.find((x) => x.key === p)?.label ?? p}
                    </Badge>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3">
                {s.isActive ? <Badge tone="green">Active</Badge> : <Badge>Removed</Badge>}
              </td>
              <td className="px-4 py-3">
                {s.isActive && (
                  <button
                    aria-label={`Remove ${s.displayName}`}
                    onClick={() => void remove(s.id, s.displayName ?? 'this member')}
                  >
                    <Trash2 className="h-4 w-4 text-sos" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}
      <Modal
        open={open}
        title="Add team member"
        onClose={() => {
          setOpen(false);
        }}
      >
        <form onSubmit={onInvite} className="space-y-4" noValidate>
          <Field label="Email or mobile number" error={errors.contact?.message}>
            <Input {...form.register('contact')} />
          </Field>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Access</legend>
            <div className="space-y-1 text-sm">
              {PERMS.map((p) => (
                <label key={p.key} className="flex items-center gap-2">
                  <input type="checkbox" value={p.key} {...form.register('permissions')} />{' '}
                  {p.label}
                </label>
              ))}
            </div>
            {errors.permissions && (
              <p className="mt-1 text-xs text-sos">{errors.permissions.message}</p>
            )}
          </fieldset>
          <ErrorBox message={error} />
          <Button type="submit" loading={isSubmitting}>
            Add member
          </Button>
        </form>
      </Modal>
    </>
  );
}
