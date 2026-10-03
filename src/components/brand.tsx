import Image from "next/image";

// Brand colours: Wall Street English navy + red, Clicksalesmedia gold
export const BRAND = { wseNavy: "#153359", wseRed: "#EE2D3A", csmGold: "#D6B98C" };

// Logo aspect ratios from the SVG viewBoxes
const WSE_RATIO = 174.4 / 123.3;
const CSM_RATIO = 389.25 / 217.5;

export function WseLogo({ height = 40 }: { height?: number }) {
  return (
    <Image src="/brands/wall-street-english.svg" alt="Wall Street English" height={height} width={Math.round(height * WSE_RATIO)} priority />
  );
}

export function CsmLogo({ height = 40 }: { height?: number }) {
  return <Image src="/brands/clicksalesmedia.svg" alt="Clicksalesmedia" height={height} width={Math.round(height * CSM_RATIO)} priority />;
}

/** Thin strip in both brands' colours, used as an accent edge. */
export function BrandStrip({ className = "h-1" }: { className?: string }) {
  return (
    <div
      className={className}
      style={{
        background: `linear-gradient(90deg, ${BRAND.wseNavy} 0%, ${BRAND.wseNavy} 30%, ${BRAND.wseRed} 50%, ${BRAND.csmGold} 72%, ${BRAND.csmGold} 100%)`,
      }}
    />
  );
}

/** "Wall Street English × Clicksalesmedia" co-brand lockup. */
export function PartnerLockup({ height = 36 }: { height?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <WseLogo height={height} />
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-[11px] font-semibold text-faint shadow-sm">
        ×
      </span>
      <CsmLogo height={height} />
    </div>
  );
}
