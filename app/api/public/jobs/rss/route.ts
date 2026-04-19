import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Get approved jobs that haven't expired
    const jobs = await db.job.findMany({
      where: {
        status: 'approved',
        expiresAt: {
          gt: new Date()
        }
      },
      select: {
        id: true,
        title: true,
        category: true,
        type: true,
        description: true,
        requirements: true,
        experienceLevel: true,
        payRangeMin: true,
        payRangeMax: true,
        payRangeText: true,
        salaryType: true,
        skillsRequired: true,
        benefits: true,
        isFlexibleHours: true,
        hoursPerWeek: true,
        locationText: true,
        createdAt: true,
        expiresAt: true,
        isCompanyPrivate: true,
        employer: {
          select: {
            companyName: true,
            companyLogoUrl: true,
            companyWebsite: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100 // Limit to prevent huge feeds
    });

    // Generate marketing-compatible slugs (matches marketing plugin logic)
    const generateSlug = (jobId: string, title: string): string => {
      // Use first 8 characters of job ID for shorter, cleaner slugs (matches marketing plugin)
      const idPart = jobId.substring(0, 8);

      // Sanitize title for URL (matches marketing sanitize_title function)
      const titleSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Remove multiple hyphens
        .trim();

      return `${idPart}-${titleSlug}`;
    };

    // Format job type for display
    const formatJobType = (type: string): string => {
      const typeMap: { [key: string]: string } = {
        'FULL_TIME': 'Full-Time',
        'PART_TIME': 'Part-Time',
        'PERMANENT': 'Permanent',
        'TEMPORARY': 'Temporary'
      };
      return typeMap[type] || type;
    };

    // Format job category for display
    const formatCategory = (category: string): string => {
      return category
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    };

    // Format experience level for display
    const formatExperienceLevel = (level: string | null): string => {
      if (!level) return 'Any Level';
      const levelMap: { [key: string]: string } = {
        'entry': 'Entry Level',
        'mid': 'Mid Level',
        'senior': 'Senior Level',
        'lead': 'Lead Level',
        'executive': 'Executive Level'
      };
      return levelMap[level.toLowerCase()] || level;
    };

    // Format salary type for display
    const formatSalaryType = (type: string | null): string => {
      if (!type) return 'yearly';
      const typeMap: { [key: string]: string } = {
        'yearly': 'per year',
        'hourly': 'per hour',
        'monthly': 'per month',
        'weekly': 'per week'
      };
      return typeMap[type.toLowerCase()] || type;
    };

    // Build better salary range text
    const buildSalaryRange = (job: any): string => {
      if (job.payRangeText) return job.payRangeText;

      if (job.payRangeMin && job.payRangeMax) {
        const salaryTypeText = job.salaryType ? `/${job.salaryType.toLowerCase()}` : '';
        return `$${Number(job.payRangeMin).toLocaleString()} - $${Number(job.payRangeMax).toLocaleString()}${salaryTypeText}`;
      }

      if (job.payRangeMin) {
        const salaryTypeText = job.salaryType ? `/${job.salaryType.toLowerCase()}` : '';
        return `From $${Number(job.payRangeMin).toLocaleString()}${salaryTypeText}`;
      }

      if (job.payRangeMax) {
        const salaryTypeText = job.salaryType ? `/${job.salaryType.toLowerCase()}` : '';
        return `Up to $${Number(job.payRangeMax).toLocaleString()}${salaryTypeText}`;
      }

      return 'Competitive';
    };

    // Build RSS XML
    const rssItems = jobs.map(job => {
      const isCompanyPrivate = job.isCompanyPrivate || false;
      const companyName = isCompanyPrivate ? 'Private Company' : job.employer.companyName;
      const slug = generateSlug(job.id, job.title);
      const applyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/seeker/jobs/${job.id}`;
      const salaryRange = buildSalaryRange(job);

      // Escape XML content
      const escapeXml = (str: string): string => {
        return str
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      };

      return `
    <item>
      <title><![CDATA[${job.title}]]></title>
      <description><![CDATA[${job.description}]]></description>
      <link>${applyUrl}</link>
      <guid isPermaLink="false">${job.id}</guid>
      <pubDate>${job.createdAt.toUTCString()}</pubDate>
      
      <!-- method called Custom job namespace fields -->
      <job:id>${job.id}</job:id>
      <job:slug>${slug}</job:slug>
      <job:category>${job.category}</job:category>
      <job:categoryDisplay><![CDATA[${formatCategory(job.category)}]]></job:categoryDisplay>
      <job:type>${job.type}</job:type>
      <job:typeDisplay><![CDATA[${formatJobType(job.type)}]]></job:typeDisplay>
      <job:location><![CDATA[${job.locationText || 'Remote'}]]></job:location>
      <job:company><![CDATA[${companyName}]]></job:company>
      <job:payRange><![CDATA[${salaryRange}]]></job:payRange>
      <job:payRangeMin>${job.payRangeMin || 0}</job:payRangeMin>
      <job:payRangeMax>${job.payRangeMax || 0}</job:payRangeMax>
      <job:salaryType>${job.salaryType || 'yearly'}</job:salaryType>
      <job:salaryTypeDisplay><![CDATA[${formatSalaryType(job.salaryType)}]]></job:salaryTypeDisplay>
      <job:experienceLevel>${job.experienceLevel || 'mid'}</job:experienceLevel>
      <job:experienceLevelDisplay><![CDATA[${formatExperienceLevel(job.experienceLevel)}]]></job:experienceLevelDisplay>
      <job:requirements><![CDATA[${job.requirements || 'Requirements not specified'}]]></job:requirements>
      <job:skills>${job.skillsRequired?.join(',') || ''}</job:skills>
      <job:postedDate>${job.createdAt.toISOString()}</job:postedDate>
      <job:expiresDate>${job.expiresAt?.toISOString() || ''}</job:expiresDate>
      <job:applyUrl>${applyUrl}</job:applyUrl>
      <job:isFlexibleHours>${job.isFlexibleHours}</job:isFlexibleHours>
      <job:hoursPerWeek>${job.hoursPerWeek || 0}</job:hoursPerWeek>
      <job:benefits><![CDATA[${job.benefits || ''}]]></job:benefits>
    </item>`;
    }).join('');

    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:job="http://ampertalent.com/job-namespace">
  <channel>
    <title>ampertalent - Active Jobs</title>
    <description>Current job openings from ampertalent platform</description>
    <link>${process.env.NEXT_PUBLIC_APP_URL}</link>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <language>en-us</language>
    <managingEditor>jobs@ampertalent.com (ampertalent)</managingEditor>
    <webMaster>tech@ampertalent.com (ampertalent Tech Team)</webMaster>
    <ttl>15</ttl>
    <image>
      <url>${process.env.NEXT_PUBLIC_APP_URL}/logo.png</url>
      <title>ampertalent</title>
      <link>${process.env.NEXT_PUBLIC_APP_URL}</link>
    </image>
    ${rssItems}
  </channel>
</rss>`;

    return new Response(rssXml, {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300', // 5-minute cache
      },
    });

  } catch (error) {
    console.error('Error generating RSS feed:', error);
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Error</title><description>Failed to generate RSS feed</description></channel></rss>',
      {
        status: 500,
        headers: {
          'Content-Type': 'application/rss+xml; charset=utf-8',
        },
      }
    );
  }
}