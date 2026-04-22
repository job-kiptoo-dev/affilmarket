import ForgotPassword from "@/components/auth/forgot-password";


export default function page() {
  return (
    <ForgotPassword/>
  )
}



// "use client";
//
// import { useState } from "react";
// import { resetPassword } from "@/lib/auth/client";
// import { useRouter, useSearchParams } from "next/navigation";
// import { Suspense } from "react"; // Needed for useSearchParams in Next.js
//
// function ResetPasswordForm() {
//   const [password, setPassword] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");
//   const router = useRouter();
//   const searchParams = useSearchParams();
//
//   // Better Auth usually puts the token in a query param named 'token'
//   const token = searchParams.get("token");
//
//   const handleReset = async (e: React.FormEvent) => {
//     e.preventDefault();
//
//     if (!token) {
//       setError("No reset token found. Please request a new link.");
//       return;
//     }
//
//     setLoading(true);
//     setError("");
//
//     try {
//       const { error } = await resetPassword({
//         newPassword: password,
//         token: token, // <--- Pass the token explicitly here
//       });
//
//       if (error) {
//         setError(error.message || "Failed to reset password.");
//       } else {
//         // alert("Password updated! Log in with your new password.");
//         router.push("/"); 
//       }
//     } catch (err) {
//       setError("An unexpected error occurred.");
//     } finally {
//       setLoading(false);
//     }
//   };
//
//   return (
//     <form onSubmit={handleReset} className="w-full max-w-sm border border-border p-6 bg-surface space-y-4">
//       <h1 className="font-display font-bold text-xl uppercase tracking-widest text-accent">New Password</h1>
//       {!token && <p className="text-danger font-mono text-[10px]">Warning: Reset token is missing from the URL.</p>}
//
//       <input
//         type="password"
//         placeholder="Enter new password"
//         value={password}
//         onChange={(e) => setPassword(e.target.value)}
//         className="w-full bg-bg border border-border px-3 py-2 text-text font-mono focus:border-accent outline-none"
//         required
//       />
//
//       {error && <p className="text-danger font-mono text-[10px] uppercase">{error}</p>}
//
//       <button
//         disabled={loading || !token}
//         className="w-full py-3 bg-accent text-bg font-display font-bold uppercase text-xs disabled:opacity-50"
//       >
//         {loading ? "Updating..." : "Update Password →"}
//       </button>
//     </form>
//   );
// }
//
// // Wrap in Suspense because useSearchParams requires it in Next.js App Router
// export default function ResetPasswordPage() {
//   return (
//     <div className="flex flex-col items-center justify-center min-h-screen bg-bg p-4">
//       <Suspense fallback={<p className="text-muted font-mono text-xs">Loading...</p>}>
//         <ResetPasswordForm />
//       </Suspense>
//     </div>
//   );
// }
//
