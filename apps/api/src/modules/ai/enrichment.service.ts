import { prisma } from '../../shared/database/prisma';
import { NotFoundError } from '../../shared/utils/errors';

export interface LeadEnrichment {
  companyName?: string;
  companySize?: string; // 'small' | 'mid' | 'enterprise' | 'unknown'
  annualRevenue?: string;
  industry?: string;
  jobLevel?: 'C-level' | 'Director' | 'Manager' | 'IC' | 'Other';
  linkedInProfileUrl?: string;
  companyLinkedInUrl?: string;
  verifiedEmail?: boolean;
  phoneValid?: boolean;
}

export class EnrichmentService {
  async getLeadEnrichment(leadId: string, tenantId: string): Promise<LeadEnrichment> {
    const lead = await prisma.lead.findFirst({ where: { id: leadId, tenantId } });
    if (!lead) throw new NotFoundError('Lead');

    const company = await prisma.company.findUnique({
      where: { tenantId },
      select: { name: true, industry: true, settings: true },
    });

    const email = lead.email?.toLowerCase() ?? '';
    const knownPersonalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
    const domain = email.split('@')[1] ?? '';
    const verifiedEmail = Boolean(email && email.includes('@') && email.split('@')[1].includes('.') && !knownPersonalDomains.includes(domain));

    const phoneValid = Boolean(lead.phone && /^[+\d][\d\s()\-]{6,20}$/.test(lead.phone));

    const jobTitle = (lead.customFields as any)?.jobTitle || (lead.customFields as any)?.title || '';
    const jobLevel = jobTitle
      ? jobTitle.toLowerCase().includes('director')
        ? 'Director'
        : jobTitle.toLowerCase().includes('chief') || jobTitle.toLowerCase().includes('cfo') || jobTitle.toLowerCase().includes('ceo')
        ? 'C-level'
        : jobTitle.toLowerCase().includes('manager')
        ? 'Manager'
        : 'IC'
      : 'Other';

    const companySize = (company?.settings as any)?.companySize || (lead.customFields as any)?.companySize || 'unknown';

    return {
      companyName: company?.name ?? undefined,
      companySize,
      annualRevenue: (company?.settings as any)?.annualRevenue ?? undefined,
      industry: company?.industry ?? undefined,
      jobLevel: jobLevel as LeadEnrichment['jobLevel'],
      linkedInProfileUrl: (lead.customFields as any)?.linkedInProfileUrl ?? undefined,
      companyLinkedInUrl: (lead.customFields as any)?.companyLinkedInUrl ?? undefined,
      verifiedEmail,
      phoneValid,
    };
  }
}

export const enrichmentService = new EnrichmentService();
