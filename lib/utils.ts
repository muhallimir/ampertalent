import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
  }
  let decoded = text
  Object.entries(entities).forEach(([entity, char]) => {
    decoded = decoded.replace(new RegExp(entity, 'g'), char)
  })
  return decoded
}

/**
 * Helper function to extract list items properly, handling nested structures
 */
function extractListItems(html: string): string[] {
  const items: string[] = [];
  let depth = 0;
  let currentItem = '';
  let inItem = false;

  for (let i = 0; i < html.length; i++) {
    const char = html[i];
    const remaining = html.substring(i);

    if (remaining.startsWith('<li>') || remaining.startsWith('<li ')) {
      if (depth === 0) {
        if (currentItem) items.push(currentItem);
        currentItem = '';
        inItem = true;
      }
      depth++;
      currentItem += char;
    } else if (remaining.startsWith('</li>')) {
      depth--;
      currentItem += char;
      if (depth === 0 && inItem) {
        currentItem += remaining.substring(1, 5); // Add </li>
        items.push(currentItem);
        currentItem = '';
        inItem = false;
        i += 4; // Skip </li>
      }
    } else if (inItem) {
      currentItem += char;
    }
  }

  if (currentItem) items.push(currentItem);
  return items;
}

/**
 * Helper function to process list items recursively, handling nested lists
 */
function processListItems(items: string[], isOrdered: boolean, indentLevel: number = 0): string {
  const indent = '  '.repeat(indentLevel);

  return items.map((item: string, index: number) => {
    // Extract the content between <li> tags
    let liContent = item.replace(/^<li[^>]*>/i, '').replace(/<\/li>$/i, '').trim();

    // Check for nested lists within this item
    const nestedUl = /<ul[^>]*>([\s\S]*?)<\/ul>/i.exec(liContent);
    const nestedOl = /<ol[^>]*>([\s\S]*?)<\/ol>/i.exec(liContent);

    let text = liContent;
    let nestedMarkdown = '';

    if (nestedUl) {
      // Process nested unordered list
      const nestedItems = extractListItems(nestedUl[1]);
      if (nestedItems.length > 0) {
        nestedMarkdown = '\n' + processListItems(nestedItems, false, indentLevel + 1);
      }
      text = liContent.replace(/<ul[^>]*>[\s\S]*?<\/ul>/i, '').trim();
    } else if (nestedOl) {
      // Process nested ordered list
      const nestedItems = extractListItems(nestedOl[1]);
      if (nestedItems.length > 0) {
        nestedMarkdown = '\n' + processListItems(nestedItems, true, indentLevel + 1);
      }
      text = liContent.replace(/<ol[^>]*>[\s\S]*?<\/ol>/i, '').trim();
    }

    // Remove any remaining HTML tags from the text
    text = text.replace(/<\/?[^>]+(>|$)/g, '').trim();

    const bullet = isOrdered ? `${index + 1}.` : '-';
    return `${indent}${bullet} ${text}${nestedMarkdown}`;
  }).join('\n');
}

/**
 * Converts HTML to Markdown format
 * Primarily used for migrated job descriptions that contain HTML tags
 */
export function htmlToMarkdown(html: string): string {
  if (!html) return html;

  // Check if the content contains HTML tags or entities
  const hasHtmlTags = /<[^>]+>/.test(html);
  const hasHtmlEntities = /&[a-z]+;/i.test(html);
  if (!hasHtmlTags && !hasHtmlEntities) return html;

  let markdown = html;

  // Convert headings
  markdown = markdown.replace(/<h1>([\s\S]*?)<\/h1>/gi, '# $1\n\n');
  markdown = markdown.replace(/<h2>([\s\S]*?)<\/h2>/gi, '## $1\n\n');
  markdown = markdown.replace(/<h3>([\s\S]*?)<\/h3>/gi, '### $1\n\n');
  markdown = markdown.replace(/<h4>([\s\S]*?)<\/h4>/gi, '#### $1\n\n');
  markdown = markdown.replace(/<h5>([\s\S]*?)<\/h5>/gi, '##### $1\n\n');
  markdown = markdown.replace(/<h6>([\s\S]*?)<\/h6>/gi, '###### $1\n\n');

  // Convert bold and italic
  markdown = markdown.replace(/<strong>([\s\S]*?)<\/strong>/gi, '**$1**');
  markdown = markdown.replace(/<b>([\s\S]*?)<\/b>/gi, '**$1**');
  markdown = markdown.replace(/<em>([\s\S]*?)<\/em>/gi, '*$1*');
  markdown = markdown.replace(/<i>([\s\S]*?)<\/i>/gi, '*$1*');

  // Convert links
  markdown = markdown.replace(/<a\s+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');

  // Convert line breaks
  markdown = markdown.replace(/<br\s*\/?>/gi, '  \n');

  // Convert paragraphs
  markdown = markdown.replace(/<p>([\s\S]*?)<\/p>/gi, '$1\n\n');

  // Convert lists (handles nested lists recursively)
  // Process unordered lists
  while (/<ul[^>]*>[\s\S]*?<\/ul>/i.test(markdown)) {
    markdown = markdown.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/i, (_match, content) => {
      const items = extractListItems(content);
      return processListItems(items, false, 0) + '\n\n';
    });
  }

  // Process ordered lists
  while (/<ol[^>]*>[\s\S]*?<\/ol>/i.test(markdown)) {
    markdown = markdown.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/i, (_match, content) => {
      const items = extractListItems(content);
      return processListItems(items, true, 0) + '\n\n';
    });
  }

  // Remove any remaining HTML tags
  markdown = markdown.replace(/<\/?[^>]+(>|$)/g, '');

  // Convert common HTML entities to their characters
  const htmlEntities: Record<string, string> = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&cent;': '¢',
    '&pound;': '£',
    '&yen;': '¥',
    '&euro;': '€',
    '&copy;': '©',
    '&reg;': '®',
    '&trade;': '™',
    '&times;': '×',
    '&divide;': '÷',
    '&mdash;': '—',
    '&ndash;': '–',
    '&hellip;': '…',
    '&laquo;': '«',
    '&raquo;': '»',
    '&bull;': '•',
  };

  // Replace HTML entities
  Object.entries(htmlEntities).forEach(([entity, char]) => {
    markdown = markdown.replace(new RegExp(entity, 'g'), char);
  });

  // Convert numeric HTML entities (e.g., &#8217; for ')
  markdown = markdown.replace(/&#(\d+);/g, (_match, dec) => {
    return String.fromCharCode(parseInt(dec, 10));
  });

  // Convert hex HTML entities (e.g., &#x2019; for ')
  markdown = markdown.replace(/&#x([0-9a-f]+);/gi, (_match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });

  // Clean up extra newlines (more than 2 consecutive)
  markdown = markdown.replace(/\n{3,}/g, '\n\n');

  // Trim whitespace
  markdown = markdown.trim();

  return markdown;
}
