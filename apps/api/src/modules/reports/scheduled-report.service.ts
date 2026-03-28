import { prisma } from '../../shared/database/prisma';
import * as cron from 'node-cron';
import nodemailer from 'nodemailer';
import { CronExpressionParser } from 'cron-parser';
import { reportGeneratorService } from './report-generator.service';

// ─── CRUD ─────────────────────────────────────────────────────────────────────

async function list(tenantId: string) {
  return prisma.scheduledReport.findMany({
    where: { tenantId },
    include: { creator: { select: { id: true, email: true, firstName: true, lastName: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

async function getById(id: string, tenantId: string) {
  return prisma.scheduledReport.findFirst({ where: { id, tenantId } });
}

async function create(data: {
  tenantId: string;
  name: string;
  reportType: string;
  schedule: string;
  recipients: string[];
  filters?: any;
  createdBy?: string;
}) {
  return prisma.scheduledReport.create({ data });
}

async function update(id: string, tenantId: string, data: {
  name?: string;
  reportType?: string;
  schedule?: string;
  recipients?: string[];
  filters?: any;
  isActive?: boolean;
}) {
  return prisma.scheduledReport.update({
    where: { id },
    data,
  });
}

async function remove(id: string, tenantId: string) {
  const report = await prisma.scheduledReport.findFirst({ where: { id, tenantId } });
  if (!report) throw new Error('Report not found');
  return prisma.scheduledReport.delete({ where: { id } });
}

// ─── Saved Reports (Custom Report Builder) ────────────────────────────────────

async function listSaved(tenantId: string) {
  return prisma.savedReport.findMany({
    where: { tenantId },
    include: { creator: { select: { id: true, email: true, firstName: true, lastName: true } } },
    orderBy: { updatedAt: 'desc' },
  });
}

async function getSavedById(id: string, tenantId: string) {
  return prisma.savedReport.findFirst({ where: { id, tenantId } });
}

async function createSaved(data: {
  tenantId: string;
  name: string;
  config: any;
  isPublic?: boolean;
  createdBy?: string;
}) {
  return prisma.savedReport.create({ data });
}

async function updateSaved(id: string, tenantId: string, data: {
  name?: string;
  config?: any;
  isPublic?: boolean;
}) {
  return prisma.savedReport.update({ where: { id }, data });
}

async function removeSaved(id: string, tenantId: string) {
  const report = await prisma.savedReport.findFirst({ where: { id, tenantId } });
  if (!report) throw new Error('Saved report not found');
  return prisma.savedReport.delete({ where: { id } });
}

// ─── Cron Job: Scheduled Report Delivery ──────────────────────────────────────

const transporter = nodemailer.createTransport({
  host: process.env['SMTP_HOST'] || 'smtp.ethereal.email',
  port: Number(process.env['SMTP_PORT'] || 587),
  secure: false,
  auth: {
    user: process.env['SMTP_USER'] || '',
    pass: process.env['SMTP_PASS'] || '',
  },
});

async function sendScheduledReport(report: any) {
  try {
    const filters = (report.filters as any) ?? {};
    let pdfBuffer: Buffer;
    let subject: string;

    switch (report.reportType) {
      case 'campaign_performance':
        pdfBuffer = await reportGeneratorService.generateCampaignPerformancePDF(report.tenantId, filters);
        subject = `Campaign Performance Report – ${new Date().toLocaleDateString()}`;
        break;
      case 'lead_scoring':
        pdfBuffer = await reportGeneratorService.generateLeadScoringPDF(report.tenantId, filters);
        subject = `Lead Scoring Summary – ${new Date().toLocaleDateString()}`;
        break;
      case 'workflow_summary':
        pdfBuffer = await reportGeneratorService.generateWorkflowSummaryPDF(report.tenantId, filters);
        subject = `Workflow Execution Summary – ${new Date().toLocaleDateString()}`;
        break;
      case 'growth_optimization':
        pdfBuffer = await reportGeneratorService.generateGrowthOptimizationPDF(report.tenantId, filters);
        subject = `Growth Optimization Report – ${new Date().toLocaleDateString()}`;
        break;
      default:
        console.error(`Unknown report type: ${report.reportType}`);
        return;
    }

    await transporter.sendMail({
      from: process.env['SMTP_FROM'] || 'reports@leadflowpro.com',
      to: report.recipients.join(', '),
      subject,
      text: `Please find your scheduled "${report.name}" report attached.`,
      attachments: [{
        filename: `${report.reportType}-${new Date().toISOString().split('T')[0]}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      }],
    });

    await prisma.scheduledReport.update({
      where: { id: report.id },
      data: { lastSentAt: new Date() },
    });

    console.log(`📧 Sent scheduled report "${report.name}" to ${report.recipients.length} recipients`);
  } catch (error) {
    console.error(`Failed to send report "${report.name}":`, error);
  }
}

// Run every minute to check for due reports
let cronTask: ReturnType<typeof cron.schedule> | null = null;

function startReportCron() {
  cronTask = cron.schedule('* * * * *', async () => {
    try {
      const activeReports = await prisma.scheduledReport.findMany({
        where: { isActive: true },
      });

      for (const report of activeReports) {
        if (cron.validate(report.schedule) && shouldSendNow(report)) {
          await sendScheduledReport(report);
        }
      }
    } catch (error) {
      console.error('Report cron job error:', error);
    }
  });

  console.log('📅 Scheduled report cron started');
}

function stopReportCron() {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
  }
}

function shouldSendNow(report: { schedule: string; lastSentAt: Date | null }): boolean {
  const lastSent = report.lastSentAt ?? new Date(0);
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  if (lastSent > oneHourAgo) return false;

  try {
    const expr = CronExpressionParser.parse(report.schedule);
    const prev = expr.prev().toDate();
    return prev > lastSent;
  } catch {
    return false;
  }
}

// ─── Export ───────────────────────────────────────────────────────────────────

export const scheduledReportService = {
  list,
  getById,
  create,
  update,
  remove,
  listSaved,
  getSavedById,
  createSaved,
  updateSaved,
  removeSaved,
  startReportCron,
  stopReportCron,
};
