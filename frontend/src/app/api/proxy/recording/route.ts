import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get('url');
    
    if (!url) {
      return NextResponse.json(
        { error: 'Missing URL parameter' },
        { status: 400 }
      );
    }

    // Decode the URL in case it was encoded
    const decodedUrl = decodeURIComponent(url);
    
    console.log('📹 Proxying recording from:', decodedUrl.substring(0, 100) + '...');

    // Fetch the video from S3
    const response = await fetch(decodedUrl);
    
    if (!response.ok) {
      console.error('Failed to fetch recording:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'Failed to fetch recording' },
        { status: response.status }
      );
    }

    // Get the content type and ensure it's set
    const contentType = response.headers.get('content-type') || 'video/mp4';
    const contentLength = response.headers.get('content-length');
    
    console.log('📹 Proxying video:', {
      contentType,
      contentLength,
      status: response.status
    });

    // Stream the response back with proper headers
    const headers = new Headers({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      'Accept-Ranges': 'bytes', // Support range requests for video seeking
    });
    
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    // Support range requests for video streaming
    const range = request.headers.get('range');
    if (range && contentLength) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : parseInt(contentLength) - 1;
      const chunksize = (end - start) + 1;
      
      headers.set('Content-Range', `bytes ${start}-${end}/${contentLength}`);
      headers.set('Accept-Ranges', 'bytes');
      headers.set('Content-Length', String(chunksize));
      
      return new NextResponse(response.body, {
        status: 206,
        headers
      });
    }

    return new NextResponse(response.body, {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}