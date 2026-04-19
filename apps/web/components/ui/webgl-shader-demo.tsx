import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { WebGLShader } from "@/components/ui/web-gl-shader";

export default function DemoOne() {
  return (
    <div className="relative flex w-full flex-col items-center justify-center overflow-hidden">
      <WebGLShader />
      <div className="relative mx-auto w-full max-w-3xl border border-[#27272a] p-2">
        <main className="relative overflow-hidden border border-[#27272a] py-10">
          <h1 className="mb-3 text-center text-7xl font-extrabold tracking-tighter text-white md:text-[clamp(2rem,8vw,7rem)]">
            Design is Everything
          </h1>
          <p className="px-6 text-center text-xs text-white/60 md:text-sm lg:text-lg">
            Unleashing creativity through bold visuals, seamless interfaces, and limitless possibilities.
          </p>
          <div className="my-8 flex items-center justify-center gap-1">
            <span className="relative flex h-3 w-3 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            <p className="text-xs text-green-500">Available for New Projects</p>
          </div>

          <div className="flex justify-center">
            <LiquidButton className="rounded-full border text-white" size="xl">
              Let&apos;s Go
            </LiquidButton>
          </div>
        </main>
      </div>
    </div>
  );
}
