type VerifyEmailPageProps = {
    searchParams: Promise<{
      email?: string;
    }>;
  };
  
  export default async function VerifyEmailPage({
    searchParams,
  }: VerifyEmailPageProps) {
    const params = await searchParams;
  
    const email = params.email ?? "";
  
    return (
      <main className="p-8">
        <h1 className="text-3xl font-bold">
          Revisá tu correo
        </h1>
  
        <p className="mt-4">
          Te enviamos un enlace a: 
        </p>
  
        <p className="font-semibold">
          {email}
        </p>
      </main>
    );
  }