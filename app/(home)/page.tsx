import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'TapState Documentation',
  description: 'Capture, transform, and serve operational data in one declarative workflow.',
};

export default function HomePage() {
  return (
    <div className="flex flex-col justify-center text-center flex-1">
      <h1 className="text-2xl font-bold mb-4">TapState Documentation</h1>
      <p className="mb-4">
        Capture, transform, and serve operational data in one declarative workflow.
      </p>
      <p>
        You can open{' '}
        <Link href="/docs" className="font-medium underline">
          the docs
        </Link>{' '}
        to learn more.
      </p>
    </div>
  );
}
