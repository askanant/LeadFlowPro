import PDFDocument from 'pdfkit';
import { prisma } from '../../shared/database/prisma';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReportFilters {
  campaignId?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dateRange(filters: ReportFilters) {
  const from = filters.dateFrom ? new Date(filters.dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const to = filters.dateTo ? new Date(filters.dateTo) : new Date();
  return { from, to };
}

function drawHeader(doc: PDFKit.PDFDocument, title: string, subtitle: string) {
  doc.fontSize(22).fillColor('#1e293b').text(title, 50, 50);
  doc.fontSize(10).fillColor('#64748b').text(subtitle, 50, 78);
  doc.moveTo(50, 100).lineTo(545, 100).stroke('#e2e8f0');
  doc.moveDown(2);
}

function drawSectionTitle(doc: PDFKit.PDFDocument, title: string) {
  const y = doc.y;
  doc.fontSize(13).fillColor('#1e293b').text(title, 50, y);
  doc.moveDown(0.5);
}

function drawKpiRow(doc: PDFKit.PDFDocument, items: { label: string; value: string }[]) {
  const y = doc.y;
  const colWidth = 495 / items.length;
  items.forEach((item, i) => {
    const x = 50 + i * colWidth;
    doc.fontSize(9).fillColor('#64748b').text(item.label, x, y, { width: colWidth });
    doc.fontSize(16).fillColor('#1e293b').text(item.value, x, y + 14, { width: colWidth });
  });
  doc.y = y + 45;
}

function drawTable(
  doc: PDFKit.PDFDocument,
  headers: string[],
  rows: string[][],
  colWidths: number[],
) {
  const startX = 50;
  let y = doc.y;

  // Header row
  doc.fontSize(8).fillColor('#64748b');
  headers.forEach((h, i) => {
    const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
    doc.text(h, x, y, { width: colWidths[i]! });
  });
  y += 16;
  doc.moveTo(startX, y).lineTo(startX + colWidths.reduce((a, b) => a + b, 0), y).stroke('#e2e8f0');
  y += 6;

  // Data rows
  doc.fontSize(8).fillColor('#334155');
  for (const row of rows) {
    if (y > 720) {
      doc.addPage();
      y = 50;
    }
    row.forEach((cell, i) => {
      const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
      doc.text(cell, x, y, { width: colWidths[i]! });
    });
    y += 16;
  }
  doc.y = y + 10;
}

function drawFooter(doc: PDFKit.PDFDocument) {
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc.fontSize(7).fillColor('#94a3b8')
      .text(
        `LeadFlow Pro Report • Generated ${new Date().toLocaleString()} • Page ${i + 1} of ${pages.count}`,
        50, 770, { align: 'center', width: 495 },
      );
  }
}

// ─── Report Generators ────────────────────────────────────────────────────────

async function generateCampaignPerformancePDF(tenantId: string, filters: ReportFilters): Promise<Buffer> {
  const { from, to } = dateRange(filters);

  const whereClause: any = { tenantId };
  if (filters.campaignId) whereClause.id = filters.campaignId;
  if (filters.status) whereClause.status = filters.status;

  const campaigns = await prisma.campaign.findMany({
    where: whereClause,
    include: { _count: { select: { leads: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const totalLeads = await prisma.lead.count({
    where: { tenantId, receivedAt: { gte: from, lte: to } },
  });

  const qualifiedLeads = await prisma.lead.count({
    where: { tenantId, status: 'qualified', receivedAt: { gte: from, lte: to } },
  });

  const totalSpend = campaigns.reduce((sum, c) => sum + (Number(c.dailyBudget ?? 0) * 30), 0);
  const avgCpl = totalLeads > 0 ? totalSpend / totalLeads : 0;
  const convRate = totalLeads > 0 ? ((qualifiedLeads / totalLeads) * 100).toFixed(1) : '0';

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', bufferPages: true, margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    drawHeader(doc, 'Campaign Performance Report', `${from.toLocaleDateString()} – ${to.toLocaleDateString()} • Tenant: ${tenantId.substring(0, 8)}…`);

    // KPIs
    drawSectionTitle(doc, 'Key Metrics');
    drawKpiRow(doc, [
      { label: 'Total Campaigns', value: String(campaigns.length) },
      { label: 'Total Leads', value: String(totalLeads) },
      { label: 'Total Spend (est.)', value: `$${totalSpend.toFixed(0)}` },
      { label: 'Avg CPL', value: `$${avgCpl.toFixed(2)}` },
    ]);
    drawKpiRow(doc, [
      { label: 'Qualified Leads', value: String(qualifiedLeads) },
      { label: 'Conversion Rate', value: `${convRate}%` },
      { label: 'Active Campaigns', value: String(campaigns.filter(c => c.status === 'active').length) },
      { label: 'Platforms', value: String(new Set(campaigns.map(c => c.platform)).size) },
    ]);

    // Campaign table
    drawSectionTitle(doc, 'Campaign Breakdown');
    drawTable(
      doc,
      ['Campaign', 'Platform', 'Status', 'Budget/mo', 'Leads', 'CPL'],
      campaigns.map(c => [
        c.name.substring(0, 25),
        c.platform,
        c.status ?? '—',
        `$${(Number(c.dailyBudget ?? 0) * 30).toFixed(0)}`,
        String(c._count.leads),
        c._count.leads > 0 ? `$${((Number(c.dailyBudget ?? 0) * 30) / c._count.leads).toFixed(2)}` : '—',
      ]),
      [140, 70, 60, 75, 60, 60],
    );

    drawFooter(doc);
    doc.end();
  });
}

async function generateLeadScoringPDF(tenantId: string, filters: ReportFilters): Promise<Buffer> {
  const { from, to } = dateRange(filters);

  const leads = await prisma.lead.findMany({
    where: {
      tenantId,
      receivedAt: { gte: from, lte: to },
      ...(filters.campaignId ? { campaignId: filters.campaignId } : {}),
    },
    select: {
      id: true, firstName: true, lastName: true, email: true, status: true,
      qualityScore: true, churnRisk: true, receivedAt: true,
      campaign: { select: { name: true } },
    },
    orderBy: { qualityScore: { sort: 'desc', nulls: 'last' } },
    take: 100,
  });

  const scores = leads.map(l => l.qualityScore ?? 0);
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const excellent = scores.filter(s => s >= 80).length;
  const good = scores.filter(s => s >= 60 && s < 80).length;
  const fair = scores.filter(s => s >= 40 && s < 60).length;
  const poor = scores.filter(s => s < 40).length;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', bufferPages: true, margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    drawHeader(doc, 'Lead Scoring Summary', `${from.toLocaleDateString()} – ${to.toLocaleDateString()}`);

    drawSectionTitle(doc, 'Score Distribution');
    drawKpiRow(doc, [
      { label: 'Total Leads', value: String(leads.length) },
      { label: 'Avg Score', value: avgScore.toFixed(1) },
      { label: 'Excellent (80+)', value: String(excellent) },
      { label: 'Good (60-79)', value: String(good) },
    ]);
    drawKpiRow(doc, [
      { label: 'Fair (40-59)', value: String(fair) },
      { label: 'Poor (<40)', value: String(poor) },
      { label: 'Quality Rate', value: leads.length > 0 ? `${(((excellent + good) / leads.length) * 100).toFixed(0)}%` : '0%' },
      { label: '', value: '' },
    ]);

    drawSectionTitle(doc, 'Top Leads');
    drawTable(
      doc,
      ['Lead', 'Email', 'Campaign', 'Score', 'Status', 'Churn Risk'],
      leads.slice(0, 40).map(l => [
        (`${l.firstName ?? ''} ${l.lastName ?? ''}`.trim() || '—').substring(0, 20),
        (l.email ?? '—').substring(0, 22),
        (l.campaign?.name ?? '—').substring(0, 18),
        String(l.qualityScore ?? '—'),
        l.status ?? '—',
        l.churnRisk != null ? `${l.churnRisk.toFixed(0)}%` : '—',
      ]),
      [85, 95, 85, 45, 60, 55],
    );

    drawFooter(doc);
    doc.end();
  });
}

async function generateWorkflowSummaryPDF(tenantId: string, filters: ReportFilters): Promise<Buffer> {
  const { from, to } = dateRange(filters);

  const workflows = await prisma.workflow.findMany({
    where: { tenantId },
    include: {
      _count: { select: { executions: true } },
      executions: {
        where: { triggeredAt: { gte: from, lte: to } },
        select: { status: true, triggeredAt: true, completedAt: true },
        orderBy: { triggeredAt: 'desc' },
        take: 200,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const totalExecutions = workflows.reduce((sum, w) => sum + w.executions.length, 0);
  const completedExecutions = workflows.reduce((sum, w) => sum + w.executions.filter(e => e.status === 'completed').length, 0);
  const failedExecutions = workflows.reduce((sum, w) => sum + w.executions.filter(e => e.status === 'failed').length, 0);
  const successRate = totalExecutions > 0 ? ((completedExecutions / totalExecutions) * 100).toFixed(1) : '0';

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', bufferPages: true, margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    drawHeader(doc, 'Workflow Execution Summary', `${from.toLocaleDateString()} – ${to.toLocaleDateString()}`);

    drawSectionTitle(doc, 'Execution Overview');
    drawKpiRow(doc, [
      { label: 'Total Workflows', value: String(workflows.length) },
      { label: 'Total Executions', value: String(totalExecutions) },
      { label: 'Completed', value: String(completedExecutions) },
      { label: 'Failed', value: String(failedExecutions) },
    ]);
    drawKpiRow(doc, [
      { label: 'Success Rate', value: `${successRate}%` },
      { label: 'Active Workflows', value: String(workflows.filter(w => w.status === 'active').length) },
      { label: '', value: '' },
      { label: '', value: '' },
    ]);

    drawSectionTitle(doc, 'Workflow Breakdown');
    drawTable(
      doc,
      ['Workflow', 'Status', 'Executions', 'Completed', 'Failed', 'Success %'],
      workflows.map(w => {
        const completed = w.executions.filter(e => e.status === 'completed').length;
        const failed = w.executions.filter(e => e.status === 'failed').length;
        const total = w.executions.length;
        return [
          w.name.substring(0, 25),
          w.status === 'active' ? 'Active' : 'Inactive',
          String(total),
          String(completed),
          String(failed),
          total > 0 ? `${((completed / total) * 100).toFixed(0)}%` : '—',
        ];
      }),
      [120, 60, 70, 70, 60, 65],
    );

    drawFooter(doc);
    doc.end();
  });
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

async function generateLeadsCSV(tenantId: string, filters: ReportFilters): Promise<string> {
  const { from, to } = dateRange(filters);

  const leads = await prisma.lead.findMany({
    where: {
      tenantId,
      receivedAt: { gte: from, lte: to },
      ...(filters.campaignId ? { campaignId: filters.campaignId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    },
    include: { campaign: { select: { name: true } } },
    orderBy: { receivedAt: 'desc' },
    take: 5000,
  });

  const headers = ['Name', 'Email', 'Phone', 'Campaign', 'Status', 'Quality Score', 'Churn Risk', 'Received At'];
  const rows = leads.map(l => [
    csvEscape(`${l.firstName ?? ''} ${l.lastName ?? ''}`.trim()),
    csvEscape(l.email ?? ''),
    csvEscape(l.phone ?? ''),
    csvEscape(l.campaign?.name ?? ''),
    l.status ?? '',
    String(l.qualityScore ?? ''),
    l.churnRisk != null ? l.churnRisk.toFixed(1) : '',
    l.receivedAt?.toISOString() ?? '',
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ─── Growth Optimization Report ───────────────────────────────────────────────

async function generateGrowthOptimizationPDF(tenantId: string, filters: ReportFilters): Promise<Buffer> {
  const { from, to } = dateRange(filters);

  const campaigns = await prisma.campaign.findMany({
    where: { tenantId, status: { in: ['active', 'paused'] } },
    include: {
      leads: {
        where: { receivedAt: { gte: from, lte: to } },
        select: { status: true, qualityScore: true, platform: true },
      },
      campaignMetrics: {
        where: { date: { gte: from, lte: to } },
      },
    },
  });

  // Platform aggregation
  const platformMap: Record<string, { spend: number; leads: number; qualified: number; junk: number; converted: number }> = {};
  for (const c of campaigns) {
    const p = c.platform;
    if (!platformMap[p]) platformMap[p] = { spend: 0, leads: 0, qualified: 0, junk: 0, converted: 0 };
    platformMap[p].spend += c.campaignMetrics.reduce((s, m) => s + Number(m.spend ?? 0), 0);
    platformMap[p].leads += c.leads.length;
    platformMap[p].qualified += c.leads.filter(l => l.status === 'qualified').length;
    platformMap[p].junk += c.leads.filter(l => l.status === 'junk' || (l.qualityScore != null && l.qualityScore < 30)).length;
    platformMap[p].converted += c.leads.filter(l => l.status === 'converted').length;
  }

  const totalSpend = Object.values(platformMap).reduce((s, p) => s + p.spend, 0);
  const totalLeads = Object.values(platformMap).reduce((s, p) => s + p.leads, 0);
  const totalQualified = Object.values(platformMap).reduce((s, p) => s + p.qualified, 0);
  const totalJunk = Object.values(platformMap).reduce((s, p) => s + p.junk, 0);
  const totalConverted = Object.values(platformMap).reduce((s, p) => s + p.converted, 0);
  const junkRate = totalLeads > 0 ? ((totalJunk / totalLeads) * 100).toFixed(1) : '0';
  const convRate = totalLeads > 0 ? ((totalConverted / totalLeads) * 100).toFixed(1) : '0';
  const wastedSpend = Object.values(platformMap).reduce((s, p) => {
    return s + (p.leads > 0 ? (p.junk / p.leads) * p.spend : 0);
  }, 0);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', bufferPages: true, margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    drawHeader(doc, 'Growth Optimization Report', `${from.toLocaleDateString()} - ${to.toLocaleDateString()}`);

    // KPIs
    drawSectionTitle(doc, 'Overall Performance');
    drawKpiRow(doc, [
      { label: 'Total Spend', value: `$${totalSpend.toFixed(0)}` },
      { label: 'Total Leads', value: String(totalLeads) },
      { label: 'Conversion Rate', value: `${convRate}%` },
      { label: 'Avg CPL', value: totalLeads > 0 ? `$${(totalSpend / totalLeads).toFixed(2)}` : '$0' },
    ]);
    drawKpiRow(doc, [
      { label: 'Qualified Leads', value: String(totalQualified) },
      { label: 'Junk Rate', value: `${junkRate}%` },
      { label: 'Wasted Spend', value: `$${wastedSpend.toFixed(0)}` },
      { label: 'Converted Leads', value: String(totalConverted) },
    ]);

    // Platform breakdown
    drawSectionTitle(doc, 'Platform Breakdown');
    const platformRows = Object.entries(platformMap).map(([name, p]) => [
      name,
      `$${p.spend.toFixed(0)}`,
      String(p.leads),
      String(p.qualified),
      String(p.junk),
      p.leads > 0 ? `$${(p.spend / p.leads).toFixed(2)}` : '-',
      p.leads > 0 ? `${((p.junk / p.leads) * 100).toFixed(0)}%` : '0%',
    ]);
    drawTable(doc, ['Platform', 'Spend', 'Leads', 'Qualified', 'Junk', 'CPL', 'Junk %'], platformRows, [75, 65, 55, 65, 50, 65, 55]);

    // Campaign breakdown
    drawSectionTitle(doc, 'Campaign Performance');
    const campaignRows = campaigns.slice(0, 30).map(c => {
      const cLeads = c.leads.length;
      const cSpend = c.campaignMetrics.reduce((s, m) => s + Number(m.spend ?? 0), 0);
      const cJunk = c.leads.filter(l => l.status === 'junk' || (l.qualityScore != null && l.qualityScore < 30)).length;
      const cConverted = c.leads.filter(l => l.status === 'converted').length;
      return [
        c.name.substring(0, 20),
        c.platform,
        `$${cSpend.toFixed(0)}`,
        String(cLeads),
        cLeads > 0 ? `${((cConverted / cLeads) * 100).toFixed(0)}%` : '0%',
        cLeads > 0 ? `${((cJunk / cLeads) * 100).toFixed(0)}%` : '0%',
      ];
    });
    drawTable(doc, ['Campaign', 'Platform', 'Spend', 'Leads', 'Conv %', 'Junk %'], campaignRows, [100, 60, 65, 55, 60, 55]);

    drawFooter(doc);
    doc.end();
  });
}

// ─── Export ───────────────────────────────────────────────────────────────────

export const reportGeneratorService = {
  generateCampaignPerformancePDF,
  generateLeadScoringPDF,
  generateWorkflowSummaryPDF,
  generateLeadsCSV,
  generateGrowthOptimizationPDF,
};
