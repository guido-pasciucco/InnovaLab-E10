import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { emailField, passwordField } from "@/lib/schemas/auth/fields";
import {
  cuitField,
  supplierBusinessNameField,
  supplierCategoriesField,
  supplierContactNameField,
  supplierPhoneField,
  supplierTermsField,
} from "@/lib/schemas/suppliers/fields";
import { suppliers } from "./table";

// Server gate for the supplier services (ADR 02). Inputs exclude every field
// the server controls: ids, the account id, the email (read from the verified
// session) and timestamps.

// Supplier data typed in the public registration form.
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

// New account through the public registration form: supplier data plus the
// credentials of the account to create.
export const supplierSignupInputSchema = supplierProfileInputSchema.extend({
  email: emailField,
  password: passwordField,
});

export type SupplierProfileInput = z.infer<typeof supplierProfileInputSchema>;
export type SupplierSignupInput = z.infer<typeof supplierSignupInputSchema>;
