import { betterAuth }         from "better-auth";
import { drizzleAdapter }     from "better-auth/adapters/drizzle";
import { nextCookies }        from "better-auth/next-js";
import { db }                 from "./db";
import { users, sessions, accounts, verifications, vendorProfiles, affiliateProfiles } from "@/drizzle/schema";
import { generateAffiliateToken } from "@/lib/utils";
import { Resend }             from "resend";
import { eq } from "drizzle-orm";

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

  // ✅ TOP-LEVEL — this is what was missing
  emailVerification: {
    sendOnSignUp:                true,
    autoSignInAfterVerification: false,
    sendVerificationEmail: async ({ user, url }) => {
      console.log("📧 Sending verification email to:", user.email);
      console.log("🔗 Verification URL:", url);

      const { data, error } = await resend.emails.send({
        from:    "Acme <onboarding@resend.dev>",
        to:      user.email,
        subject: "Verify your email address",
        text:    `Click the link to verify your email: ${url}`,
      });

      if (error) console.error("❌ Resend error:", error);
      else       console.log("✅ Verification email sent:", data?.id);
    },
  },

  emailAndPassword: {
    enabled:                  true,
    autoSignIn:               false,
    minPasswordLength:        8,
    maxPasswordLength:        150,
    requireEmailVerification: true,
    onExistingUserSignUp: async ({ user }) => {
      await resend.emails.send({
        from:    "Acme <onboarding@resend.dev>",
        to:      user.email,
        subject: "Sign-up attempt with your email",
        text:    "Someone tried to create an account using your email address. If this was you, try signing in instead. If not, you can safely ignore this email.",
      });
    },
    sendResetPassword: async ({ user, url }) => {
      await resend.emails.send({
        from:    "Acme <onboarding@resend.dev>",
        to:      user.email,
        subject: "Reset your password",
        html:    `Click the link to reset your password: ${url}`,
      });
    },
  },

  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const role = (user as any).role as string;
          if (role !== "ADMIN") return;

        // Auto-verify admin accounts — no email confirmation needed
        await db
          .update(users)
          .set({ emailVerified: true })
          .where(eq(users.id, user.id));

        console.log(`✅ Admin user ${user.id} auto-verified`);
      },
    },

      update: {
        after: async (user) => {
          if (!user.emailVerified) return;

          const role = (user as any).role as string;
          if (!role) return;

          const sideEffects: Promise<unknown>[] = [];

          if (role === "VENDOR" || role === "BOTH") {
            sideEffects.push(
              db.insert(vendorProfiles).values({
                id:       crypto.randomUUID(),
                userId:   user.id,
                shopName: `${user.name}'s Shop`,
              }).onConflictDoNothing()
            );
          }

          if (role === "AFFILIATE" || role === "BOTH") {
            sideEffects.push(
              db.insert(affiliateProfiles).values({
                id:             crypto.randomUUID(),
                userId:         user.id,
                fullName:       user.name,
                affiliateToken: generateAffiliateToken(),
              }).onConflictDoNothing()
            );
          }

          if (sideEffects.length) {
            await Promise.all(sideEffects);
            console.log(`✅ Profiles created for user ${user.id} (role: ${role})`);
          }
        },
      },
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
// import { betterAuth }      from "better-auth";
// import { drizzleAdapter }  from "better-auth/adapters/drizzle";
// import { nextCookies }     from "better-auth/next-js";
// import { db }              from "./db";
// import { users, sessions, accounts, verifications } from "@/drizzle/schema";
// import { Resend }          from "resend";
//
// const resendApiKey = process.env.RESEND_API_KEY;
//
// if (!resendApiKey && process.env.NODE_ENV === "production") {
//   console.warn("⚠️  RESEND_API_KEY is not defined.");
// }
//
// const resend = new Resend(resendApiKey);
//
// export const auth = betterAuth({
//   generateId: () => crypto.randomUUID(),
//
//   database: drizzleAdapter(db, {
//     provider: "pg",
//     schema: {
//       user:         users,
//       session:      sessions,
//       account:      accounts,
//       verification: verifications,
//     },
//   }),
//
//   session: {
//     expiresIn:   60 * 60 * 24 * 30,
//     updateAge:   60 * 60 * 24,
//     cookieCache: { enabled: true, maxAge: 60 * 5 },
//   },
//
//   emailAndPassword: {
//     enabled:                  true,
//     autoSignIn:               false,
//     minPasswordLength:        8,
//     maxPasswordLength:        20,
//     requireEmailVerification: true,
//
//     onExistingUserSignUp: async (
//       { user }: { user: { email: string; name: string } },
//     ) => {
//       await resend.emails.send({
//         from:    "Acme <onboarding@resend.dev>",
//         to:      user.email,
//         subject: "Sign-up attempt with your email",
//         text:    "Someone tried to create an account using your email address. If this was you, try signing in instead. If not, you can safely ignore this email.",
//       });
//     },
//
//     emailVerification: {
//       sendVerificationEmail: async (
//         { user, url }: { user: { email: string }; url: string; token: string },
//       ) => {
//         await resend.emails.send({
//           from:    "Acme <onboarding@resend.dev>",
//           to:      user.email,
//           subject: "Verify your email address",
//           text:    `Click the link to verify your email: ${url}`,
//         });
//       },
//     },
//
//     sendResetPassword: async (
//       { user, url }: { user: { email: string }; url: string; token: string },
//     ) => {
//       await resend.emails.send({
//         from:    "Acme <onboarding@resend.dev>",
//         to:      user.email,
//         subject: "Reset your password",
//         html:    `Click the link to reset your password: ${url}`,
//       });
//     },
//   },
//
//   user: {
//     additionalFields: {
//       role:   { type: "string", required: true,  input: true  },
//       phone:  { type: "string", required: false, input: true  },
//       status: { type: "string", required: false, defaultValue: "pending_verification", input: false },
//     },
//   },
//
//   plugins: [nextCookies()],
// });
// export type Session = typeof auth.$Infer.Session;



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
