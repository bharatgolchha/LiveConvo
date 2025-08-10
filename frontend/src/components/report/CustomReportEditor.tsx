import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import Link from '@tiptap/extension-link';
import { marked } from 'marked';

// Configure marked for better parsing
marked.setOptions({
  breaks: true,
  gfm: true,
});
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
  Code,
  Minus
} from 'lucide-react';

interface CustomReportEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export function CustomReportEditor({ content, onChange, placeholder }: CustomReportEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: placeholder || 'Start writing your report...',
      }),
      Typography,
      Link.configure({
        openOnClick: false,
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      // Convert the editor content back to markdown
      const html = editor.getHTML();
      const markdown = htmlToMarkdown(html);
      onChange(markdown);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none h-full px-4 py-3 bg-transparent',
      },
    },
  });

  useEffect(() => {
    if (editor && content) {
      // Only update if content is different
      const currentText = editor.getText();
      if (content !== currentText) {
        // Convert markdown to HTML for TipTap
        try {
          const html = marked.parse(content);
          editor.commands.setContent(html);
        } catch (e) {
          // If markdown parsing fails, set as plain text
          editor.commands.setContent(content);
        }
      }
    }
  }, [content, editor]);

  // Convert HTML back to markdown
  const htmlToMarkdown = (html: string): string => {
    // Create a temporary div to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    let markdown = '';
    
    const processElement = (element: Element | ChildNode, depth = 0): string => {
      let result = '';
      
      if (element.nodeType === Node.TEXT_NODE) {
        return element.textContent || '';
      }
      
      if (element.nodeType !== Node.ELEMENT_NODE) {
        return '';
      }
      
      const el = element as Element;
      const tagName = el.tagName.toLowerCase();
      
      switch (tagName) {
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
          const level = parseInt(tagName.charAt(1));
          result += '#'.repeat(level) + ' ';
          break;
        case 'p':
          if (markdown.length > 0 && !markdown.endsWith('\n\n')) {
            result = '\n\n';
          }
          break;
        case 'strong':
        case 'b':
          result += '**';
          break;
        case 'em':
        case 'i':
          result += '_';
          break;
        case 'code':
          if (el.parentElement?.tagName.toLowerCase() !== 'pre') {
            result += '`';
          }
          break;
        case 'pre':
          result += '```\n';
          break;
        case 'ul':
        case 'ol':
          if (markdown.length > 0 && !markdown.endsWith('\n')) {
            result = '\n';
          }
          break;
        case 'li':
          const parent = el.parentElement;
          if (parent?.tagName.toLowerCase() === 'ol') {
            const index = Array.from(parent.children).indexOf(el) + 1;
            result += `${index}. `;
          } else {
            result += '- ';
          }
          break;
        case 'blockquote':
          result += '> ';
          break;
        case 'a':
          const href = el.getAttribute('href');
          result += '[';
          break;
        case 'br':
          result += '\n';
          break;
      }
      
      // Process children
      for (const child of Array.from(el.childNodes)) {
        result += processElement(child, depth + (tagName === 'li' ? 1 : 0));
      }
      
      // Add closing markers
      switch (tagName) {
        case 'strong':
        case 'b':
          result += '**';
          break;
        case 'em':
        case 'i':
          result += '_';
          break;
        case 'code':
          if (el.parentElement?.tagName.toLowerCase() !== 'pre') {
            result += '`';
          }
          break;
        case 'pre':
          result += '\n```';
          break;
        case 'a':
          const href = el.getAttribute('href');
          result += `](${href || '#'})`;
          break;
        case 'p':
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
        case 'li':
        case 'blockquote':
          if (!result.endsWith('\n')) {
            result += '\n';
          }
          break;
      }
      
      return result;
    };
    
    // Process all children of the temp div
    for (const child of Array.from(tempDiv.childNodes)) {
      markdown += processElement(child);
    }
    
    return markdown.trim();
  };

  // Simple JSON to Markdown converter (keeping for reference)
  const convertToMarkdown = (doc: any): string => {
    let markdown = '';
    
    const processNode = (node: any, depth = 0): string => {
      let result = '';
      
      switch (node.type) {
        case 'heading':
          const level = node.attrs?.level || 1;
          result += '#'.repeat(level) + ' ';
          break;
        case 'bulletList':
        case 'orderedList':
          // Lists are handled by their items
          break;
        case 'listItem':
          const bullet = node.attrs?.ordered ? '1. ' : '- ';
          result += '  '.repeat(depth) + bullet;
          break;
        case 'paragraph':
          // Paragraphs need newlines
          if (markdown.length > 0 && !markdown.endsWith('\n\n')) {
            result += '\n\n';
          }
          break;
        case 'blockquote':
          result += '> ';
          break;
        case 'codeBlock':
          result += '```\n';
          break;
      }
      
      // Process marks (bold, italic, code)
      if (node.marks) {
        node.marks.forEach((mark: any) => {
          switch (mark.type) {
            case 'bold':
              result += '**';
              break;
            case 'italic':
              result += '_';
              break;
            case 'code':
              result += '`';
              break;
          }
        });
      }
      
      // Process text content
      if (node.text) {
        result += node.text;
      }
      
      // Process children
      if (node.content) {
        node.content.forEach((child: any) => {
          result += processNode(child, node.type === 'listItem' ? depth + 1 : depth);
        });
      }
      
      // Close marks
      if (node.marks) {
        node.marks.reverse().forEach((mark: any) => {
          switch (mark.type) {
            case 'bold':
              result += '**';
              break;
            case 'italic':
              result += '_';
              break;
            case 'code':
              result += '`';
              break;
          }
        });
      }
      
      // Add closing elements
      switch (node.type) {
        case 'codeBlock':
          result += '\n```';
          break;
        case 'paragraph':
        case 'heading':
        case 'listItem':
        case 'blockquote':
          if (!result.endsWith('\n')) {
            result += '\n';
          }
          break;
      }
      
      return result;
    };
    
    if (doc.content) {
      doc.content.forEach((node: any) => {
        markdown += processNode(node);
      });
    }
    
    return markdown.trim();
  };

  if (!editor) {
    return null;
  }

  const ToolbarButton = ({ 
    onClick, 
    isActive = false, 
    disabled = false,
    children,
    title 
  }: {
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-2 rounded-md transition-colors ${
        isActive 
          ? 'bg-primary/90 text-primary-foreground' 
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );

  return (
    <div className="flex flex-col h-full border border-border/50 rounded-lg bg-background/50">
      <div className="flex items-center gap-1 p-2 border-b border-border/50 bg-muted/30 flex-shrink-0">
        <div className="flex items-center gap-1">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            title="Bold (Cmd+B)"
          >
            <Bold className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            title="Italic (Cmd+I)"
          >
            <Italic className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            isActive={editor.isActive('code')}
            title="Code (Cmd+E)"
          >
            <Code className="w-4 h-4" />
          </ToolbarButton>
        </div>

        <div className="w-px h-6 bg-border/30 mx-1" />

        <div className="flex items-center gap-1">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive('heading', { level: 1 })}
            title="Heading 1"
          >
            <Heading1 className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive('heading', { level: 2 })}
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive('heading', { level: 3 })}
            title="Heading 3"
          >
            <Heading3 className="w-4 h-4" />
          </ToolbarButton>
        </div>

        <div className="w-px h-6 bg-border/30 mx-1" />

        <div className="flex items-center gap-1">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            title="Ordered List"
          >
            <ListOrdered className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive('blockquote')}
            title="Quote"
          >
            <Quote className="w-4 h-4" />
          </ToolbarButton>
        </div>

        <div className="w-px h-6 bg-border/30 mx-1" />

        <div className="flex items-center gap-1">
          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Horizontal Rule"
          >
            <Minus className="w-4 h-4" />
          </ToolbarButton>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-1">
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo (Cmd+Z)"
          >
            <Undo className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo (Cmd+Shift+Z)"
          >
            <Redo className="w-4 h-4" />
          </ToolbarButton>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  );
}