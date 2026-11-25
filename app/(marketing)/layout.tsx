import { SiteFooter } from "@/components/home/site-footer";
import { SiteHeader } from "@/components/home/site-header";
import { getOptionalUser } from "@/lib/auth/optional-user";

// Public area: the only session read is optional and just picks the header
// state. No page behind this layout requires a signed-in user.
export default async function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getOptionalUser();

  return (
    <>
      <SiteHeader isSignedIn={user !== null} />
      <div className="relative min-h-screen overflow-x-clip bg-surface-tint font-sans text-fg">
        {children}
      </div>
      <SiteFooter />
    </>
  );
}
