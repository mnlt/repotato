import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { GITHUB_CLIENT_ID } from "./config.js";

const DIR = join(homedir(), ".repotato");
const FILE = join(DIR, "auth.json");

export interface AuthState {
  access_token: string;
  login: string;
  github_id: number;
  avatar_url: string;
}

export function loadAuth(): AuthState | null {
  try {
    return JSON.parse(readFileSync(FILE, "utf8")) as AuthState;
  } catch {
    return null;
  }
}

export function saveAuth(s: AuthState): void {
  mkdirSync(DIR, { recursive: true });
  writeFileSync(FILE, JSON.stringify(s, null, 2), { mode: 0o600 });
}

export function clearAuth(): void {
  try {
    rmSync(FILE);
  } catch {
    /* noop */
  }
}

interface DeviceCode {
  device_code: string;
  user_code: string;
  verification_uri: string;
  interval: number;
  expires_in: number;
  error?: string;
}

export interface AuthCallbacks {
  onCode: (userCode: string, url: string) => void;
  onSuccess: (s: AuthState) => void;
  onError: (msg: string) => void;
}

/**
 * GitHub OAuth device flow. No client secret needed (public client). Calls
 * onCode once the user code is ready, polls until authorized, then fetches the
 * identity and persists the token. Returns a cancel() handle.
 */
export function authenticate(cb: AuthCallbacks): { cancel: () => void } {
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const cancel = () => {
    cancelled = true;
    if (timer) clearTimeout(timer);
  };

  (async () => {
    if (!GITHUB_CLIENT_ID) {
      cb.onError("GitHub Client ID not configured (src/config.ts)");
      return;
    }
    try {
      const dcRes = await fetch("https://github.com/login/device/code", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ client_id: GITHUB_CLIENT_ID, scope: "public_repo" }),
      });
      const dc = (await dcRes.json()) as DeviceCode;
      if (!dcRes.ok || !dc.device_code) {
        cb.onError(dc.error || `device code request failed (${dcRes.status})`);
        return;
      }
      cb.onCode(dc.user_code, dc.verification_uri);

      let interval = (dc.interval || 5) * 1000;
      const poll = async () => {
        if (cancelled) return;
        try {
          const tRes = await fetch(
            "https://github.com/login/oauth/access_token",
            {
              method: "POST",
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                client_id: GITHUB_CLIENT_ID,
                device_code: dc.device_code,
                grant_type: "urn:ietf:params:oauth:grant-type:device_code",
              }),
            },
          );
          const t = (await tRes.json()) as {
            access_token?: string;
            error?: string;
          };
          if (cancelled) return;
          if (t.access_token) {
            const uRes = await fetch("https://api.github.com/user", {
              headers: {
                Authorization: `Bearer ${t.access_token}`,
                Accept: "application/vnd.github+json",
                "User-Agent": "repotato",
              },
            });
            const u = (await uRes.json()) as {
              id: number;
              login: string;
              avatar_url: string;
            };
            const state: AuthState = {
              access_token: t.access_token,
              login: u.login,
              github_id: u.id,
              avatar_url: u.avatar_url,
            };
            saveAuth(state);
            cb.onSuccess(state);
            return;
          }
          if (t.error === "slow_down") interval += 5000;
          else if (t.error && t.error !== "authorization_pending") {
            cb.onError(t.error);
            return;
          }
          timer = setTimeout(poll, interval);
        } catch (e) {
          cb.onError(String((e as Error).message || e));
        }
      };
      timer = setTimeout(poll, interval);
    } catch (e) {
      cb.onError(String((e as Error).message || e));
    }
  })();

  return { cancel };
}
