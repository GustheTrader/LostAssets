import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";

export type TeamUser = {
  email: string;
  username: string;
  role: "user";
};

export const TEAM_USERS: TeamUser[] = [
  { email: "jeffgus@gmail.com", username: "jeffgus", role: "user" },
  { email: "pankajsewal@sbcglobal.net", username: "pankajsewal", role: "user" },
];

export type SupabaseAuthConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

const buildTimeSupabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const buildTimeSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export function createTeamAuthClient(config: SupabaseAuthConfig): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
}

export async function loadSupabaseAuthConfig(): Promise<SupabaseAuthConfig | null> {
  if (buildTimeSupabaseUrl && buildTimeSupabaseAnonKey) {
    return {
      supabaseUrl: buildTimeSupabaseUrl,
      supabaseAnonKey: buildTimeSupabaseAnonKey,
    };
  }

  try {
    const response = await fetch("/api/auth/config");
    if (!response.ok) return null;
    const data = await response.json();
    if (data?.supabaseUrl && data?.supabaseAnonKey) {
      return {
        supabaseUrl: data.supabaseUrl,
        supabaseAnonKey: data.supabaseAnonKey,
      };
    }
  } catch {
    return null;
  }

  return null;
}

export function findAllowedTeamUser(identifier: string): TeamUser | undefined {
  const normalized = identifier.trim().toLowerCase();
  return TEAM_USERS.find((user) => user.email === normalized || user.username === normalized);
}

export function getSessionTeamUser(session: Session | null): TeamUser | undefined {
  const email = session?.user.email;
  return email ? findAllowedTeamUser(email) : undefined;
}
