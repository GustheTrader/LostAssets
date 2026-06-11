export type TeamUser = {
  email: string;
  username: string;
  role: "user";
};

export const TEAM_USERS: TeamUser[] = [
  { email: "jeffgus@gmail.com", username: "jeffgus", role: "user" },
  { email: "pankajsewal@sbcglobal.net", username: "pankajsewal", role: "user" },
];

export const TEAM_PASSWORD = "101010";
export const TEAM_SESSION_KEY = "lostassets:team_user";

export function findAllowedTeamUser(identifier: string): TeamUser | undefined {
  const normalized = identifier.trim().toLowerCase();
  return TEAM_USERS.find((user) => user.email === normalized || user.username === normalized);
}

export function readStoredTeamUser(): TeamUser | undefined {
  try {
    const stored = localStorage.getItem(TEAM_SESSION_KEY);
    if (!stored) return undefined;
    const parsed = JSON.parse(stored) as Partial<TeamUser>;
    return parsed.username ? findAllowedTeamUser(parsed.username) : undefined;
  } catch {
    return undefined;
  }
}

export function storeTeamUser(user: TeamUser) {
  localStorage.setItem(TEAM_SESSION_KEY, JSON.stringify(user));
}

export function clearStoredTeamUser() {
  localStorage.removeItem(TEAM_SESSION_KEY);
}
