import { ENV } from '../config/env';

export async function fetchApi(action: string, method: string = 'GET', data?: any) {
  let url = `${ENV.API_BASE_URL}?action=${action}`;
  
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'text/plain;charset=utf-8', // GAS requires text/plain to avoid CORS preflight issues for simple POST
    },
  };

  if (method === 'POST' && data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(`Server error: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    let result: any;
    try {
      result = JSON.parse(text);
    } catch {
      throw new Error(`Invalid response from server (action: ${action})`);
    }
    
    if (result.status === 'error') {
      throw new Error(result.message || 'Unknown server error');
    }
    
    return result.data;
  } catch (error) {
    // Network errors (ERR_CONNECTION_CLOSED, Failed to fetch, etc.) - log concisely
    if (error instanceof TypeError) {
      console.warn(`[API] Network error (${action}): ${error.message}`);
    } else {
      console.error(`[API] Error (${action}):`, error instanceof Error ? error.message : error);
    }
    throw error;
  }
}
