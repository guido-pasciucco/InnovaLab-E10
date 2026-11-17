import { redirect } from "next/navigation";

// The catalog moved to the Spanish route required by #260. Keep the old URL
// working so links from the product screen (#240/#252) do not break while
// both PRs converge.
export default function LegacySuppliesPage() {
  redirect("/insumos");
}
