export interface WordpressSlugResult {
  slug: string;
  wordpressUrl: string;
  title: string;
}

// Fetch the public WordPress URL for a job id, throwing on failure
export async function getWordpressJobUrl(jobId: string): Promise<string> {
  const response = await fetch(`/api/jobs/${jobId}/wordpress-slug`);
  if (!response.ok) {
    throw new Error(`Failed to resolve WordPress slug for job ${jobId}`);
  }
  const data = (await response.json()) as WordpressSlugResult;
  if (!data?.wordpressUrl) {
    throw new Error('Missing WordPress URL in slug response');
  }
  return data.wordpressUrl;
}
