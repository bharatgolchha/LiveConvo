import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { v4 as uuidv4 } from 'uuid';

const GUEST_COOKIE_NAME = 'guest_identity';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days
const JWT_SECRET = new TextEncoder().encode(
  process.env.GUEST_JWT_SECRET || 'guest-identity-secret-key-change-in-production'
);

export interface GuestIdentity {
  id: string;
  name: string;
  createdAt: string;
}

export async function createGuestToken(identity: GuestIdentity): Promise<string> {
  const token = await new SignJWT({ ...identity })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(JWT_SECRET);
  
  return token;
}

export async function verifyGuestToken(token: string): Promise<GuestIdentity | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as GuestIdentity;
  } catch (error) {
    console.error('Failed to verify guest token:', error);
    return null;
  }
}

export async function getGuestIdentity(): Promise<GuestIdentity | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(GUEST_COOKIE_NAME)?.value;
  
  if (!token) {
    return null;
  }
  
  return verifyGuestToken(token);
}

export async function setGuestIdentity(name: string): Promise<GuestIdentity> {
  const identity: GuestIdentity = {
    id: uuidv4(),
    name,
    createdAt: new Date().toISOString()
  };
  
  const token = await createGuestToken(identity);
  const cookieStore = await cookies();
  
  cookieStore.set(GUEST_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/'
  });
  
  return identity;
}

export async function clearGuestIdentity(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(GUEST_COOKIE_NAME);
}

export function generateGuestId(): string {
  return `guest_${uuidv4()}`;
}