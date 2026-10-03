import { BrandStrip, PartnerLockup } from "@/components/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <BrandStrip />
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <PartnerLockup height={44} />
            <div>
              <div className="text-base font-semibold text-ink">Strategy System</div>
              <div className="text-xs text-muted">Growth Partnership · KSA</div>
            </div>
          </div>
          <div className="rounded-xl border border-line bg-surface p-6 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">{children}</div>
        </div>
      </main>
    </div>
  );
}
