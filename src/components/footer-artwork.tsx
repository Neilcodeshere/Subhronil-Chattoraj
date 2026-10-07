import { useId } from "react";

const SYMBOLS = ["{", "}", "[", "]", "/", "&", "%", "*", "#", ";", "=", "(", ")", "+", "<", ">"];

// A deterministic ribbon of code: identical on the server and in the browser.
const glyphs = Array.from({ length: 84 * 32 }, (_, index) => {
  const column = index % 84;
  const row = Math.floor(index / 84);
  const x = column * 20 - 30;
  const y = row * 19 + 24;
  const center = 320 - Math.sin((x - 160) / 170) * 92 + Math.cos(x / 310) * 48;
  const spread = 108 + Math.sin(x / 230) * 30;
  const distance = Math.abs(y - center) / spread;
  const noise = ((column * 73 + row * 37 + column * row * 11) % 101) / 100;
  if (distance > 1 || noise < 0.16) return null;
  return { x, y, symbol: SYMBOLS[(column * 7 + row * 13) % SYMBOLS.length], opacity: Number(((1 - distance) * (0.25 + noise * 0.75)).toFixed(2)) };
}).filter((glyph) => glyph !== null);

export function FooterArtwork() {
  const waveId = useId();

  return (
    <div className="footer-artwork" aria-hidden="true">
      <div className="footer-symbols">
        <svg viewBox="0 0 1600 640" fill="currentColor" focusable="false">
          <defs>
            <g id={waveId} fontFamily="ui-monospace, SFMono-Regular, Consolas, monospace" fontSize="14" textAnchor="middle">
              {glyphs.map((glyph, index) => <text key={index} x={glyph.x} y={glyph.y} opacity={glyph.opacity}>{glyph.symbol}</text>)}
            </g>
          </defs>
          <use href={`#${waveId}`} />
        </svg>
      </div>
      <div className="footer-symbols footer-symbols-lit">
        <svg viewBox="0 0 1600 640" fill="currentColor" focusable="false"><use href={`#${waveId}`} /></svg>
      </div>
    </div>
  );
}
