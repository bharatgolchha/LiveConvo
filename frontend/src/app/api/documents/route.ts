import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { parse as csvParse } from 'csv-parse/sync';

/**
 * POST /api/documents - Upload documents for a session
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const sessionId = formData.get('session_id') as string;
    const files = formData.getAll('files') as File[];
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing session_id', message: 'Session ID is required' },
        { status: 400 }
      );
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided', message: 'At least one file is required' },
        { status: 400 }
      );
    }

    // Get current user from Supabase auth
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to upload documents' },
        { status: 401 }
      );
    }

    // Get user's current organization
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('current_organization_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.current_organization_id) {
      return NextResponse.json(
        { error: 'Setup required', message: 'Please complete onboarding first' },
        { status: 400 }
      );
    }

    // Verify session belongs to user's organization
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, organization_id')
      .eq('id', sessionId)
      .eq('organization_id', userData.current_organization_id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found', message: 'Session does not exist or access denied' },
        { status: 404 }
      );
    }

    const uploadedDocuments = [];
    const errors = [];

    // Validate and process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        // Validate file
        const validation = validateFile(file);
        if (!validation.valid) {
          errors.push(`${file.name}: ${validation.error}`);
          continue;
        }

        // Read file content for text extraction
        const fileBuffer = await file.arrayBuffer();
        console.log(`📄 Processing file: ${file.name} (${file.type}, ${file.size} bytes)`);
        
        const extractedText = await extractTextFromFile(file, fileBuffer);
        console.log(`✨ Extracted text length: ${extractedText.length} characters for ${file.name}`);
        console.log(`📝 Text preview (first 300 chars): ${extractedText.substring(0, 300)}...`);
        
        // Log extraction success/failure
        if (extractedText.startsWith('[') && extractedText.includes('extraction')) {
          console.log(`⚠️ Text extraction placeholder for ${file.name}: ${extractedText}`);
        } else {
          console.log(`✅ Successfully extracted text from ${file.name}`);
        }

        // Store document in database
        const { data: document, error: docError } = await supabase
          .from('documents')
          .insert({
            session_id: sessionId,
            user_id: user.id,
            organization_id: userData.current_organization_id,
            original_filename: file.name,
            file_type: getFileType(file),
            file_size_bytes: file.size,
            extracted_text: extractedText,
            processing_status: 'completed',
            // Note: file_url would be set after uploading to cloud storage
          })
          .select()
          .single();

        if (docError) {
          errors.push(`${file.name}: Failed to save document metadata`);
          continue;
        }

        uploadedDocuments.push(document);

      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        errors.push(`${file.name}: Processing failed`);
      }
    }

    return NextResponse.json({
      documents: uploadedDocuments,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully uploaded ${uploadedDocuments.length} document(s)${errors.length > 0 ? ` with ${errors.length} error(s)` : ''}`
    }, { status: 201 });

  } catch (error) {
    console.error('Documents upload API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to upload documents' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/documents - Get documents for a session
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing session_id', message: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Get current user from Supabase auth
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to view documents' },
        { status: 401 }
      );
    }

    // Get user's current organization
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('current_organization_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.current_organization_id) {
      return NextResponse.json(
        { error: 'Setup required', message: 'Please complete onboarding first' },
        { status: 400 }
      );
    }

    // Get documents for the session
    const { data: documents, error } = await supabase
      .from('documents')
      .select('*')
      .eq('session_id', sessionId)
      .eq('organization_id', userData.current_organization_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Database error', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ documents: documents || [] });

  } catch (error) {
    console.error('Documents get API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

// Helper Functions

function validateFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = [
    'text/plain',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/csv',
    'application/json',
    'image/png',
    'image/jpeg',
    'image/jpg'
  ];

  if (file.size > maxSize) {
    return { valid: false, error: 'File size exceeds 10MB limit' };
  }

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'File type not supported' };
  }

  return { valid: true };
}

function getFileType(file: File): string {
  const extension = file.name.split('.').pop()?.toLowerCase();
  return extension || 'unknown';
}

async function extractTextFromFile(file: File, buffer: ArrayBuffer): Promise<string> {
  try {
    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();
    
    // Handle text files
    if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
      return new TextDecoder().decode(buffer);
    }
    
    // Handle JSON files
    if (fileType === 'application/json' || fileName.endsWith('.json')) {
      try {
        const text = new TextDecoder().decode(buffer);
        const json = JSON.parse(text);
        return JSON.stringify(json, null, 2);
      } catch {
        return new TextDecoder().decode(buffer);
      }
    }
    
    // Handle CSV files
    if (fileType === 'text/csv' || fileName.endsWith('.csv')) {
      try {
        const text = new TextDecoder().decode(buffer);
        const records = csvParse(text, { 
          columns: true, 
          skip_empty_lines: true,
          delimiter: ','
        });
        
        // Convert CSV to readable text format
        if (records.length > 0) {
          const headers = Object.keys(records[0]);
          let output = `CSV Data (${records.length} rows):\n\n`;
          
          // Add headers
          output += headers.join(' | ') + '\n';
          output += '-'.repeat(headers.join(' | ').length) + '\n';
          
          // Add data rows (limit to first 50 rows for readability)
          const rowsToShow = Math.min(records.length, 50);
          for (let i = 0; i < rowsToShow; i++) {
            const row = records[i];
            output += headers.map(header => row[header] || '').join(' | ') + '\n';
          }
          
          if (records.length > 50) {
            output += `\n... and ${records.length - 50} more rows`;
          }
          
          return output;
        }
        
        return text; // Fallback to raw text
      } catch (error) {
        console.error('CSV parsing error:', error);
        return new TextDecoder().decode(buffer);
      }
    }
    
    // Handle PDF files
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      try {
        const data = await pdfParse(Buffer.from(buffer));
        return data.text || '[PDF contains no extractable text]';
      } catch (error) {
        console.error('PDF parsing error:', error);
        return '[Failed to extract text from PDF - file may be corrupted or protected]';
      }
    }
    
    // Handle DOCX files
    if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
        fileName.endsWith('.docx')) {
      try {
        const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
        return result.value || '[Document contains no extractable text]';
      } catch (error) {
        console.error('DOCX parsing error:', error);
        return '[Failed to extract text from DOCX - file may be corrupted]';
      }
    }
    
    // Handle legacy DOC files (limited support)
    if (fileType === 'application/msword' || fileName.endsWith('.doc')) {
      // Note: mammoth has limited support for .doc files
      try {
        const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
        if (result.value && result.value.trim()) {
          return result.value;
        } else {
          return '[Legacy .doc format - text extraction limited. Please convert to .docx for better results]';
        }
      } catch (error) {
        console.error('DOC parsing error:', error);
        return '[Failed to extract text from DOC - please convert to .docx format]';
      }
    }
    
    // Handle image files (placeholder for OCR)
    if (fileType.startsWith('image/') || 
        fileName.endsWith('.png') || 
        fileName.endsWith('.jpg') || 
        fileName.endsWith('.jpeg')) {
      return '[Image file - OCR text extraction coming soon. Upload text documents for immediate processing.]';
    }
    
    // Fallback for unknown file types
    return `[Text extraction not yet supported for ${fileType || 'this file type'}. Supported formats: TXT, PDF, DOCX, CSV, JSON]`;
    
  } catch (error) {
    console.error('Text extraction error for file:', file.name, error);
    return `[Text extraction failed for ${file.name}]`;
  }
} 