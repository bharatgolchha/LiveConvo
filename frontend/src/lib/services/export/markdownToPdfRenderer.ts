import jsPDF from 'jspdf';

interface RenderContext {
  doc: jsPDF;
  currentY: number;
  margin: number;
  maxWidth: number;
  pageHeight: number;
  defaultFontSize: number;
}

export function renderMarkdownToPDF(content: string, context: RenderContext): number {
  const { doc, margin, maxWidth, pageHeight, defaultFontSize } = context;
  let { currentY } = context;
  
  const lines = content.split('\n');
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  let inOrderedList = false;
  let orderedListIndex = 1;
  
  lines.forEach((line: string) => {
    // Check for page break
    if (currentY > pageHeight - margin - 10) {
      doc.addPage();
      currentY = margin;
    }
    
    // Handle code blocks
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        inCodeBlock = false;
        // Render code block with background
        const codeY = currentY;
        doc.setFillColor(245, 245, 245);
        const codeHeight = codeBlockLines.length * 5 + 10;
        doc.rect(margin - 5, codeY - 5, maxWidth + 10, codeHeight, 'F');
        
        doc.setFont('courier', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        
        codeBlockLines.forEach((codeLine) => {
          if (currentY > pageHeight - margin) {
            doc.addPage();
            currentY = margin;
          }
          const codeLines = doc.splitTextToSize(codeLine || ' ', maxWidth - 10);
          codeLines.forEach((cl: string) => {
            doc.text(cl, margin, currentY);
            currentY += 5;
          });
        });
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(defaultFontSize);
        codeBlockLines = [];
        currentY += 5;
      } else {
        // Start code block
        inCodeBlock = true;
        currentY += 5;
      }
      return;
    }
    
    if (inCodeBlock) {
      codeBlockLines.push(line);
      return;
    }
    
    // Handle headers
    if (line.startsWith('# ')) {
      currentY = renderHeader(line.substring(2), 1, doc, margin, maxWidth, pageHeight, currentY);
      orderedListIndex = 1;
    } else if (line.startsWith('## ')) {
      currentY = renderHeader(line.substring(3), 2, doc, margin, maxWidth, pageHeight, currentY);
      orderedListIndex = 1;
    } else if (line.startsWith('### ')) {
      currentY = renderHeader(line.substring(4), 3, doc, margin, maxWidth, pageHeight, currentY);
      orderedListIndex = 1;
    } else if (line.startsWith('#### ')) {
      currentY = renderHeader(line.substring(5), 4, doc, margin, maxWidth, pageHeight, currentY);
      orderedListIndex = 1;
    }
    // Handle lists
    else if (line.match(/^(\d+)\.\s/)) {
      // Numbered list
      if (!inOrderedList) {
        inOrderedList = true;
        orderedListIndex = 1;
      }
      const listText = line.replace(/^\d+\.\s/, '');
      currentY = renderListItem(`${orderedListIndex}.`, listText, doc, margin, maxWidth, pageHeight, currentY);
      orderedListIndex++;
    } else if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('+ ')) {
      // Bullet list
      inOrderedList = false;
      orderedListIndex = 1;
      const bulletText = line.substring(2);
      currentY = renderListItem('•', bulletText, doc, margin, maxWidth, pageHeight, currentY);
    }
    // Handle blockquotes
    else if (line.startsWith('> ')) {
      const quoteText = line.substring(2);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(defaultFontSize);
      
      const quoteLines = doc.splitTextToSize(quoteText, maxWidth - 10);
      doc.setDrawColor(200, 200, 200);
      doc.line(margin - 5, currentY - 3, margin - 5, currentY + (quoteLines.length * 6));
      
      quoteLines.forEach((quoteLine: string) => {
        if (currentY > pageHeight - margin) {
          doc.addPage();
          currentY = margin;
        }
        doc.text(quoteLine, margin, currentY);
        currentY += 6;
      });
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      currentY += 2;
    }
    // Handle horizontal rules
    else if (line.match(/^(-{3,}|_{3,}|\*{3,})$/)) {
      currentY += 5;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, currentY, margin + maxWidth, currentY);
      currentY += 5;
    }
    // Handle regular text with inline formatting
    else if (line.trim()) {
      inOrderedList = false;
      currentY = renderFormattedText(line, doc, margin, maxWidth, pageHeight, currentY, defaultFontSize);
    } else {
      // Empty line
      currentY += 4;
      inOrderedList = false;
    }
    
    // Update current Y position
    context.currentY = currentY;
  });
  
  return currentY;
}

function renderHeader(text: string, level: number, doc: jsPDF, margin: number, maxWidth: number, pageHeight: number, currentY: number): number {
  const sizes = [16, 14, 12, 11];
  const fontSize = sizes[level - 1] || 11;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(fontSize);
  
  const headerLines = doc.splitTextToSize(text, maxWidth);
  headerLines.forEach((headerLine: string) => {
    if (currentY > pageHeight - margin) {
      doc.addPage();
      currentY = margin;
    }
    doc.text(headerLine, margin, currentY);
    currentY += fontSize * 0.5;
  });
  
  doc.setFont('helvetica', 'normal');
  
  const spacing = [12, 10, 8, 7];
  return currentY + (spacing[level - 1] || 7);
}

function renderListItem(marker: string, text: string, doc: jsPDF, margin: number, maxWidth: number, pageHeight: number, currentY: number): number {
  const listIndent = 10;
  
  // Render marker
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(marker, margin, currentY);
  
  // Render formatted text with proper offset
  const savedCurrentY = currentY;
  currentY = renderFormattedTextWithOffset(text, doc, margin + listIndent, maxWidth - listIndent, pageHeight, currentY, 11);
  
  return currentY;
}

function renderFormattedTextWithOffset(text: string, doc: jsPDF, xOffset: number, maxWidth: number, pageHeight: number, currentY: number, fontSize: number): number {
  // Split text into segments based on formatting
  const segments = parseInlineFormatting(text);
  let currentX = xOffset;
  const lines: Array<Array<{text: string, bold: boolean, italic: boolean, code: boolean, x: number}>> = [[]];
  let currentLineWidth = 0;
  
  doc.setFontSize(fontSize);
  
  // Group segments into lines that fit within maxWidth
  segments.forEach(segment => {
    // Set font to measure width correctly
    if (segment.code) {
      doc.setFont('courier', 'normal');
      doc.setFontSize(fontSize - 1);
    } else {
      const fontStyle = segment.bold && segment.italic ? 'bolditalic' : 
                       segment.bold ? 'bold' : 
                       segment.italic ? 'italic' : 'normal';
      doc.setFont('helvetica', fontStyle);
      doc.setFontSize(fontSize);
    }
    
    // Split words and handle URLs specially
    const words = segment.text.split(' ');
    
    words.forEach((word, wordIndex) => {
      let wordWithSpace = wordIndex < words.length - 1 ? word + ' ' : word;
      let wordWidth = doc.getTextWidth(wordWithSpace);
      
      // Check if word needs to be broken (URLs, long words)
      if (wordWidth > maxWidth) {
        // Break long words or URLs
        const chars = wordWithSpace.split('');
        let currentWord = '';
        
        for (let i = 0; i < chars.length; i++) {
          const testWord = currentWord + chars[i];
          const testWidth = doc.getTextWidth(testWord);
          
          if (testWidth > maxWidth && currentWord.length > 0) {
            // Add the current portion
            if (currentLineWidth + doc.getTextWidth(currentWord) > maxWidth && currentLineWidth > 0) {
              lines.push([]);
              currentLineWidth = 0;
              currentX = xOffset;
            }
            
            lines[lines.length - 1].push({
              text: currentWord,
              bold: segment.bold,
              italic: segment.italic,
              code: segment.code,
              x: currentX
            });
            
            const width = doc.getTextWidth(currentWord);
            currentLineWidth += width;
            currentX += width;
            
            // Start new line
            lines.push([]);
            currentLineWidth = 0;
            currentX = xOffset;
            currentWord = chars[i];
          } else {
            currentWord += chars[i];
          }
        }
        
        // Add remaining part
        if (currentWord) {
          wordWithSpace = currentWord;
          wordWidth = doc.getTextWidth(wordWithSpace);
        }
      }
      
      // Normal word processing
      if (currentLineWidth + wordWidth > maxWidth && currentLineWidth > 0) {
        lines.push([]);
        currentLineWidth = 0;
        currentX = xOffset;
      }
      
      if (wordWithSpace.trim()) {
        lines[lines.length - 1].push({
          text: wordWithSpace,
          bold: segment.bold,
          italic: segment.italic,
          code: segment.code,
          x: currentX
        });
        currentLineWidth += wordWidth;
        currentX += wordWidth;
      }
    });
  });
  
  // Render each line
  lines.forEach(line => {
    if (currentY > pageHeight - 20) {
      doc.addPage();
      currentY = 20;
    }
    
    line.forEach(segment => {
      // Set font style
      if (segment.code) {
        doc.setFont('courier', 'normal');
        doc.setFontSize(fontSize - 1);
        doc.setFillColor(245, 245, 245);
        const textWidth = doc.getTextWidth(segment.text);
        doc.rect(segment.x - 1, currentY - 4, textWidth + 2, 6, 'F');
        doc.setTextColor(219, 39, 119); // Pink color for code
      } else {
        const fontStyle = segment.bold && segment.italic ? 'bolditalic' : 
                         segment.bold ? 'bold' : 
                         segment.italic ? 'italic' : 'normal';
        doc.setFont('helvetica', fontStyle);
        doc.setFontSize(fontSize);
        doc.setTextColor(0, 0, 0);
      }
      
      // Render text
      doc.text(segment.text, segment.x, currentY);
      
      // Reset font for code
      if (segment.code) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(fontSize);
        doc.setTextColor(0, 0, 0);
      }
    });
    
    currentY += 6;
  });
  
  return currentY;
}

function renderFormattedText(text: string, doc: jsPDF, margin: number, maxWidth: number, pageHeight: number, currentY: number, fontSize: number): number {
  return renderFormattedTextWithOffset(text, doc, margin, maxWidth, pageHeight, currentY, fontSize);
}

function parseInlineFormatting(text: string): Array<{text: string, bold: boolean, italic: boolean, code: boolean}> {
  const segments: Array<{text: string, bold: boolean, italic: boolean, code: boolean}> = [];
  
  // First, handle markdown links [text](url)
  const processedText = text;
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  let lastIndex = 0;
  let tempSegments: Array<{text: string, start: number, end: number}> = [];
  
  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tempSegments.push({ text: text.substring(lastIndex, match.index), start: lastIndex, end: match.index });
    }
    // Add link text and URL separately
    tempSegments.push({ text: match[1] + ' (', start: match.index, end: match.index + match[1].length + 2 });
    tempSegments.push({ text: match[2] + ')', start: match.index + match[1].length + 2, end: match.index + match[0].length });
    lastIndex = match.index + match[0].length;
  }
  
  if (lastIndex < text.length) {
    tempSegments.push({ text: text.substring(lastIndex), start: lastIndex, end: text.length });
  }
  
  // If no links found, process the whole text
  if (tempSegments.length === 0) {
    tempSegments = [{ text: text, start: 0, end: text.length }];
  }
  
  // Now process each segment for other formatting
  tempSegments.forEach(segment => {
    const segmentText = segment.text;
    let currentText = '';
    let i = 0;
    
    while (i < segmentText.length) {
      // Check for code blocks first (highest priority)
      if (segmentText[i] === '`') {
        // Save any accumulated text
        if (currentText) {
          segments.push({ text: currentText, bold: false, italic: false, code: false });
          currentText = '';
        }
        
        // Find closing backtick
        let j = i + 1;
        while (j < segmentText.length && segmentText[j] !== '`') j++;
        
        if (j < segmentText.length) {
          segments.push({ text: segmentText.substring(i + 1, j), bold: false, italic: false, code: true });
          i = j + 1;
        } else {
          currentText += segmentText[i];
          i++;
        }
      }
      // Check for bold (**text**)
      else if (segmentText[i] === '*' && segmentText[i + 1] === '*') {
        // Save any accumulated text
        if (currentText) {
          segments.push({ text: currentText, bold: false, italic: false, code: false });
          currentText = '';
        }
        
        // Find closing **
        let j = i + 2;
        while (j < segmentText.length - 1) {
          if (segmentText[j] === '*' && segmentText[j + 1] === '*') {
            segments.push({ text: segmentText.substring(i + 2, j), bold: true, italic: false, code: false });
            i = j + 2;
            break;
          }
          j++;
        }
        
        if (j >= segmentText.length - 1) {
          currentText += segmentText[i];
          i++;
        }
      }
      // Check for italic (*text*)
      else if (segmentText[i] === '*' && (i === 0 || segmentText[i - 1] !== '*') && (i === segmentText.length - 1 || segmentText[i + 1] !== '*')) {
        // Save any accumulated text
        if (currentText) {
          segments.push({ text: currentText, bold: false, italic: false, code: false });
          currentText = '';
        }
        
        // Find closing *
        let j = i + 1;
        while (j < segmentText.length && segmentText[j] !== '*') j++;
        
        if (j < segmentText.length && (j === segmentText.length - 1 || segmentText[j + 1] !== '*')) {
          segments.push({ text: segmentText.substring(i + 1, j), bold: false, italic: true, code: false });
          i = j + 1;
        } else {
          currentText += segmentText[i];
          i++;
        }
      }
      else {
        currentText += segmentText[i];
        i++;
      }
    }
    
    // Add any remaining text
    if (currentText) {
      segments.push({ text: currentText, bold: false, italic: false, code: false });
    }
  });
  
  return segments.length > 0 ? segments : [{text, bold: false, italic: false, code: false}];
}