import { Inject, Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { formatPaise } from '@tirth-now/shared-types';
import { APP_CONFIG, type AppConfig } from '../../../core/config';
import { PrismaService } from '../../../core/prisma';
import { VendorsFacade } from '../../vendors';

interface StatementLine {
  orderCode: string;
  date: string;
  grossPaise: number;
  commissionPaise: number;
  gstPaise: number;
  netPaise: number;
}

/** Monthly commission statement (PDF) for a vendor, built from the ledger. */
@Injectable()
export class StatementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vendors: VendorsFacade,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async lines(vendorId: string, month: string): Promise<StatementLine[]> {
    const start = new Date(`${month}-01T00:00:00+05:30`);
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);
    const entries = await this.prisma.ledgerEntry.findMany({
      where: {
        vendorId,
        createdAt: { gte: start, lt: end },
        orderId: { not: null },
        memo: { startsWith: 'sale' },
      },
      orderBy: { createdAt: 'asc' },
    });
    const byTxn = new Map<string, StatementLine>();
    for (const e of entries) {
      const line = byTxn.get(e.txnId) ?? {
        orderCode: e.memo?.split(':')[1] ?? (e.orderId ?? '').slice(0, 8),
        date: e.createdAt.toISOString().slice(0, 10),
        grossPaise: 0,
        commissionPaise: 0,
        gstPaise: 0,
        netPaise: 0,
      };
      const credit = Number(e.creditPaise);
      if (e.account === 'platform_clearing') line.grossPaise += Number(e.debitPaise);
      if (e.account === 'platform_revenue') line.commissionPaise += credit;
      if (e.account === 'gst_payable') line.gstPaise += credit;
      if (e.account === 'vendor_pending') line.netPaise += credit;
      byTxn.set(e.txnId, line);
    }
    return [...byTxn.values()];
  }

  async pdf(vendorId: string, month: string): Promise<Buffer> {
    const vendor = await this.vendors.get(vendorId);
    const lines = await this.lines(vendorId, month);
    const doc = new PDFDocument({
      size: 'A4',
      margin: 48,
      info: { Title: `Tirth Now statement ${month}` },
    });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    const done = new Promise<Buffer>((resolve) =>
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      }),
    );

    doc.fontSize(18).text('Tirth Now — Commission statement');
    doc
      .moveDown(0.3)
      .fontSize(10)
      .fillColor('#555')
      .text(
        `Vendor: ${vendor?.legalName ?? vendorId}${vendor?.gstin ? `  ·  GSTIN ${vendor.gstin}` : ''}`,
      );
    doc.text(
      `Period: ${month}  ·  GST on commission: ${this.config.payments.gstOnCommissionBps / 100}%`,
    );
    doc.moveDown().fillColor('#000');

    const cols = [48, 150, 230, 320, 400, 480];
    const row = (cells: string[], bold = false) => {
      const y = doc.y;
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
      cells.forEach((c, i) =>
        doc.text(c, cols[i], y, { width: (cols[i + 1] ?? 560) - (cols[i] ?? 0) - 6 }),
      );
      doc.moveDown(0.4);
    };
    row(['Order', 'Date', 'Gross', 'Commission', 'GST', 'Net to you'], true);
    const sum = { gross: 0, comm: 0, gst: 0, net: 0 };
    for (const l of lines) {
      row([
        l.orderCode,
        l.date,
        formatPaise(l.grossPaise),
        formatPaise(l.commissionPaise),
        formatPaise(l.gstPaise),
        formatPaise(l.netPaise),
      ]);
      sum.gross += l.grossPaise;
      sum.comm += l.commissionPaise;
      sum.gst += l.gstPaise;
      sum.net += l.netPaise;
    }
    doc.moveDown(0.3);
    row(
      [
        'Total',
        '',
        formatPaise(sum.gross),
        formatPaise(sum.comm),
        formatPaise(sum.gst),
        formatPaise(sum.net),
      ],
      true,
    );
    if (lines.length === 0) doc.moveDown().text('No bookings in this period.');
    doc
      .moveDown(2)
      .fontSize(8)
      .fillColor('#777')
      .text('Refunds and payouts are shown in the earnings dashboard. Amounts in INR.');
    doc.end();
    return done;
  }
}
