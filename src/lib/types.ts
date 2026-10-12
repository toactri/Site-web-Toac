export type AccountRole = "member" | "admin";

export interface Account {
  username: string;
  passwordHash: string;
  name: string;
  role: AccountRole;
}
