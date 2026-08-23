import { UserProfile } from '../types';

// Web Crypto SHA-256 helper for client-side password hashing
async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password + salt),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(salt),
      iterations: 10000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt']
  );

  const exported = await crypto.subtle.exportKey('raw', derivedKey);
  const hashArray = Array.from(new Uint8Array(exported));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

interface StoredUserAccount {
  id: string;
  email: string;
  name: string;
  avatar: string;
  salt: string;
  passwordHash: string;
  createdAt: number;
}

const STORAGE_USERS_KEY = 'spinpick_registered_users_v2';
const STORAGE_CURRENT_SESSION_KEY = 'spinpick_active_session_v2';

export const authService = {
  // Get all registered users
  getStoredUsers(): StoredUserAccount[] {
    try {
      const data = localStorage.getItem(STORAGE_USERS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  // Get currently logged in user session
  getCurrentUser(): UserProfile | null {
    try {
      const session = localStorage.getItem(STORAGE_CURRENT_SESSION_KEY);
      if (!session) return null;
      return JSON.parse(session);
    } catch {
      return null;
    }
  },

  // Register new account
  async signUp(email: string, password: string, name: string): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim() || cleanEmail.split('@')[0];

    if (!cleanEmail || !password) {
      return { success: false, error: 'Email and password are required.' };
    }

    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    const users = this.getStoredUsers();
    if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: 'An account with this email already exists. Please log in.' };
    }

    const salt = crypto.randomUUID();
    const passwordHash = await hashPassword(password, salt);

    const initials = cleanName.slice(0, 2).toUpperCase();

    const newUser: StoredUserAccount = {
      id: 'usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      email: cleanEmail,
      name: cleanName,
      avatar: initials,
      salt,
      passwordHash,
      createdAt: Date.now(),
    };

    users.push(newUser);
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));

    const profile: UserProfile = {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      avatar: newUser.avatar,
      createdAt: newUser.createdAt,
    };

    localStorage.setItem(STORAGE_CURRENT_SESSION_KEY, JSON.stringify(profile));
    return { success: true, user: profile };
  },

  // Login existing account
  async login(email: string, password: string): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const users = this.getStoredUsers();
    const existing = users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!existing) {
      return { success: false, error: 'No account found with this email. Please check or sign up.' };
    }

    const testHash = await hashPassword(password, existing.salt);
    if (testHash !== existing.passwordHash) {
      return { success: false, error: 'Incorrect password. Please try again.' };
    }

    const profile: UserProfile = {
      id: existing.id,
      email: existing.email,
      name: existing.name,
      avatar: existing.avatar,
      createdAt: existing.createdAt,
    };

    localStorage.setItem(STORAGE_CURRENT_SESSION_KEY, JSON.stringify(profile));
    return { success: true, user: profile };
  },

  // Log out current user
  logout(): void {
    localStorage.removeItem(STORAGE_CURRENT_SESSION_KEY);
  },

  // Update profile name
  updateProfile(name: string): UserProfile | null {
    const current = this.getCurrentUser();
    if (!current) return null;

    current.name = name.trim();
    current.avatar = current.name.slice(0, 2).toUpperCase();
    localStorage.setItem(STORAGE_CURRENT_SESSION_KEY, JSON.stringify(current));

    const users = this.getStoredUsers();
    const idx = users.findIndex((u) => u.id === current.id);
    if (idx !== -1) {
      users[idx].name = current.name;
      users[idx].avatar = current.avatar;
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
    }

    return current;
  }
};
