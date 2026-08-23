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
    const result = await response.json();
    
    if (result.status === 'error') {
      throw new Error(result.message);
    }
    
    return result.data;
  } catch (error) {
    console.error(`API Error (${action}):`, error);
    throw error;
  }
}
