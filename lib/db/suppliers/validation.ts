import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { emailField, passwordField } from "@/lib/schemas/auth/fields";
import {
  cuitField,
  supplierBusinessNameField,
  supplierCategoriesField,
  supplierContactNameField,
  supplierInviteLabelField,
  supplierPhoneField,
  supplierTermsField,
} from "@/lib/schemas/suppliers/fields";
import { supplierInvites, suppliers } from "./table";

// Server gate for the supplier services (ADR 02). Inputs exclude every field
// the server controls: ids, the account id, the email (read from the verified
// session) and timestamps.

// Supplier data typed in the registration form (annex 03, step 5).
export const supplierProfileInputSchema = createInsertSchema(suppliers, {
  businessName: supplierBusinessNameField,
  cuit: cuitField,
  contactName: supplierContactNameField,
  phone: supplierPhoneField,
  categories: supplierCategoriesField,
})
  .omit({
    userId: true,
    email: true,
    termsAcceptedAt: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({ acceptTerms: supplierTermsField });

// A new account through the invite link: supplier data plus the credentials
// of the account to create.
export const supplierSignupInputSchema = supplierProfileInputSchema.extend({
  email: emailField,
  password: passwordField,
});

export const createSupplierInviteInputSchema = createInsertSchema(supplierInvites, {
  label: supplierInviteLabelField,
}).pick({ label: true });

export { inviteTokenField as inviteTokenSchema } from "@/lib/schemas/suppliers/fields";

export type SupplierProfileInput = z.infer<typeof supplierProfileInputSchema>;
export type SupplierSignupInput = z.infer<typeof supplierSignupInputSchema>;
