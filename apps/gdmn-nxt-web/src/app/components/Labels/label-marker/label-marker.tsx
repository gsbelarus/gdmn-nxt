import { ILabel } from '@gsbelarus/util-api-types';
import styles from './label-marker.module.less';

/* eslint-disable-next-line */
export interface LabelMarkerProps {
  label: ILabel;
}

function hexToRGB(h: any) {
  let r = 0, g = 0, b = 0;

  // 3 digits
  if (h?.length === 4) {
    r = h[1] + h[1];
    g = h[2] + h[2];
    b = h[3] + h[3];

  // 6 digits
  } else if (h?.length === 7) {
    r = parseInt(h[1] + h[2], 16);
    g = parseInt(h[3] + h[4], 16);
    b = parseInt(h[5] + h[6], 16);
  }

  return { r, g, b };
}

function RGBToHSL(r: number, g: number, b: number) {
  // Make r, g, and b fractions of 1
  r /= 255;
  g /= 255;
  b /= 255;

  // Find greatest and smallest channel values
  const cmin = Math.min(r, g, b),
    cmax = Math.max(r, g, b),
    delta = cmax - cmin;
  let h = 0,
    s = 0,
    l = 0;

  if (delta === 0) h = 0;
  else if (cmax === r) h = ((g - b) / delta) % 6;
  else if (cmax === g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;

  h = Math.round(h * 60);

  if (h < 0) h += 360;

  l = (cmax + cmin) / 2;
  s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  s = +(s * 100).toFixed(1);
  l = +(l * 100).toFixed(1);

  return { h, s, l };
}

export function LabelMarker(props: LabelMarkerProps) {
  const { USR$COLOR: color, USR$NAME: name } = props.label;

  const rgb = hexToRGB(color);
  const hsl = RGBToHSL(rgb.r, rgb.g, rgb.b);
  const labelH = hsl.h;
  const labelS = hsl.s;
  const labelL = hsl.l;
  const backgroundAlpha = 0.2;
  const borderAlpha = 0.3;

  if (!name) return <></>;

  return (
    <div
      className={styles.label}
      style={{
        color: `hsl(${labelH}, ${labelS}%, ${labelL - 5}%)`,
        backgroundColor: `hsla(${labelH}, ${labelS}%, ${labelL + 20}%, ${backgroundAlpha})`,
        borderColor: `hsla(${labelH}, ${labelS}%, ${labelL}, ${borderAlpha})`, maxWidth: '100%', wordWrap: 'break-word'
        // width: 'min-content'
      }}
    >
      {name || 'Пример'}
    </div>
  );
}

export default LabelMarker;
