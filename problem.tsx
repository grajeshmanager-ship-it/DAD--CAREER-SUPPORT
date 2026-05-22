"use client";

export function Problem() {
  return (
    <section className="py-20 md:py-32 relative">
      <div className="container px-4 md:px-6 max-w-4xl mx-auto">
        <div className="text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-8 text-balance">
            You are <span className="text-primary">not</span> the problem.
          </h2>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed text-pretty">
            Most job seekers are qualified. They just don&apos;t know how to show it. And nobody tells them why they keep getting rejected. DAD does.
          </p>
        </div>
      </div>
    </section>
  );
}
