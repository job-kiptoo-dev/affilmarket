import { auth } from "@/lib/utils/auth";
// import { auth } from "@/lib/utils/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { POST, GET } = toNextJsHandler(auth);
