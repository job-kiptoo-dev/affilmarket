
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import { 
  users, 
  sessions, 
  accounts, 
  verifications 
} from "@/drizzle/schema";

export const auth = betterAuth({
  generateId: () => crypto.randomUUID(),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user:         users,
      session:      sessions,
      account:      accounts,
      verification: verifications,
    },
  }),
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
  },
  user: {
    additionalFields: {
      role:   { type: 'string', required: true,  input: true  },
      phone:  { type: 'string', required: false, input: true  },
      status: { type: 'string', required: false, defaultValue: 'pending_verification', input: false },
    },
  },
});

export type Session = typeof auth.$Infer.Session;



//
// import { betterAuth } from "better-auth";
// import { drizzleAdapter } from "better-auth/adapters/drizzle";
// import { db } from "./db";
// import { accounts, sessions, users, verifications } from "@/drizzle/schema";
// // import { } from "@/drizzle/schema";
//
// export const auth = betterAuth({
//   generateId: () => crypto.randomUUID(),
//   database: drizzleAdapter(db, {
//     provider: "pg",
//     schema: {
//       user:         users,
//       session:      sessions,
//       account:      accounts,
//       verification: verifications,
//     },
//   }),
//   session: {
//     expiresIn: 60 * 60 * 24 * 30,
//     updateAge: 60 * 60 * 24,
//     cookieCache: { enabled: true, maxAge: 60 * 5 },
//   },
//   emailAndPassword: {
//     enabled: true,
//     autoSignIn: false,
//   },
//   user: {
//     additionalFields: {
//       role:   { type: 'string', required: true,  input: true  },
//       phone:  { type: 'string', required: false, input: true  },
//       status: { type: 'string', required: false, defaultValue: 'pending_verification', input: false },
//     },
//   },
// });
//
// export type Session = typeof auth.$Infer.Session;


// import { betterAuth } from "better-auth";
// import { drizzleAdapter } from "better-auth/adapters/drizzle";
// import { db } from "./db";
// import * as schema from "@/drizzle/schema";
//
// export const auth = betterAuth({
//   generateId: () => crypto.randomUUID(),
//   database: drizzleAdapter(db, {
//     provider: "pg",
//     schema,
//     usePlural: true,
//   }),
//   session: {
//     expiresIn: 60 * 60 * 24 * 30,
//     updateAge: 60 * 60 * 24,
//     cookieCache: { enabled: true, maxAge: 60 * 5 },
//   },
//   emailAndPassword: {
//     enabled: true,
//     autoSignIn: false,
//   },
//   user: {
//     additionalFields: {
//       role:   { type: 'string', required: true,  input: true  },
//       phone:  { type: 'string', required: false, input: true  },
//       status: { type: 'string', required: false, defaultValue: 'pending_verification', input: false },
//     },
//   },
// });
//
// export type Session = typeof auth.$Infer.Session;
