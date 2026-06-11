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

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseAuthConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const authClient: SupabaseClient | null = isSupabaseAuthConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function findAllowedTeamUser(identifier: string): TeamUser | undefined {
  const normalized = identifier.trim().toLowerCase();
  return TEAM_USERS.find((user) => user.email === normalized || user.username === normalized);
}

export function getSessionTeamUser(session: Session | null): TeamUser | undefined {
  const email = session?.user.email;
  return email ? findAllowedTeamUser(email) : undefined;
}
