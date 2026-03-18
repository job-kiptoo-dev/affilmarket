// import { createAuthClient } from "better-auth/react"
// export const authClient = createAuthClient({
//     /** The base URL of the server (optional if you're using the same domain) */
//     baseURL: "http://localhost:3000"
// })

// import { createAuthClient } from 'better-auth/react';
//
// export const authClient = createAuthClient({
//   baseURL: process.env.NEXT_PUBLIC_APP_URL!,
// });
//
//
// export const { signIn, signOut, signUp, useSession } = authClient;

import { createAuthClient } from "better-auth/react";
import { nextCookies } from "better-auth/next-js";

export const { signIn, signUp, signOut, useSession, getSession } =
  createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_APP_URL!,
    plugins: [nextCookies()],
  });
