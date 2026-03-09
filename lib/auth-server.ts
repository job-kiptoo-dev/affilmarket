/**
 * Server-only auth helpers.
 * Import from here ONLY in Server Components, Route Handlers, and middleware.
 * Never import in Client Components or shared utility files.
 */
import 'server-only';
import { cookies } from 'next/headers';
import { verifyAccessToken, type JWTPayload } from './auth';

export async function getAuthUser(): Promise<JWTPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get('access_token')?.value;
  if (!token) return null;
  return verifyAccessToken(token);
}
