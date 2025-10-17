// Simple in-memory token store keyed by user/session id.
// For production replace with Redis or database persistence.

interface StoredToken {
  accessToken: string;
  createdAt: number;
  // Optionally add expiry if Fyers tokens include one
  // expiresAt?: number;
}

class TokenStore {
  private tokens = new Map<string, StoredToken>();

  set(id: string, accessToken: string) {
    this.tokens.set(id, { accessToken, createdAt: Date.now() });
  }

  get(id: string): string | null {
    const entry = this.tokens.get(id);
    return entry ? entry.accessToken : null;
  }

  delete(id: string) {
    this.tokens.delete(id);
  }

  clear() {
    this.tokens.clear();
  }
}

export const tokenStore = new TokenStore();