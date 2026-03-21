import { NextRequest } from 'next/server';
import { verifyToken } from './jwt';

export async function getUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return null;
  
  const decoded = await verifyToken(token);
  return decoded?.userId || null;
}

export async function getAuthUser(request: NextRequest): Promise<{ userId: string; email: string } | null> {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return null;
  
  return await verifyToken(token);
}
