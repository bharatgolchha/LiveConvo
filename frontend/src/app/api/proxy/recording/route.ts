import { NextRequest, NextResponse } from 'next/server';

export async function HEAD(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get('url');
    
    if (!url) {
      return NextResponse.json(
        { error: 'Missing URL parameter' },
        { status: 400 }
      );
    }

    // The URL is base64 encoded to avoid double-encoding issues
    let s3Url: string;
    try {
      s3Url = atob(url);
      console.log('📹 Successfully decoded base64 URL');
    } catch (e) {
      console.error('Failed to decode base64 URL:', e);
      return NextResponse.json(
        { error: 'Invalid URL encoding' },
        { status: 400 }
      );
    }
    
    console.log('📹 HEAD request to S3 URL:', s3Url.substring(0, 100) + '...');
    
    // Validate URL format
    try {
      new URL(s3Url);
    } catch (e) {
      console.error('Invalid S3 URL after decoding:', e);
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }
    
    // Fetch the video headers from S3
    const response = await fetch(s3Url, { method: 'HEAD' });
    
    if (!response.ok) {
      console.error(`HEAD request failed for URL: ${s3Url.substring(0, 100)}...`, {
        status: response.status,
        statusText: response.statusText
      });
      
      // Return specific error for expired URLs
      if (response.status === 403) {
        return NextResponse.json(
          { error: 'Recording URL has expired. Please refresh the recording.' },
          { status: 403 }
        );
      }
      
      return NextResponse.json(
        { error: `Failed to fetch recording: ${response.statusText}` },
        { status: response.status }
      );
    }

    // Get the content type and ensure it's set
    const contentType = response.headers.get('content-type') || 'video/mp4';
    const contentLength = response.headers.get('content-length');
    
    // Return headers
    const headers = new Headers({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
      'Accept-Ranges': 'bytes',
    });
    
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    return new NextResponse(null, {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('Proxy HEAD error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get('url');
    
    if (!url) {
      return NextResponse.json(
        { error: 'Missing URL parameter' },
        { status: 400 }
      );
    }

    // The URL is base64 encoded to avoid double-encoding issues
    let s3Url: string;
    try {
      s3Url = atob(url);
      console.log('📹 Successfully decoded base64 URL');
    } catch (e) {
      console.error('Failed to decode base64 URL:', e);
      return NextResponse.json(
        { error: 'Invalid URL encoding' },
        { status: 400 }
      );
    }
    
    console.log('📹 Proxying recording from:', s3Url.substring(0, 100) + '...');
    
    // Validate and log URL structure for debugging
    try {
      const urlObj = new URL(s3Url);
      console.log('S3 URL components:', {
        host: urlObj.host,
        pathname: urlObj.pathname,
        hasQueryParams: urlObj.search.length > 0,
        queryParamCount: urlObj.searchParams.toString().split('&').length
      });
    } catch (e) {
      console.error('Invalid URL format:', e);
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Fetch the video from S3
    const response = await fetch(s3Url);
    
    if (!response.ok) {
      console.error(`GET request failed for URL: ${s3Url.substring(0, 100)}...`, {
        status: response.status,
        statusText: response.statusText
      });
      
      // Return specific error for expired URLs
      if (response.status === 403) {
        return NextResponse.json(
          { error: 'Recording URL has expired. Please refresh the recording.' },
          { status: 403 }
        );
      }
      
      return NextResponse.json(
        { error: `Failed to fetch recording: ${response.statusText}` },
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
      console.log('📹 Range request:', range);
      // Make a new request with the range header to S3
      const rangeResponse = await fetch(s3Url, {
        headers: {
          'Range': range
        }
      });
      
      if (!rangeResponse.ok) {
        console.error('Range request failed:', rangeResponse.status, rangeResponse.statusText);
        return NextResponse.json(
          { error: 'Failed to fetch recording range' },
          { status: rangeResponse.status }
        );
      }
      
      // Copy relevant headers from the S3 response
      const contentRange = rangeResponse.headers.get('content-range');
      const rangeContentLength = rangeResponse.headers.get('content-length');
      
      if (contentRange) {
        headers.set('Content-Range', contentRange);
      }
      headers.set('Accept-Ranges', 'bytes');
      if (rangeContentLength) {
        headers.set('Content-Length', rangeContentLength);
      }
      
      return new NextResponse(rangeResponse.body, {
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