// Vesta, the arcade's host: the original Vesta mascot (a round face wearing a
// big flat-bottomed V) redrawn as SVG from the source artwork, so it stays
// sharp at any size and can change expression. Coordinates are the source
// art's, cropped to the face.

export type Eyes = "dot" | "x" | "wide" | "happy";
export type Mouth = "dash" | "smile" | "o" | "flat";

export interface MascotOptions {
  eyes?: Eyes;
  mouth?: Mouth;
  /** Face colour. */
  face?: string;
  /** V, eyes and mouth. */
  ink?: string;
  /** Adds class hooks so the page script can move the pupils and swap the mouth. */
  live?: boolean;
  label?: string;
}

const EYE_L = { x: 584, y: 966 };
const EYE_R = { x: 1354, y: 966 };

function eye(e: Eyes, c: { x: number; y: number }, ink: string, live: boolean): string {
  const cls = live ? ' class="pupil"' : "";
  switch (e) {
    case "x":
      return `<g style="stroke:${ink}" stroke-width="42" stroke-linecap="square"><path d="M${c.x - 62} ${c.y - 62}l124 124M${c.x + 62} ${c.y - 62}l-124 124"/></g>`;
    case "wide":
      return `<circle cx="${c.x}" cy="${c.y}" r="108" style="fill:${ink}"${cls}/>`;
    case "happy":
      return `<path d="M${c.x - 86} ${c.y + 30}q86-120 172 0" style="fill:none;stroke:${ink}" stroke-width="40" stroke-linecap="round"/>`;
    default:
      return `<circle cx="${c.x}" cy="${c.y}" r="81" style="fill:${ink}"${cls}/>`;
  }
}

function mouth(m: Mouth, ink: string, live: boolean): string {
  // The deadpan mouth is the source art's: a dashed line, slightly off-centre.
  const dash = [800, 862, 923, 985, 1047].map((x) => `<rect x="${x}" y="1427" width="46" height="16"/>`).join("") + `<rect x="1109" y="1427" width="23" height="16"/>`;
  const shapes: Record<Mouth, string> = {
    dash: `<g style="fill:${ink}">${dash}</g>`,
    flat: `<rect x="800" y="1427" width="332" height="16" style="fill:${ink}"/>`,
    smile: `<path d="M790 1390q176 150 352 0" style="fill:none;stroke:${ink}" stroke-width="34" stroke-linecap="round"/>`,
    o: `<ellipse cx="966" cy="1435" rx="70" ry="84" style="fill:${ink}"/>`,
  };
  if (!live) return shapes[m];
  // Live mascots carry every mouth; CSS shows the one named by the wrapper's data-mouth.
  return (Object.keys(shapes) as Mouth[]).map((k) => `<g class="mouth mouth-${k}">${shapes[k]}</g>`).join("");
}

/** A mascot wrapped for the page: live ones follow the cursor and react to hovering play buttons. */
export function mascotHtml(o: MascotOptions & { className?: string } = {}): string {
  const mouthAttr = o.live ? ` data-mouth="${o.mouth ?? "dash"}"` : "";
  return `<span class="mascot${o.className ? ` ${o.className}` : ""}"${o.live ? " data-live" : ""}${mouthAttr}>${mascotSvg(o)}</span>`;
}

export function mascotSvg(o: MascotOptions = {}): string {
  const face = o.face ?? "var(--m-face, #ffffff)";
  const ink = o.ink ?? "var(--m-ink, #262626)";
  const live = !!o.live;
  const label = o.label ? `<title>${o.label}</title>` : "";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="150 140 1632 1640" class="mascot-svg"${o.label ? ' role="img"' : ' aria-hidden="true"'}>${label}` +
    // The V's white rim pokes out above the face, like the source art.
    `<path d="M438 175H873L960 460L700 900L560 523Z" style="fill:${face}"/>` +
    `<path d="M1492 175H1057L970 460L1230 900L1370 523Z" style="fill:${face}"/>` +
    `<circle cx="966" cy="966" r="773" style="fill:${face}"/>` +
    `<path d="M551 255H813L968 768H972L1127 255H1379L1108 1022H823Z" style="fill:${ink}"/>` +
    `<g class="eyes">${eye(o.eyes ?? "dot", EYE_L, ink, live)}${eye(o.eyes ?? "dot", EYE_R, ink, live)}</g>` +
    mouth(o.mouth ?? "dash", ink, live) +
    `</svg>`
  );
}
