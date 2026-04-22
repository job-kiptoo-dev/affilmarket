import { betterAuth }      from "better-auth";
import { drizzleAdapter }  from "better-auth/adapters/drizzle";
import { nextCookies }     from "better-auth/next-js";
import { db }              from "./db";
import { users, sessions, accounts, verifications } from "@/drizzle/schema";
import { Resend }          from "resend";

const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey && process.env.NODE_ENV === "production") {
  console.warn("⚠️  RESEND_API_KEY is not defined.");
}

const resend = new Resend(resendApiKey);

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
    expiresIn:   60 * 60 * 24 * 30,
    updateAge:   60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },

  emailAndPassword: {
    enabled:                  true,
    autoSignIn:               false,
    minPasswordLength:        8,
    maxPasswordLength:        20,
    requireEmailVerification: true,

    onExistingUserSignUp: async (
      { user }: { user: { email: string; name: string } },
    ) => {
      await resend.emails.send({
        from:    "Acme <onboarding@resend.dev>",
        to:      user.email,
        subject: "Sign-up attempt with your email",
        text:    "Someone tried to create an account using your email address. If this was you, try signing in instead. If not, you can safely ignore this email.",
      });
    },

    emailVerification: {
      sendVerificationEmail: async (
        { user, url }: { user: { email: string }; url: string; token: string },
      ) => {
        await resend.emails.send({
          from:    "Acme <onboarding@resend.dev>",
          to:      user.email,
          subject: "Verify your email address",
          text:    `Click the link to verify your email: ${url}`,
        });
      },
    },

    sendResetPassword: async (
      { user, url }: { user: { email: string }; url: string; token: string },
    ) => {
      await resend.emails.send({
        from:    "Acme <onboarding@resend.dev>",
        to:      user.email,
        subject: "Reset your password",
        html:    `Click the link to reset your password: ${url}`,
      });
    },
  },

  user: {
    additionalFields: {
      role:   { type: "string", required: true,  input: true  },
      phone:  { type: "string", required: false, input: true  },
      status: { type: "string", required: false, defaultValue: "pending_verification", input: false },
    },
  },

  plugins: [nextCookies()],
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
