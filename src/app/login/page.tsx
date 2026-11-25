import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <div className="mb-8 text-center">
        <h1 className="font-serif text-4xl text-ink">Baby Album</h1>
        <p className="mt-3 text-ink/70">
          A year of little moments, made into a keepsake you can hold.
        </p>
      </div>
      <div className="rounded-2xl border border-dust bg-white p-6 shadow-sm">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
      <p className="mt-6 text-center text-xs text-ink/50">
        We&apos;ll email you a secure sign-in link — no password to remember.
      </p>
    </main>
  );
}
