type WorldVariant = "arrival" | "focus" | "reveal" | "finale";

export function MagicalBackground({ variant = "arrival" }: { variant?: WorldVariant }) {
  return <div className={`magical-world world-${variant}`} aria-hidden="true"><div className="world-aurora"/><div className="world-haze haze-near"/><div className="world-haze haze-far"/><svg className="world-horizon" viewBox="0 0 900 300" preserveAspectRatio="xMidYMax slice"><path className="horizon-back" d="M0 260C72 226 121 234 178 205C248 170 289 191 344 167C410 138 457 157 504 129C578 85 638 116 699 94C758 73 819 101 900 55V300H0Z"/><path className="horizon-front" d="M0 278C77 240 142 259 203 228C276 192 334 220 399 187C457 157 520 194 575 160C649 115 718 163 773 126C832 87 877 115 900 102V300H0Z"/><g className="horizon-lights"><circle cx="153" cy="224" r="3"/><circle cx="335" cy="207" r="2"/><circle cx="571" cy="175" r="3"/><circle cx="762" cy="145" r="2"/></g></svg><img className="world-logo-watermark" src="/assets/logo-jixgo-full.png" alt=""/><i className="world-star star-a">✦</i><i className="world-star star-b">✧</i><i className="world-star star-c">✦</i><i className="world-star star-d">✧</i></div>;
}

export function MagicalLogo() { return <img className="magical-logo" src="/assets/logo-jixgo-full.png" alt="JIXGO Magical 24" />; }
