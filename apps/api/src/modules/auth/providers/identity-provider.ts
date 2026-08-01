/**
 * The modularity boundary in auth: the login method. Email + password is the first implementation;
 * social login and other providers are further implementations added in projects
 * (see docs/recipes/how-to-add-an-identity-provider.md).
 */
export interface IdentityResult {
  userId: string;
}

export interface IdentityProvider {
  /** A stable provider identifier, "password" for example. */
  readonly id: string;
  /** Verifies the credentials. Returns the userId, or null without revealing why. */
  verify(credentials: unknown): Promise<IdentityResult | null>;
}
