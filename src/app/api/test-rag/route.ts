import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json({ error: 'No auth token provided' }, { status: 401 });
    }

    // Test 1: Check if we can authenticate
    const supabase = createAuthenticatedSupabaseClient(token);
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ 
        error: 'Auth failed', 
        details: userError?.message 
      }, { status: 401 });
    }

    // Test 2: Check if OPENAI_API_KEY exists
    const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
    
    // Test 3: Try to call the RAG search endpoint
    const host = request.headers.get('host');
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const searchUrl = `${protocol}://${host}/api/search/rag`;
    
    let searchTestResult = null;
    let searchError = null;
    
    try {
      const searchResponse = await fetch(searchUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: 'test query',
          type: 'hybrid',
          threshold: 0.3,
          limit: 5
        })
      });
      
      if (searchResponse.ok) {
        searchTestResult = await searchResponse.json();
      } else {
        searchError = {
          status: searchResponse.status,
          statusText: searchResponse.statusText,
          body: await searchResponse.text()
        };
      }
    } catch (e) {
      searchError = {
        name: e instanceof Error ? e.name : 'Unknown',
        message: e instanceof Error ? e.message : String(e)
      };
    }

    // Test 4: Check if RPC functions exist
    let rpcTestResult = null;
    try {
      // Just check if we can call the RPC without actually running it
      const { error: rpcError } = await supabase
        .rpc('hybrid_search_sessions', {
          query_embedding: new Array(1536).fill(0), // Dummy embedding
          query_text: 'test',
          match_threshold: 0.3,
          match_count: 1,
          target_user_id: user.id
        });
      
      if (rpcError) {
        rpcTestResult = { error: rpcError.message };
      } else {
        rpcTestResult = { success: true };
      }
    } catch (e) {
      rpcTestResult = { 
        error: e instanceof Error ? e.message : String(e) 
      };
    }

    return NextResponse.json({
      tests: {
        auth: {
          success: true,
          userId: user.id,
          email: user.email
        },
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          hasOpenAIKey,
          host,
          searchUrl
        },
        ragSearch: {
          success: !!searchTestResult && !searchError,
          result: searchTestResult,
          error: searchError
        },
        database: {
          rpcFunction: rpcTestResult
        }
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}