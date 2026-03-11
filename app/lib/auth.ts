// app/lib/auth.ts

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
  isAdmin?: boolean;
  createdAt: string;
};

const AUTH_KEY = 'exspend_user';
const TOKEN_KEY = 'exspend_token';
export const USERS_KEY = 'exspend_users';
export const ADMIN_EMAIL = 'admin@exspend.com';

export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getIsAdmin(): boolean {
  const user = getCurrentUser();
  return user?.email === ADMIN_EMAIL || user?.isAdmin === true;
}

export function setCurrentUser(user: User, token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  localStorage.setItem(TOKEN_KEY, token);
}

// Logout — clear session
export function logout(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

// Call the API to register
export async function registerUser(name: string, email: string, phone: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Registration failed' };
    }
    setCurrentUser(data.user, data.token);
    return { success: true };
  } catch {
    return { success: false, error: 'Network error. Please try again.' };
  }
}

// Call the API to login
export async function loginUser(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Login failed' };
    }
    setCurrentUser(data.user, data.token);
    return { success: true };
  } catch {
    return { success: false, error: 'Network error. Please try again.' };
  }
}