import { useEffect, useState, type ReactNode } from "react";
import { KeyRound, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import {
  TEAM_PASSWORD,
  TEAM_USERS,
  clearStoredTeamUser,
  findAllowedTeamUser,
  readStoredTeamUser,
  storeTeamUser,
  type TeamUser,
} from "../services/teamAuth";

type TeamAuthGateProps = {
  children: ReactNode;
};

export function TeamAuthGate({ children }: TeamAuthGateProps) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [teamUser, setTeamUser] = useState<TeamUser | undefined>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = readStoredTeamUser();
    if (storedUser) {
      setTeamUser(storedUser);
    }
  }, []);

  const handleSignIn = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const user = findAllowedTeamUser(identifier);
    if (!user) {
      setError("Choose an approved team username.");
      return;
    }

    if (password !== TEAM_PASSWORD) {
      setError("Password is incorrect.");
      return;
    }

    storeTeamUser(user);
    setTeamUser(user);
    setPassword("");
  };

  const handleSignOut = () => {
    clearStoredTeamUser();
    setTeamUser(undefined);
    setIdentifier("");
    setPassword("");
  };

  if (teamUser) {
    return (
      <>
        <div className="fixed right-4 top-4 z-50 flex items-center gap-2 rounded-lg border border-white/10 bg-neutral-950/70 px-3 py-2 text-xs text-neutral-200 shadow-2xl shadow-black/30 backdrop-blur-md">
          <ShieldCheck className="h-4 w-4 text-emerald-300" />
          <span className="hidden sm:inline">{teamUser.username}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-neutral-300 hover:text-white" onClick={handleSignOut} title="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
        {children}
      </>
    );
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_20%_10%,rgba(249,115,22,0.18),transparent_32%),radial-gradient(circle_at_85%_20%,rgba(16,185,129,0.14),transparent_30%),linear-gradient(135deg,#050505,#111111_55%,#050505)] text-neutral-100">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-10">
        <div className="grid w-full gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-orange-200 shadow-xl shadow-black/20 backdrop-blur">
              <KeyRound className="h-4 w-4" />
              Team Access
            </div>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-5xl font-semibold leading-tight text-white md:text-6xl">
                LostAssets private recovery workspace
              </h1>
              <p className="max-w-2xl text-base leading-7 text-neutral-300">
                Pick an approved username and enter the team password to access investigations, campaigns, claim packets, and database tools.
              </p>
            </div>
            <div className="grid max-w-2xl gap-3 sm:grid-cols-2">
              {TEAM_USERS.map((user) => (
                <button
                  key={user.username}
                  type="button"
                  onClick={() => setIdentifier(user.username)}
                  className={`rounded-lg border p-4 text-left shadow-xl shadow-black/20 backdrop-blur transition ${
                    identifier.toLowerCase() === user.username
                      ? "border-orange-300/60 bg-orange-500/15"
                      : "border-white/10 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.07]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-orange-500/15 text-orange-200">
                      <UserRound className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{user.username}</div>
                      <div className="text-xs text-neutral-400">{user.email}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSignIn} className="rounded-lg border border-white/10 bg-neutral-900/55 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl">
            <div className="space-y-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/10 text-orange-200">
                <KeyRound className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-semibold text-white">Sign in</h2>
              <p className="text-sm text-neutral-400">Use an approved username and the team password.</p>
            </div>

            <div className="mt-6 space-y-2">
              <Label htmlFor="team-identifier" className="text-neutral-200">Username</Label>
              <Input
                id="team-identifier"
                autoComplete="username"
                placeholder="jeffgus or pankajsewal"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                className="border-white/10 bg-black/30 text-white placeholder:text-neutral-500"
              />
            </div>

            <div className="mt-4 space-y-2">
              <Label htmlFor="team-password" className="text-neutral-200">Password</Label>
              <Input
                id="team-password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter team password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="border-white/10 bg-black/30 text-white placeholder:text-neutral-500"
              />
            </div>

            {error && (
              <Alert className="mt-4 border-red-500/30 bg-red-500/10 text-red-100">
                <AlertTitle>Sign-in blocked</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="mt-6 w-full">
              <KeyRound className="mr-2 h-4 w-4" />
              Unlock workspace
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
