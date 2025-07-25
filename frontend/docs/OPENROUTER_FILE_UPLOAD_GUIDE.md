# OpenRouter File Upload Integration Guide

## Overview

OpenRouter supports multimodal input, allowing users to upload files (images, PDFs) that can be processed and understood by AI models. This guide covers how to integrate file upload functionality into the LiveConvo application.

## Supported File Types

### Currently Supported
- **Images**: JPEG, PNG, GIF, WebP
  - Can be sent as URLs or base64 encoded data
  - Supported via `image_url` content type
- **PDF Files**: 
  - Must be base64 encoded
  - Supported via `file` content type
  - Multiple PDF parsing engines available

### Input Formats
1. **Direct URL**: For publicly accessible images
2. **Base64 Data URL**: For local files (images and PDFs)

## API Implementation

### 1. Image Upload

#### Via URL
```typescript
const messages = [
  {
    role: "user",
    content: [
      {
        type: "text",
        text: "What's in this image?"
      },
      {
        type: "image_url",
        image_url: {
          url: "https://example.com/image.jpg"
        }
      }
    ]
  }
];
```

#### Via Base64
```typescript
function encodeImageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Usage
const base64Image = await encodeImageToBase64(imageFile);
const messages = [
  {
    role: "user",
    content: [
      {
        type: "text",
        text: "Analyze this image"
      },
      {
        type: "image_url",
        image_url: {
          url: base64Image // data:image/jpeg;base64,...
        }
      }
    ]
  }
];
```

### 2. PDF Upload

```typescript
function encodePDFToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(`data:application/pdf;base64,${base64}`);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Usage
const base64PDF = await encodePDFToBase64(pdfFile);
const messages = [
  {
    role: "user",
    content: [
      {
        type: "text",
        text: "Summarize this document"
      },
      {
        type: "file",
        file: {
          filename: "document.pdf",
          file_data: base64PDF
        }
      }
    ]
  }
];
```

### 3. PDF Processing Options

OpenRouter offers different PDF parsing engines:

```typescript
const payload = {
  model: "anthropic/claude-3.5-sonnet",
  messages: messages,
  plugins: [
    {
      id: "file-parser",
      pdf: {
        engine: "pdf-text" // Options: "pdf-text", "mistral-ocr", "native"
      }
    }
  ]
};
```

#### Engine Options:
- **pdf-text**: Basic text extraction
- **mistral-ocr**: OCR-based extraction (better for scanned documents)
- **native**: Provider's native implementation

## Cost Optimization: PDF Annotations

For subsequent requests about the same PDF, you can reuse annotations to avoid re-parsing:

```typescript
// First request returns annotations
const response = await fetch('/api/chat-guidance', {
  method: 'POST',
  body: JSON.stringify({ messages, sessionId })
});

const annotations = response.choices[0].message.annotations;

// Subsequent requests include annotations
const followUpMessages = [
  ...previousMessages,
  {
    role: "assistant",
    content: "The document contains...",
    annotations: annotations // Reuse without re-parsing
  },
  {
    role: "user",
    content: "Tell me more about section 2"
  }
];
```

## Integration Architecture

### 1. Frontend Component Structure
```
components/
├── meeting/
│   ├── file-upload/
│   │   ├── FileUploadButton.tsx
│   │   ├── FilePreview.tsx
│   │   └── FileManager.tsx
│   └── ai-advisor/
│       └── EnhancedAIChat.tsx (modified)
```

### 2. State Management
```typescript
interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl?: string;
  annotations?: any; // For PDF reuse
}

interface MeetingContext {
  // ... existing fields
  fileAttachments: FileAttachment[];
  addFileAttachment: (file: FileAttachment) => void;
  removeFileAttachment: (id: string) => void;
}
```

### 3. API Endpoint Modifications

Update `/api/chat-guidance/route.ts`:
```typescript
interface ChatRequest {
  // ... existing fields
  fileAttachments?: Array<{
    type: 'image' | 'pdf';
    dataUrl: string;
    filename?: string;
  }>;
}

// Build messages with files
const buildMessagesWithFiles = (
  userMessage: string,
  fileAttachments: FileAttachment[]
) => {
  const content: any[] = [
    { type: "text", text: userMessage }
  ];

  fileAttachments.forEach(file => {
    if (file.type.startsWith('image/')) {
      content.push({
        type: "image_url",
        image_url: { url: file.dataUrl }
      });
    } else if (file.type === 'application/pdf') {
      content.push({
        type: "file",
        file: {
          filename: file.name,
          file_data: file.dataUrl
        }
      });
    }
  });

  return { role: "user", content };
};
```

## Model Compatibility

Not all models support file inputs. Check model capabilities:

```typescript
// Models with image support
const imageModels = [
  'anthropic/claude-3.5-sonnet',
  'anthropic/claude-3-opus',
  'openai/gpt-4-vision-preview',
  'google/gemini-pro-vision'
];

// Models with PDF support (via file-parser plugin)
const pdfModels = [
  'anthropic/claude-3.5-sonnet',
  'anthropic/claude-3-opus',
  'openai/gpt-4-turbo-preview',
  'google/gemini-2.0-flash',
  'google/gemini-2.0-flash-lite',
  'google/gemini-2.5-flash'  // Currently used in LiveConvo
];
```

## Best Practices

1. **File Size Limits**
   - Images: Recommend < 20MB
   - PDFs: Recommend < 50MB
   - Base64 encoding increases size by ~33%

2. **Validation**
   ```typescript
   const validateFile = (file: File) => {
     const maxSize = file.type.startsWith('image/') ? 20 : 50; // MB
     if (file.size > maxSize * 1024 * 1024) {
       throw new Error(`File too large. Max size: ${maxSize}MB`);
     }
     
     const allowedTypes = [
       'image/jpeg', 'image/png', 'image/gif', 'image/webp',
       'application/pdf'
     ];
     
     if (!allowedTypes.includes(file.type)) {
       throw new Error('Unsupported file type');
     }
   };
   ```

3. **User Experience**
   - Show upload progress
   - Display file previews
   - Allow file removal
   - Indicate which models support files

4. **Cost Considerations**
   - File processing incurs additional tokens
   - PDF parsing can be expensive
   - Reuse annotations when possible

## Security Considerations

1. **Client-side validation**: Always validate file types and sizes
2. **Server-side validation**: Re-validate on the backend
3. **Content filtering**: Consider scanning for inappropriate content
4. **Data privacy**: Files are processed by third-party AI providers

## Implementation Roadmap

1. **Phase 1**: Basic image upload
   - File selection UI
   - Base64 encoding
   - Integration with chat API

2. **Phase 2**: PDF support
   - PDF preview
   - Parser engine selection
   - Annotation caching

3. **Phase 3**: Enhanced features
   - Multi-file support
   - Drag-and-drop interface
   - File management UI
   - Progress indicators

## Example Usage Flow

1. User clicks "Attach File" button
2. Selects image or PDF
3. File is validated and encoded
4. Preview shown in chat interface
5. User types message referencing the file
6. AI processes both text and file content
7. Response includes file analysis

## Error Handling

```typescript
try {
  const encoded = await encodeFileToBase64(file);
  // Process file
} catch (error) {
  if (error.message.includes('too large')) {
    toast.error('File is too large. Please choose a smaller file.');
  } else if (error.message.includes('Unsupported')) {
    toast.error('This file type is not supported.');
  } else {
    toast.error('Failed to process file. Please try again.');
  }
}
```

## Testing Checklist

- [ ] Image upload (JPEG, PNG)
- [ ] PDF upload
- [ ] Large file rejection
- [ ] Unsupported file type rejection
- [ ] Multiple file attachments
- [ ] File removal
- [ ] Model compatibility warnings
- [ ] Annotation reuse for PDFs
- [ ] Error handling
- [ ] Mobile responsiveness

## Future Enhancements

1. **Additional file types**: Word docs, spreadsheets
2. **OCR integration**: For scanned documents
3. **File compression**: Automatic optimization
4. **Cloud storage**: For large files
5. **Batch processing**: Multiple files in one request

## References

- [OpenRouter Images and PDFs Documentation](https://openrouter.ai/docs/features/images-and-pdfs)
- [OpenRouter API Reference](https://openrouter.ai/docs/api-reference/overview)
- [Model Capabilities](https://openrouter.ai/models)