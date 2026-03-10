import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "PLAYER";
      username: string;
      name?: string | null;
    };
  }

  interface User {
    id: string;
    role: "ADMIN" | "PLAYER";
    username: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "ADMIN" | "PLAYER";
    username: string;
  }
}
