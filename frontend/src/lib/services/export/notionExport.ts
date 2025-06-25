import { Client } from '@notionhq/client';
import { RealtimeSummary } from '@/lib/meeting/types/transcript.types';

interface NotionExportOptions {
  meetingTitle: string;
  meetingDate: string;
  meetingDuration?: string;
  summary: RealtimeSummary;
  notionToken: string;
  databaseId?: string;
  pageId?: string;
}

interface NotionDatabase {
  id: string;
  title: string;
  url: string;
}

/**
 * Get user's Notion databases
 */
export async function getNotionDatabases(notionToken: string): Promise<NotionDatabase[]> {
  try {
    const notion = new Client({ auth: notionToken });
    
    const response = await notion.search({
      filter: {
        property: 'object',
        value: 'database'
      }
    });
    
    return response.results.map((db: any) => ({
      id: db.id,
      title: db.title?.[0]?.plain_text || 'Untitled Database',
      url: db.url
    }));
  } catch (error) {
    console.error('Error fetching Notion databases:', error);
    throw new Error('Failed to fetch Notion databases. Please check your token.');
  }
}

/**
 * Export real-time summary to Notion
 */
export async function exportSummaryToNotion(options: NotionExportOptions): Promise<string> {
  const { meetingTitle, meetingDate, meetingDuration, summary, notionToken, databaseId, pageId } = options;
  
  try {
    const notion = new Client({ auth: notionToken });
    
    // Build page content
    const children: any[] = [
      {
        object: 'block',
        type: 'heading_1',
        heading_1: {
          rich_text: [
            {
              type: 'text',
              text: { content: meetingTitle },
              annotations: { bold: true }
            }
          ]
        }
      },
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              text: { content: `📅 Date: ${new Date(meetingDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}` }
            }
          ]
        }
      }
    ];
    
    if (meetingDuration) {
      children.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              text: { content: `⏱️ Duration: ${meetingDuration}` }
            }
          ]
        }
      });
    }
    
    children.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          {
            type: 'text',
            text: { content: `🤖 Generated: ${new Date().toLocaleString()}` }
          }
        ]
      }
    });
    
    // Add divider
    children.push({
      object: 'block',
      type: 'divider',
      divider: {}
    });
    
    // Executive Summary
    if (summary.tldr) {
      children.push(
        {
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [
              {
                type: 'text',
                text: { content: '📋 Executive Summary' },
                annotations: { bold: true }
              }
            ]
          }
        },
        {
          object: 'block',
          type: 'callout',
          callout: {
            rich_text: [
              {
                type: 'text',
                text: { content: summary.tldr }
              }
            ],
            icon: { emoji: '💡' },
            color: 'yellow_background'
          }
        }
      );
    }
    
    // Key Points
    if (summary.keyPoints && summary.keyPoints.length > 0) {
      children.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [
            {
              type: 'text',
              text: { content: '🎯 Key Discussion Points' },
              annotations: { bold: true }
            }
          ]
        }
      });
      
      const keyPointsList = summary.keyPoints.map(point => ({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [
            {
              type: 'text',
              text: { content: point }
            }
          ]
        }
      }));
      
      children.push(...keyPointsList);
    }
    
    // Action Items
    if (summary.actionItems && summary.actionItems.length > 0) {
      children.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [
            {
              type: 'text',
              text: { content: '✅ Action Items & Next Steps' },
              annotations: { bold: true }
            }
          ]
        }
      });
      
      const actionItemsList = summary.actionItems.map(item => ({
        object: 'block',
        type: 'to_do',
        to_do: {
          rich_text: [
            {
              type: 'text',
              text: { content: item }
            }
          ],
          checked: false
        }
      }));
      
      children.push(...actionItemsList);
    }
    
    // Decisions
    if (summary.decisions && summary.decisions.length > 0) {
      children.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [
            {
              type: 'text',
              text: { content: '🤝 Decisions & Agreements' },
              annotations: { bold: true }
            }
          ]
        }
      });
      
      const decisionsList = summary.decisions.map(decision => ({
        object: 'block',
        type: 'to_do',
        to_do: {
          rich_text: [
            {
              type: 'text',
              text: { content: decision }
            }
          ],
          checked: true
        }
      }));
      
      children.push(...decisionsList);
    }
    
    // Topics
    if (summary.topics && summary.topics.length > 0) {
      children.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [
            {
              type: 'text',
              text: { content: '🏷️ Topics Discussed' },
              annotations: { bold: true }
            }
          ]
        }
      });
      
      const topicsText = summary.topics.map(topic => `#${topic}`).join(' ');
      children.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              text: { content: topicsText },
              annotations: { code: true }
            }
          ]
        }
      });
    }
    
    // Add footer
    children.push(
      {
        object: 'block',
        type: 'divider',
        divider: {}
      },
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              text: { content: 'Generated with ' },
              annotations: { italic: true, color: 'gray' }
            },
            {
              type: 'text',
              text: { content: 'LivePrompt.ai' },
              annotations: { bold: true, italic: true, color: 'blue' }
            }
          ]
        }
      }
    );
    
    let pageUrl: string;
    
    if (databaseId) {
      // Create page in database
      const response = await notion.pages.create({
        parent: { database_id: databaseId },
        properties: {
          title: {
            title: [
              {
                text: { content: meetingTitle }
              }
            ]
          },
          Date: {
            date: { start: meetingDate }
          },
          Status: {
            select: { name: 'Completed' }
          }
        },
        children
      });
      
      pageUrl = `https://www.notion.so/${response.id.replace(/-/g, '')}`;
    } else if (pageId) {
      // Add to existing page
      await notion.blocks.children.append({
        block_id: pageId,
        children
      });
      
      const page = await notion.pages.retrieve({ page_id: pageId });
      pageUrl = `https://www.notion.so/${pageId.replace(/-/g, '')}`;
    } else {
      // Create standalone page
      const response = await notion.pages.create({
        parent: { type: 'page_id', page_id: process.env.NOTION_DEFAULT_PAGE_ID || '' },
        properties: {
          title: {
            title: [
              {
                text: { content: meetingTitle }
              }
            ]
          }
        },
        children
      });
      
      pageUrl = `https://www.notion.so/${response.id.replace(/-/g, '')}`;
    }
    
    return pageUrl;
  } catch (error) {
    console.error('Error exporting to Notion:', error);
    throw new Error('Failed to export to Notion. Please check your token and permissions.');
  }
}

/**
 * Validate Notion token
 */
export async function validateNotionToken(token: string): Promise<boolean> {
  try {
    const notion = new Client({ auth: token });
    await notion.users.me({});
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Send summary via email (using mailto)
 */
export function exportSummaryViaEmail(options: Omit<NotionExportOptions, 'notionToken'>): void {
  const { meetingTitle, meetingDate, meetingDuration, summary } = options;
  
  const subject = `Meeting Summary: ${meetingTitle}`;
  let body = `MEETING SUMMARY\n`;
  body += `===============\n\n`;
  body += `Title: ${meetingTitle}\n`;
  body += `Date: ${new Date(meetingDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })}\n`;
  
  if (meetingDuration) {
    body += `Duration: ${meetingDuration}\n`;
  }
  
  body += `Generated: ${new Date().toLocaleString()}\n\n`;
  
  // Executive Summary
  if (summary.tldr) {
    body += `EXECUTIVE SUMMARY\n`;
    body += `-----------------\n`;
    body += `${summary.tldr}\n\n`;
  }
  
  // Key Points
  if (summary.keyPoints && summary.keyPoints.length > 0) {
    body += `KEY DISCUSSION POINTS\n`;
    body += `--------------------\n`;
    summary.keyPoints.forEach((point, index) => {
      body += `${index + 1}. ${point}\n`;
    });
    body += `\n`;
  }
  
  // Action Items
  if (summary.actionItems && summary.actionItems.length > 0) {
    body += `ACTION ITEMS & NEXT STEPS\n`;
    body += `------------------------\n`;
    summary.actionItems.forEach((item, index) => {
      body += `□ ${item}\n`;
    });
    body += `\n`;
  }
  
  // Decisions
  if (summary.decisions && summary.decisions.length > 0) {
    body += `DECISIONS & AGREEMENTS\n`;
    body += `---------------------\n`;
    summary.decisions.forEach((decision, index) => {
      body += `✓ ${decision}\n`;
    });
    body += `\n`;
  }
  
  // Topics
  if (summary.topics && summary.topics.length > 0) {
    body += `TOPICS DISCUSSED\n`;
    body += `---------------\n`;
    body += summary.topics.map(topic => `#${topic}`).join(', ') + '\n\n';
  }
  
  body += `\n---\nGenerated with LivePrompt.ai`;
  
  // Open email client
  const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(mailtoUrl, '_self');
} 