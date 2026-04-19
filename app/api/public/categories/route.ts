import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Get job categories with counts for marketing display
    const categories = await db.job.groupBy({
      by: ['category'],
      _count: { category: true },
      where: {
        status: 'approved',
        expiresAt: {
          gt: new Date()
        }
      },
      orderBy: {
        _count: {
          category: 'desc'
        }
      }
    });

    // Get job types with counts
    const jobTypes = await db.job.groupBy({
      by: ['type'],
      _count: { type: true },
      where: {
        status: 'approved',
        expiresAt: {
          gt: new Date()
        }
      },
      orderBy: {
        _count: {
          type: 'desc'
        }
      }
    });

    // Format for public consumption
    const publicCategories = {
      categories: categories.map(cat => ({
        name: cat.category,
        slug: cat.category.toLowerCase().replace(/\s+/g, '-'),
        count: cat._count.category,
        description: getCategoryDescription(cat.category)
      })),
      jobTypes: jobTypes.map(type => ({
        name: type.type,
        slug: type.type.replace('_', '-'),
        count: type._count.type,
        label: formatJobTypeLabel(type.type)
      })),
      totalActiveJobs: categories.reduce((sum, cat) => sum + cat._count.category, 0)
    };

    return Response.json(publicCategories);
  } catch (error) {
    console.error('Error fetching public categories:', error);
    return Response.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

// Helper function to get category descriptions
function getCategoryDescription(category: string): string {
  const descriptions: Record<string, string> = {
    'Administrative': 'Virtual assistant, data entry, and administrative support roles',
    'Customer Service': 'Remote customer support and service representative positions',
    'Marketing': 'Digital marketing, social media, and content marketing opportunities',
    'Sales': 'Remote sales, business development, and account management roles',
    'Writing': 'Content writing, copywriting, and editorial positions',
    'Design': 'Graphic design, web design, and creative roles',
    'Technology': 'Software development, IT support, and technical positions',
    'Finance': 'Bookkeeping, accounting, and financial analysis roles',
    'Education': 'Online tutoring, curriculum development, and educational roles',
    'Healthcare': 'Remote healthcare administration and telehealth positions'
  };

  return descriptions[category] || `Remote ${category.toLowerCase()} opportunities`;
}

// Helper function to format job type labels
function formatJobTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'full_time': 'Full-Time',
    'part_time': 'Part-Time',
    'project': 'Project-Based'
  };

  return labels[type] || type;
}