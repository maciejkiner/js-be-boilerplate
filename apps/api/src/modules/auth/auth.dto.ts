import { z } from "zod";

export const CredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  roles: z.array(z.string()),
  isActive: z.boolean(),
});

export const AuthResponseSchema = z.object({
  user: UserSchema,
});

export const PasswordResetRequestSchema = z.object({
  email: z.string().email(),
});

export const PasswordResetConfirmSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(200),
});

export const MessageSchema = z.object({
  message: z.string(),
});

export type Credentials = z.infer<typeof CredentialsSchema>;
export type PublicUser = z.infer<typeof UserSchema>;
