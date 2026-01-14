export function HowItWorks() {
  const steps = ["Browse", "Connect", "Exchange", "Experience"];

  return (
    <section className="px-6 py-20 bg-[#13161c]">
      <h2 className="text-center text-3xl font-bold mb-12">How it Works</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-10 max-w-6xl mx-auto text-center">
        {steps.map((step, i) => (
          <div key={i} className="relative">
            {/* Step number */}
            <div className="text-blue-500 font-bold mb-2">
              0{i + 1}
            </div>

            {/* Step label */}
            <p>{step}</p>

            {/* Arrow (not after last item) */}
            {i < steps.length - 1 && (
              <span className="hidden md:block absolute top-1/2 right-[-30px] -translate-y-1/2 text-gray-500 text-2xl">
                →
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
