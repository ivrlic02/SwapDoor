import Link from "next/link";

export function CTA() {
  return (
    <section className="px-6 py-24 bg-[#13161c] text-center">
      <h2 className="text-3xl font-bold mb-6">
        Join the Global Community
      </h2>
      <div className="flex justify-center gap-4">
        <Link href="/sign-in">
            <button className="bg-blue-600 px-6 py-3 rounded-lg">
            Get Started Free
            </button> 
        </Link>
        <Link href="/how-it-works">
            <button className="border px-6 py-3 rounded-lg">
            Learn More
            </button>
        </Link>
      </div>
    </section>
  );
}
