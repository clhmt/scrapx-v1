import Navbar from "@/components/Navbar";

export default function BillingLoading() {
  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <Navbar />
      <main className="mx-auto max-w-5xl animate-pulse px-4 py-10">
        <div className="h-8 w-40 rounded bg-gray-200" />
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="h-40 rounded-2xl bg-white" />
          <div className="h-40 rounded-2xl bg-white" />
        </div>
        <div className="mt-4 h-40 rounded-2xl bg-white" />
        <div className="mt-4 h-56 rounded-2xl bg-white" />
      </main>
    </div>
  );
}
