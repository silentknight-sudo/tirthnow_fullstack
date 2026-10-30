'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FileCheck2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Badge,
  Button,
  Card,
  ErrorBox,
  Field,
  Input,
  PageHeader,
  Select,
} from '../../../components/ui';
import { api, errorMessage, uploadFile } from '../../../lib/api';
import { useBankAccounts } from '../../../lib/finance';
import { titleCase } from '../../../lib/format';
import { useCities } from '../../../lib/queries';
import { type Vendor, useVendor } from '../../../lib/session';
import { vendorStatusLabel, vendorTone } from '../../../lib/status';
import { GSTIN, IFSC, PAN } from '../../../lib/validation';

type DocType = Vendor['kycDocuments'][number]['docType'];
const DOC_TYPES: DocType[] = [
  'pan',
  'gst',
  'aadhaar',
  'fssai',
  'trade_license',
  'rc',
  'permit',
  'other',
];
const DOC_LABEL: Record<DocType, string> = {
  pan: 'PAN card',
  gst: 'GST certificate',
  aadhaar: 'Owner Aadhaar',
  fssai: 'FSSAI licence',
  trade_license: 'Trade licence',
  rc: 'Vehicle RC',
  permit: 'Tourist permit',
  other: 'Other document',
};
const docTone = { pending: 'orange', approved: 'green', rejected: 'red' } as const;

function useRefreshVendor() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['vendors', 'me'] });
}

const detailsSchema = z.object({
  displayName: z.string().trim().min(2).max(120),
  legalName: z.string().trim().min(2).max(200),
  cityId: z.string().uuid('Choose a city'),
  pan: z.string().trim().toUpperCase().regex(PAN, 'PAN looks like ABCDE1234F').or(z.literal('')),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(GSTIN, 'Enter a valid 15-character GSTIN')
    .or(z.literal('')),
});

function DetailsCard({ vendor, editable }: { vendor: Vendor; editable: boolean }) {
  const cities = useCities();
  const refresh = useRefreshVendor();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof detailsSchema>>({
    resolver: zodResolver(detailsSchema),
    defaultValues: {
      displayName: vendor.displayName,
      legalName: vendor.legalName,
      cityId: vendor.cityId ?? '',
      pan: vendor.pan ?? '',
      gstin: vendor.gstin ?? '',
    },
  });
  const { errors, isSubmitting } = form.formState;
  const onSubmit = form.handleSubmit(async (v) => {
    setError(null);
    setSaved(false);
    try {
      await api.PATCH('/v1/vendors/{vid}', {
        params: { path: { vid: vendor.id } },
        body: {
          displayName: v.displayName,
          ...(editable
            ? {
                legalName: v.legalName,
                cityId: v.cityId,
                ...(v.pan ? { pan: v.pan } : {}),
                ...(v.gstin ? { gstin: v.gstin } : {}),
              }
            : {}),
        },
      });
      await refresh();
      setSaved(true);
    } catch (e) {
      setError(errorMessage(e));
    }
  });
  return (
    <Card>
      <h2 className="mb-1 text-lg font-bold text-navy">Business details</h2>
      {!editable && (
        <p className="mb-3 text-sm text-muted">
          Legal details are locked after approval. Contact support to change them.
        </p>
      )}
      <form onSubmit={onSubmit} className="mt-3 grid gap-4 sm:grid-cols-2" noValidate>
        <Field label="Display name" error={errors.displayName?.message}>
          <Input {...form.register('displayName')} />
        </Field>
        <Field label="Registered name" error={errors.legalName?.message}>
          <Input disabled={!editable} {...form.register('legalName')} />
        </Field>
        <Field label="City" error={errors.cityId?.message}>
          <Select disabled={!editable} {...form.register('cityId')}>
            <option value="">Choose…</option>
            {(cities.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="PAN" error={errors.pan?.message}>
          <Input className="uppercase" disabled={!editable} {...form.register('pan')} />
        </Field>
        <Field label="GSTIN" error={errors.gstin?.message}>
          <Input className="uppercase" disabled={!editable} {...form.register('gstin')} />
        </Field>
        <div className="flex items-end gap-3 sm:col-span-2">
          <Button type="submit" loading={isSubmitting}>
            Save
          </Button>
          {saved && <span className="text-sm text-ok">Saved</span>}
        </div>
        <div className="sm:col-span-2">
          <ErrorBox message={error} />
        </div>
      </form>
    </Card>
  );
}

function KycCard({ vendor, editable }: { vendor: Vendor; editable: boolean }) {
  const refresh = useRefreshVendor();
  const fileRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState<DocType>(
    (vendor.missingDocuments[0] as DocType | undefined) ?? 'pan',
  );
  const [error, setError] = useState<string | null>(null);
  const upload = useMutation({
    mutationFn: async (file: File) => {
      if (file.size > 10 * 1024 * 1024) throw new Error('Files must be 10 MB or smaller');
      const mediaId = await uploadFile(file, 'kyc_document');
      await api.POST('/v1/vendors/{vid}/kyc-documents', {
        params: { path: { vid: vendor.id } },
        body: { docType, mediaId },
      });
    },
    onSuccess: () => refresh(),
    onError: (e) => {
      setError(errorMessage(e));
    },
  });
  const remove = useMutation({
    mutationFn: (docId: string) =>
      api.DELETE('/v1/vendors/{vid}/kyc-documents/{docId}', {
        params: { path: { vid: vendor.id, docId } },
      }),
    onSuccess: () => refresh(),
  });

  return (
    <Card>
      <span id="kyc" />
      <h2 className="text-lg font-bold text-navy">KYC documents</h2>
      <p className="mb-4 text-sm text-muted">
        PDF, JPG or PNG up to 10 MB.{' '}
        {vendor.missingDocuments.length > 0
          ? `Still needed: ${vendor.missingDocuments.map((d) => (d in DOC_LABEL ? DOC_LABEL[d as DocType] : titleCase(d))).join(', ')}.`
          : 'All required documents are uploaded.'}
      </p>
      <ul className="mb-4 divide-y divide-line rounded-xl border border-line">
        {vendor.kycDocuments.length === 0 && (
          <li className="px-4 py-3 text-sm text-muted">No documents yet.</li>
        )}
        {vendor.kycDocuments.map((d) => (
          <li
            key={d.id}
            className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
          >
            <span className="flex items-center gap-2">
              <FileCheck2 className="h-4 w-4 text-navy" aria-hidden />
              {DOC_LABEL[d.docType]}
              {d.url && (
                <a href={d.url} target="_blank" rel="noreferrer" className="text-navy underline">
                  view
                </a>
              )}
            </span>
            <span className="flex items-center gap-2">
              <Badge tone={docTone[d.status]}>{titleCase(d.status)}</Badge>
              {d.reviewerNote && <span className="text-xs text-sos">{d.reviewerNote}</span>}
              {editable && d.status !== 'approved' && (
                <button
                  className="text-xs text-sos hover:underline"
                  onClick={() => {
                    remove.mutate(d.id);
                  }}
                >
                  Remove
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>
      {editable && (
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Document type">
            <Select
              value={docType}
              onChange={(e) => {
                setDocType(e.target.value as DocType);
              }}
            >
              {DOC_TYPES.map((t) => (
                <option key={t} value={t}>
                  {DOC_LABEL[t]}
                </option>
              ))}
            </Select>
          </Field>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            className="hidden"
            aria-label="Choose document"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setError(null);
              if (f) upload.mutate(f);
              e.target.value = '';
            }}
          />
          <Button
            variant="secondary"
            loading={upload.isPending}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-4 w-4" /> Upload
          </Button>
        </div>
      )}
      <div className="mt-3">
        <ErrorBox message={error} />
      </div>
    </Card>
  );
}

const bankSchema = z.object({
  accountHolder: z.string().trim().min(2, 'Enter the account holder name').max(120),
  accountNumber: z
    .string()
    .trim()
    .regex(/^\d{9,18}$/, 'Account number is 9–18 digits'),
  ifsc: z.string().trim().toUpperCase().regex(IFSC, 'IFSC looks like SBIN0001234'),
});

function BankCard({ vid }: { vid: string }) {
  const qc = useQueryClient();
  const accounts = useBankAccounts(vid);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof bankSchema>>({ resolver: zodResolver(bankSchema) });
  const { errors, isSubmitting } = form.formState;
  const onSubmit = form.handleSubmit(async (body) => {
    setError(null);
    try {
      await api.POST('/v1/vendors/{vid}/bank-accounts', { params: { path: { vid } }, body });
      form.reset();
      await qc.invalidateQueries({ queryKey: ['bank', vid] });
    } catch (e) {
      setError(errorMessage(e));
    }
  });
  const makePrimary = async (accountId: string) => {
    await api.POST('/v1/vendors/{vid}/bank-accounts/{accountId}/primary', {
      params: { path: { vid, accountId } },
    });
    await qc.invalidateQueries({ queryKey: ['bank', vid] });
  };
  return (
    <Card>
      <span id="bank" />
      <h2 className="mb-3 text-lg font-bold text-navy">Bank account for payouts</h2>
      <ul className="mb-4 space-y-2 text-sm">
        {(accounts.data ?? []).map((a) => (
          <li
            key={a.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-4 py-3"
          >
            <span>
              <b>{a.accountHolder}</b> · ••••{a.accountLast4} · {a.ifsc}
            </span>
            <span className="flex items-center gap-2">
              {a.isVerified ? (
                <Badge tone="green">Verified</Badge>
              ) : (
                <Badge tone="orange">Not verified</Badge>
              )}
              {a.isPrimary ? (
                <Badge tone="blue">Primary</Badge>
              ) : (
                <button
                  className="text-xs text-navy hover:underline"
                  onClick={() => void makePrimary(a.id)}
                >
                  Make primary
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>
      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-3" noValidate>
        <Field label="Account holder" error={errors.accountHolder?.message}>
          <Input {...form.register('accountHolder')} />
        </Field>
        <Field label="Account number" error={errors.accountNumber?.message}>
          <Input inputMode="numeric" autoComplete="off" {...form.register('accountNumber')} />
        </Field>
        <Field label="IFSC" error={errors.ifsc?.message}>
          <Input className="uppercase" {...form.register('ifsc')} />
        </Field>
        <div className="sm:col-span-3">
          <ErrorBox message={error} />
          <Button type="submit" variant="secondary" className="mt-2" loading={isSubmitting}>
            Add bank account
          </Button>
        </div>
      </form>
    </Card>
  );
}

function SubmitCard({ vendor }: { vendor: Vendor }) {
  const refresh = useRefreshVendor();
  const [error, setError] = useState<string | null>(null);
  const submit = useMutation({
    mutationFn: () =>
      api.POST('/v1/vendors/{vid}/submit', { params: { path: { vid: vendor.id } } }),
    onSuccess: () => refresh(),
    onError: (e) => {
      setError(errorMessage(e));
    },
  });
  return (
    <Card className="bg-[#FFF7EE]">
      <span id="submit" />
      <h2 className="text-lg font-bold text-navy">Submit for review</h2>
      <p className="mb-3 text-sm text-muted">
        We check your documents and usually approve within 2 working days. You'll get an email.
      </p>
      <ErrorBox message={error} />
      <Button
        variant="accent"
        className="mt-2"
        loading={submit.isPending}
        disabled={vendor.missingDocuments.length > 0 || !vendor.pan}
        onClick={() => {
          setError(null);
          submit.mutate();
        }}
      >
        Submit for review
      </Button>
    </Card>
  );
}

export default function SettingsPage() {
  const { vendor, vid } = useVendor();
  const isOwner = vendor.myRole === 'owner';
  const editable = vendor.status === 'draft' || vendor.status === 'kyc_rejected';
  return (
    <>
      <PageHeader
        title="Business & KYC"
        subtitle="Your business details, verification documents and payout account."
        actions={
          <Badge tone={vendorTone[vendor.status] ?? 'gray'}>
            {vendorStatusLabel[vendor.status]}
          </Badge>
        }
      />
      {!isOwner ? (
        <Card>Only the business owner can change these settings.</Card>
      ) : (
        <div className="space-y-5">
          <DetailsCard vendor={vendor} editable={editable} />
          <KycCard vendor={vendor} editable={editable} />
          <BankCard vid={vid} />
          {editable && <SubmitCard vendor={vendor} />}
        </div>
      )}
    </>
  );
}
