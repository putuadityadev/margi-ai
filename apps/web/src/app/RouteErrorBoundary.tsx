import { Link, useRouteError } from 'react-router';

export function RouteErrorBoundary() {
  const error = useRouteError();
  const detail = error instanceof Error ? error.message : 'Unexpected route error';

  return (
    <main className="mx-auto max-w-3xl px-6 py-16" role="alert">
      <p className="text-xs tracking-[0.1em] uppercase">Error</p>
      <h1 className="mt-3 text-3xl tracking-[-0.03em]">Something went wrong</h1>
      <p className="mt-4 text-base">{detail}</p>
      <p className="mt-6">
        <Link to="/" className="underline">
          Retry from home
        </Link>
      </p>
    </main>
  );
}
