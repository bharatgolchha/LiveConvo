import { Session } from '@supabase/supabase-js';

export class ServiceError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

export abstract class BaseService {
  protected baseUrl = '/api';

  protected async authenticatedFetch(
    url: string,
    session: Session | null,
    options: RequestInit = {}
  ): Promise<Response> {
    if (!session?.access_token) {
      throw new ServiceError('No authentication session available', 'AUTH_REQUIRED', 401);
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      ...options.headers,
    };

    try {
      const response = await fetch(`${this.baseUrl}${url}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }

        throw new ServiceError(
          errorData.message || `Request failed with status ${response.status}`,
          errorData.code || 'REQUEST_FAILED',
          response.status,
          errorData
        );
      }

      return response;
    } catch (error) {
      if (error instanceof ServiceError) {
        throw error;
      }
      
      if (error instanceof Error) {
        throw new ServiceError(
          `Network error: ${error.message}`,
          'NETWORK_ERROR',
          0,
          error
        );
      }
      
      throw new ServiceError(
        'An unknown error occurred',
        'UNKNOWN_ERROR',
        0,
        error
      );
    }
  }

  protected async handleResponse<T>(response: Response): Promise<T> {
    try {
      const data = await response.json();
      return data;
    } catch (error) {
      throw new ServiceError(
        'Failed to parse response',
        'PARSE_ERROR',
        response.status,
        error
      );
    }
  }
}