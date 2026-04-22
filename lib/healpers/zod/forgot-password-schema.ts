
import { z } from "zod";

export const ForgotPasswordSchema = z.object({
    email: z
    .string() // string type
    .email({message: "Invalid type"}) // checks if the input given by the user is email
    .min(1, {message: "Email is required"}), // checks if the email field is empty or not 
})

export const ResetPasswordSchema = z.object({
    password: z
    .string() // check if it is string type
    .min(8, { message: "Password must be at least 8 characters long" }) // checks for character length
    .max(20, { message: "Password must be at most 20 characters long" }),
  confirmPassword: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long" })
    .max(20, { message: "Password must be at most 20 characters long" }),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],

    // checks if the password and confirm password are equal
});
