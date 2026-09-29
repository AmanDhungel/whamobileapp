import { z } from "zod";

// Transcribed from docs/mobile/07-forms-and-validation.md and the web components it
// cites (components/Auth/LoginPage.tsx, Signup.tsx, app/forgot-password, app/verify-code).
// Error copy is the website's, verbatim.

/** The regex the web EmailVerifyGate + backend send-verification-code use. */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const email = z
  .string()
  .trim()
  .min(1, "Email is required")
  .pipe(z.email("Please enter a valid email address."));

// Login — LoginPage.tsx:13-16
export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required"),
});
export type LoginValues = z.infer<typeof loginSchema>;

// Signup (user) — Signup.tsx:16-32. `category` is fixed to "user" and sent by the API
// layer, so it's not a form field here.
export const signupSchema = z
  .object({
    name: z.string().trim().min(2, "Name is required"),
    email,
    password: z.string().min(6, "Password must be at least 6 characters"),
    cpassword: z.string().min(6, "Confirm password must be at least 6 characters"),
    accpetalltermsandcondition: z.boolean().refine((v) => v === true, {
      message: "You must accept the Terms of Service",
    }),
  })
  .refine((d) => d.password === d.cpassword, {
    message: "Passwords don't match",
    path: ["cpassword"],
  });
export type SignupValues = z.infer<typeof signupSchema>;

// Forgot password — app/forgot-password/page.tsx:12
export const forgotPasswordSchema = z.object({ email });
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

// Verify reset code — app/verify-code/page.tsx:33
export const codeSchema = z.object({
  code: z.string().length(6, "Your verification code must be 6 characters."),
});
export type CodeValues = z.infer<typeof codeSchema>;

// New password — the web reset page only checks the two match (no length rule); the
// signup password rules are reused here so a reset can't set a weaker password than
// signup allows. Flagged in the Phase A summary.
export const newPasswordSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    cpassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((d) => d.password === d.cpassword, {
    message: "Passwords don't match",
    path: ["cpassword"],
  });
export type NewPasswordValues = z.infer<typeof newPasswordSchema>;

// Review — components/Business/Comment.tsx:36-41 (+ the model's 500-char maximum).
export const reviewSchema = z.object({
  rating: z.number().min(1, "Please select at least 1 star").max(5),
  comment: z
    .string()
    .trim()
    .min(10, "Comment must be at least 10 characters")
    .max(500, "Comment must be 500 characters or fewer"),
});
export type ReviewValues = z.infer<typeof reviewSchema>;

// Business signup — components/Auth/BusinessSignupPage.tsx:104-134 (messages verbatim).
// Per-step gating uses the web's STEP_FIELDS map (see app/(auth)/business-signup.tsx).
export const businessSignupSchema = z
  .object({
    business_name: z.string().trim().min(2, "Business name is required"),
    // Exactly 10 characters, no other format rule (web: min(10) + max(10)).
    phone_number: z
      .string()
      .trim()
      .min(10, "Valid phone number required")
      .max(10, "Valid phone number required"),
    business_category: z.string().min(1, "Please select a category"),
    location: z.string().min(1, "Please select your business address from the dropdown"),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    is24_7: z.boolean(),
    name: z.string().trim().min(2, "Contact name is required"),
    email: z.string().trim().pipe(z.email("Please enter a valid email")),
    password: z.string().min(6, "Minimum 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    accpetalltermsandcondition: z.boolean().refine((v) => v === true, {
      message: "You must accept the terms",
    }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type BusinessSignupValues = z.infer<typeof businessSignupSchema>;

/** Venue images step (web goNext step 7). */
export const MIN_VENUE_IMAGES = 3;
export const MAX_VENUE_IMAGES = 10;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// Edit profile. Name follows the signup rule; the web profile form
// (components/Profile/ProfilePage.tsx) has no rules for phone/address — all optional.
export const profileNameSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
});
export type ProfileNameValues = z.infer<typeof profileNameSchema>;

export const contactDetailsSchema = z.object({
  phone_number: z.string().trim().optional(),
  location: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});
export type ContactDetailsValues = z.infer<typeof contactDetailsSchema>;
