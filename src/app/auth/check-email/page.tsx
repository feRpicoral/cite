import { Mail } from "lucide-react";

export default function CheckEmailPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <Mail className="text-muted-foreground h-10 w-10" />
      <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
      <p className="text-muted-foreground max-w-sm text-sm">
        We sent you a link to verify your address. Click it to finish signing up.
      </p>
    </main>
  );
}
