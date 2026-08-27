/** Marcas visuais usadas no portal do cliente (apresentação apenas). */
export type PortalBrand = "portus" | "moove";

export function PortusLogo({ size = 40 }: { size?: number }) {
  return (
    <img
      src="/brand/portus-logo.png"
      alt="Portus"
      className="shrink-0 object-contain"
      style={{ height: size, width: "auto" }}
    />
  );
}

export function MooveLogo({ size = 40 }: { size?: number }) {
  return (
    <img
      src="/brand/moove-logo.png"
      width={size}
      height={size}
      alt="Moove Talent"
      className="shrink-0 rounded-full"
      style={{ width: size, height: size }}
    />
  );
}

export function PortusWordmark() {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <PortusLogo />
      <div className="min-w-0 leading-tight">
        <div className="truncate text-base font-semibold tracking-tight text-foreground">
          ShortList <span className="text-primary">Portus</span>
        </div>
        <div className="truncate text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Seleção executiva
        </div>
      </div>
    </div>
  );
}

export function MooveWordmark() {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <MooveLogo />
      <div className="min-w-0 leading-tight">
        <div className="truncate text-base font-semibold tracking-tight text-foreground">
          ShortList <span className="text-primary">Moove Talent</span>
        </div>
        <div className="truncate text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Seleção executiva
        </div>
      </div>
    </div>
  );
}

export function PortalWordmark({ brand }: { brand?: string | null }) {
  return brand === "moove" ? <MooveWordmark /> : <PortusWordmark />;
}
