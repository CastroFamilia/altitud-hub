import Link from 'next/link';
export default function DevelopmentNotFound() {
  return (
    <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">🏗️</div>
        <h1 className="text-3xl font-black text-white mb-4">Development Not Found</h1>
        <p className="text-gray-400 mb-8">
          This development page doesn&apos;t exist or is not yet published.
        </p>
        <Link href="/" className="inline-block px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold transition-all">
          Go Home
        </Link>
      </div>
    </div>
  );
}
