import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-xs tracking-[0.1em] uppercase">404</p>
      <h1 className="mt-3 text-3xl tracking-[-0.03em]">Page not found</h1>
      <p className="mt-4 text-base">The route you requested does not exist.</p>
      <p className="mt-6">
        <Link to="/" className="underline">
          Return to home
        </Link>
      </p>
    </main>
  );
}
