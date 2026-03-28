import { prisma } from '../src/shared/database/prisma';

async function seedMockData() {
  console.log('🌱 Seeding mock data...');

  try {
    // Create a mock company
    const mockCompany = await prisma.company.create({
      data: {
        tenantId: 'mock-company-001',
        name: 'Mock Company',
        industry: 'Technology',
        businessType: 'B2B SaaS',
        description:
          'A demo company for testing multi-platform campaign creation across Meta, Google, LinkedIn, Microsoft, and Taboola',
        offerDetails: '50% off for first 3 months',
        targetGeo: {
          countries: ['US', 'UK', 'CA'],
          states: ['CA', 'NY', 'TX'],
        },
        leadCriteria: {
          minQualityScore: 70,
          industries: ['Technology', 'Finance', 'Healthcare'],
        },
      },
    });

    console.log('✅ Created mock company:', mockCompany.name);

    // Add Meta Ads credentials
    const metaCreds = await prisma.adPlatformCredential.upsert({
      where: {
        tenantId_platform: {
          tenantId: mockCompany.tenantId,
          platform: 'meta',
        },
      },
      create: {
        tenantId: mockCompany.tenantId,
        platform: 'meta',
        appId: 'mock-app-123456789',
        appSecret: 'mock-app-secret-xxxxxxxxxxxx',
        accountId: 'act_mock123456789',
        accessToken: 'mock-access-token-meta-xxxxxxxxxxxxxxx',
        isValid: true,
      },
      update: {
        isValid: true,
      },
    });
    console.log('✅ Added Meta Ads credentials');

    // Add Google Ads credentials
    const googleCreds = await prisma.adPlatformCredential.upsert({
      where: {
        tenantId_platform: {
          tenantId: mockCompany.tenantId,
          platform: 'google',
        },
      },
      create: {
        tenantId: mockCompany.tenantId,
        platform: 'google',
        accountId: 'mock-google-customer-1234567890',
        accessToken: 'mock-access-token-google-xxxxxxxxxxxxxxx',
        refreshToken: 'mock-refresh-token-google-xxxxxxxxx',
        appId: 'mock-google-app-id',
        extraConfig: {
          developerToken: 'mock-developer-token-xxxxxxxxx',
        },
        isValid: true,
      },
      update: {
        isValid: true,
      },
    });
    console.log('✅ Added Google Ads credentials');

    // Add LinkedIn Ads credentials
    const linkedInCreds = await prisma.adPlatformCredential.upsert({
      where: {
        tenantId_platform: {
          tenantId: mockCompany.tenantId,
          platform: 'linkedin',
        },
      },
      create: {
        tenantId: mockCompany.tenantId,
        platform: 'linkedin',
        accountId: 'mock-linkedin-account-123456789',
        accessToken: 'mock-access-token-linkedin-xxxxxxxxxxxxxxx',
        appId: 'mock-linkedin-app-id',
        appSecret: 'mock-linkedin-app-secret-xxxxxxxxx',
        isValid: true,
      },
      update: {
        isValid: true,
      },
    });
    console.log('✅ Added LinkedIn Ads credentials');

    // Add Microsoft Ads credentials
    const microsoftCreds = await prisma.adPlatformCredential.upsert({
      where: {
        tenantId_platform: {
          tenantId: mockCompany.tenantId,
          platform: 'microsoft',
        },
      },
      create: {
        tenantId: mockCompany.tenantId,
        platform: 'microsoft',
        accountId: 'mock-microsoft-customer-id-123456',
        accessToken: 'mock-access-token-microsoft-xxxxxxxxxxxxxxx',
        refreshToken: 'mock-refresh-token-microsoft-xxxxxxxxx',
        appId: 'mock-microsoft-client-id',
        appSecret: 'mock-microsoft-client-secret-xxxxxxxxx',
        isValid: true,
      },
      update: {
        isValid: true,
      },
    });
    console.log('✅ Added Microsoft Ads credentials');

    // Add Taboola credentials
    const taboolaCreds = await prisma.adPlatformCredential.upsert({
      where: {
        tenantId_platform: {
          tenantId: mockCompany.tenantId,
          platform: 'taboola',
        },
      },
      create: {
        tenantId: mockCompany.tenantId,
        platform: 'taboola',
        accountId: 'mock-taboola-account-123456',
        accessToken: 'mock-api-token-taboola-xxxxxxxxxxxxxxx',
        appId: 'mock-taboola-client-id',
        isValid: true,
      },
      update: {
        isValid: true,
      },
    });
    console.log('✅ Added Taboola credentials');

    console.log('\n✅ Mock data seeded successfully!');
    console.log('\nMock Company Details:');
    console.log('- Name:', mockCompany.name);
    console.log('- Tenant ID:', mockCompany.tenantId);
    console.log('- Platforms configured: Meta, Google, LinkedIn, Microsoft, Taboola');
    console.log('\n🚀 You can now create campaigns for this company!');
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedMockData();
