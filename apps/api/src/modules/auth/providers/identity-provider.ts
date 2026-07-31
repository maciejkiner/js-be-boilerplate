/**
 * Granica modularności auth: metoda logowania. Email+hasło to pierwsza implementacja;
 * social login i inni providerzy to kolejne implementacje dokładane w projektach
 * (patrz docs/recipes/how-to-add-an-identity-provider.md).
 */
export interface IdentityResult {
  userId: string;
}

export interface IdentityProvider {
  /** Stabilny identyfikator providera, np. "password". */
  readonly id: string;
  /** Weryfikuje poświadczenia. Zwraca userId albo null (bez ujawniania powodu). */
  verify(credentials: unknown): Promise<IdentityResult | null>;
}
