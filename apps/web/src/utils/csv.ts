export function exportToCSV(data: any[], filename: string) {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers
        .map(header => {
          const value = row[header];
          if (value === null || value === undefined) return '';
          const stringValue = String(value);
          return stringValue.includes(',') || stringValue.includes('"')
            ? `"${stringValue.replace(/"/g, '""')}"`
            : stringValue;
        })
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function formatLeadsForCSV(leads: any[]) {
  return leads.map(lead => ({
    Name: `${lead.firstName || ''} ${lead.lastName || ''}`.trim(),
    Email: lead.email || '',
    Phone: lead.phone || '',
    City: lead.city || '',
    State: lead.state || '',
    Status: lead.status || '',
    'Quality Score': lead.qualityScore || 0,
    'Received Date': lead.receivedAt ? new Date(lead.receivedAt).toLocaleDateString() : '',
  }));
}

export function formatCallsForCSV(calls: any[]) {
  return calls.map(call => ({
    'From Number': call.fromNumber || '',
    'To Number': call.toNumber || '',
    Status: call.status || '',
    'Duration (seconds)': call.durationSeconds || 0,
    'Started At': call.startedAt ? new Date(call.startedAt).toLocaleString() : '',
  }));
}

export function formatCampaignsForCSV(campaigns: any[]) {
  return campaigns.map(campaign => ({
    'Campaign Name': campaign.name || '',
    Platform: campaign.platform || '',
    Status: campaign.status || '',
    'Daily Budget': campaign.dailyBudget || 0,
    'Total Budget': campaign.totalBudget || 0,
    Leads: campaign._count?.leads || 0,
    'Created Date': campaign.createdAt ? new Date(campaign.createdAt).toLocaleDateString() : '',
  }));
}
