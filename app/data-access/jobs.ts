export interface marketingSlugResult {
  slug: string;
  marketingUrl: string;
  title: string;
}

// Fetch the public marketing URL for a job id, throwing on failure
export async function getmarketingJobUrl(jobId: string): Promise<string> {
  const response = await fetch(`/api/jobs/${jobId}/marketing-slug`);
  if (!response.ok) {
    throw new Error(`Failed to resolve marketing slug for job ${jobId}`);
  }
  const data = (await response.json()) as marketingSlugResult;
  if (!data?.marketingUrl) {
    throw new Error('Missing marketing URL in slug response');
  }
  return data.marketingUrl;
}
