/**
 * @file color-conversion.js
 * A set of functions to convert various css color values to 6-digit hexidecimal format.
 * "lab" and "oklab" color spaces are not supported because the code to convert them *accurately* is too complex for this simple library.
 * @author Holmes Bryant <https://github.com/HolmesBryant>
 * @license GPL-3.0
 */

function toHex(value) {
  if (!value) return console.error('No color value to convert');
  if (value.startsWith('#')) return value;
  if (value.startsWith('rgb')) return rgbToHex(value);
  if (value.startsWith('hsl')) return hslToHex(value);
  if (value.startsWith('hwb')) return hwbToHex(value);
  if (value.startsWith('lch')) return lchToHex(value);
  if (value.startsWith('oklch')) return oklchToHex(value);
  return namedColorToHex(value);
}

/**
 * Converts values from css rgb format to hexidecimal.
 */
function rgbToHex(value) {
  if (!value) return console.error('No color value to convert');
  const [r, g, b] = value.match(/\d+/g).map(Number);
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

/**
 * Converts values from css hsl format to hexidecimal.
 */
function hslToHex(value) {
  if (!value) return console.error('No color value to convert');
  const [h, s, l] = value.match(/\d+(\.\d+)?/g).map(Number);

  let r, g, b;

  if (s === 0) {
      r = g = b = l;
  } else {
      const hue2rgb = (p, q, t) => {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1/6) return p + (q - p) * 6 * t;
          if (t < 1/2) return q;
          if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
          return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;

      r = hue2rgb(p, q, h / 360);
      g = hue2rgb(p, q, (h / 360) + 1/3);
      b = hue2rgb(p, q, (h / 360) + 2/3);
  }

  const toHex = x => Math.round(x * 255).toString(16).padStart(2, '0');

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Converts values from css hwb format to hexidecimal.
 */
function hwbToHex(value) {
  if (!value) return console.error('No color value to convert');
  const [hue, white, black] = value.match(/\d+(\.\d+)?/g).map(Number);

  // Convert hue to radians if needed (assuming input is in degrees)
  const radianHue = hue * Math.PI / 180;

  // Calculate RGB from hue
  let r, g, b;
  if (hue % 60 <= 30) {
    r = 255 - white * 255;
    g = 255 - ((white + (black * (hue % 60) / 30)) * 255);
    b = black * 255;
  } else if (hue % 60 <= 60) {
    r = 255 - ((white + (black * ((60 - hue % 60) / 30))) * 255);
    g = 255 - white * 255;
    b = black * 255;
  } else if (hue % 60 <= 90) {
    r = black * 255;
    g = 255 - white * 255;
    b = 255 - ((white + (black * ((hue % 60) / 30))) * 255);
  } else if (hue % 60 <= 120) {
    r = black * 255;
    g = 255 - ((white + (black * ((120 - hue % 60) / 30))) * 255);
    b = 255 - white * 255;
  } else if (hue % 60 <= 150) {
    r = 255 - ((white + (black * ((hue % 60) / 30))) * 255);
    g = black * 255;
    b = 255 - white * 255;
  } else if (hue % 60 <= 180) {
    r = 255 - white * 255;
    g = black * 255;
    b = 255 - ((white + (black * ((180 - hue % 60) / 30))) * 255);
  }

  // Calculate final RGB values by mixing with black and white
  r = Math.round((r * (1 - black)) + (white * 255));
  g = Math.round((g * (1 - black)) + (white * 255));
  b = Math.round((b * (1 - black)) + (white * 255));

  // Convert RGB to hexadecimal
  const toHex = v => v.toString(16).padStart(2, '0');

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Converts values from css lch format to hexidecimal.
 */
function lchToHex(value) {
  if (!value) return console.error('No color value to convert');
  const [lightness, chroma, hue] = value.match(/\d+(\.\d+)?/g).map(Number);

  // Convert LCH to LAB
  let a, bValue;
  const radianHue = hue * Math.PI / 180;

  a = chroma * Math.cos(radianHue);
  bValue = chroma * Math.sin(radianHue);

  // Convert LAB to XYZ
  let x, y, z;
  y = (lightness + 16) / 116;
  x = a / 500 + y;
  z = y - bValue / 200;

  const cubeRoot = v => {
    if (v > 0.008856) return Math.cbrt(v);
    else return v / 7.787 + 16 / 116;
  };

  x = 95.047 * cubeRoot(x);
  y = 123.000 * cubeRoot(y);
  z = 108.883 * cubeRoot(z);

  // Convert XYZ to RGB
  let r, g, b;
  r = x * 0.4124 + y * 0.3576 + z * 0.1805;
  g = x * 0.2126 + y * 0.7152 + z * 0.0722;
  b = x * 0.0193 + y * 0.1192 + z * 0.9505;

  // Clamp RGB values to [0, 1]
  const clamp = v => Math.min(1, Math.max(0, v));

  r = clamp(r);
  g = clamp(g);
  b = clamp(b);

  // Convert sRGB linear values to non-linear (gamma corrected)
  const gammaCorrect = v => {
    if (v <= 0.0031308) return v * 12.92;
    else return 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  };

  r = gammaCorrect(r);
  g = gammaCorrect(g);
  b = gammaCorrect(b);

  // Convert sRGB to Hex
  const toHex = v => Math.round(v * 255).toString(16).padStart(2, '0');

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Converts values from css oklch format to hexidecimal.
 */
function oklchToHex(value) {
  if (!value) return console.error('No color value to convert');
  const [lightness, chroma, hue] = value.match(/\d+(\.\d+)?/g).map(Number);

  let a, bValue;
  const radianHue = hue * Math.PI / 180;

  a = chroma * Math.cos(radianHue);
  bValue = chroma * Math.sin(radianHue);

  const x = (lightness + 0.3963377774 * a + 0.2158037573 * bValue) * 95.047;
  const y = lightness * 123.000;
  const z = (lightness - 0.1055613458 * a - 0.0638541728 * bValue) * 108.883;

  let r, g, b;
  r = x * 3.94114577 * 1.05;
  g = y * 7.21693432 * 0.99;
  b = z * 9.86455433 * 1.09;

  const clamp = v => Math.min(1, Math.max(0, v));

  r = clamp(r);
  g = clamp(g);
  b = clamp(b);

  const gammaCorrect = v => {
      if (v <= 0.0031308) return v * 12.92;
      else return 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  };

  r = gammaCorrect(r);
  g = gammaCorrect(g);
  b = gammaCorrect(b);

  const toHex = v => Math.round(v * 255).toString(16).padStart(2, '0');

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Converts css color names to hexidecimal
 */
function namedColorToHex(value) {
  if (!value) return console.error('No color value to convert');
  const colors = {
    aliceblue: "#f0f8ff",
    antiquewhite: "#faebd7",
    aqua: "#00ffff",
    aquamarine: "#7fffd4",
    azure: "#f0ffff",
    beige: "#f5f5dc",
    bisque: "#ffe4c4",
    black: "#000000",
    blanchedalmond: "#ffebcd",
    blue: "#0000ff",
    blueviolet: "#8a2be2",
    brown: "#a52a2a",
    burlywood: "#deb887",
    cadetblue: "#5f9ea0",
    chartreuse: "#7fff00",
    chocolate: "#d2691e",
    coral: "#ff7f50",
    cornflowerblue: "#6495ed",
    cornsilk: "#fff8dc",
    crimson: "#dc143c",
    cyan: "#00ffff",
    darkblue: "#00008b",
    darkcyan: "#008b8b",
    darkgoldenrod: "#b8860b",
    darkgray: "#a9a9a9",
    darkgreen: "#006400",
    darkgrey: "#a9a9a9",
    darkkhaki: "#bdb76b",
    darkmagenta: "#8b008b",
    darkolivegreen: "#556b2f",
    darkorange: "#ff8c00",
    darkorchid: "#9932cc",
    darkred: "#8b0000",
    darksalmon: "#e9967a",
    darkseagreen: "#8fbc8f",
    darkslateblue: "#483d8b",
    darkslategray: "#2f4f4f",
    darkslategrey: "#2f4f4f",
    darkturquoise: "#00ced1",
    darkviolet: "#9400d3",
    deeppink: "#ff1493",
    deepskyblue: "#00bfff",
    dimgray: "#696969",
    dimgrey: "#696969",
    dodgerblue: "#1e90ff",
    firebrick: "#b22222",
    floralwhite: "#fffaf0",
    forestgreen: "#228b22",
    fuchsia: "#ff00ff",
    gainsboro: "#dcdcdc",
    ghostwhite: "#f8f8ff",
    gold: "#ffd700",
    goldenrod: "#daa520",
    gray: "#808080",
    green: "#008000",
    greenyellow: "#adff2f",
    grey: "#808080",
    honeydew: "#f0fff0",
    hotpink: "#ff69b4",
    indianred: "#cd5c5c",
    indigo: "#4b0082",
    ivory: "#fffff0",
    khaki: "#f0e68c",
    lavender: "#e6e6fa",
    lavenderblush: "#fff0f5",
    lawngreen: "#7cfc00",
    lemonchiffon: "#fffacd",
    lightblue: "#add8e6",
    lightcoral: "#f08080",
    lightcyan: "#e0ffff",
    lightgoldenrodyellow: "#fafad2",
    lightgray: "#d3d3d3",
    lightgreen: "#90ee90",
    lightgrey: "#d3d3d3",
    lightpink: "#ffb6c1",
    lightsalmon: "#ffa07a",
    lightseagreen: "#20b2aa",
    lightskyblue: "#87cefa",
    lightslategray: "#778899",
    lightslategrey: "#778899",
    lightsteelblue: "#b0c4de",
    lightyellow: "#ffffe0",
    lime: "#00ff00",
    limegreen: "#32cd32",
    linen: "#faf0e6",
    magenta: "#ff00ff",
    maroon: "#800000",
    mediumaquamarine: "#66cdaa",
    mediumblue: "#0000cd",
    mediumorchid: "#ba55d3",
    mediumpurple: "#9370db",
    mediumseagreen: "#3cb371",
    mediumslateblue: "#7b68ee",
    mediumspringgreen: "#00fa9a",
    mediumturquoise: "#48d1cc",
    mediumvioletred: "#c71585",
    midnightblue: "#191970",
    mintcream: "#f5fffa",
    mistyrose: "#ffe4e1",
    moccasin: "#ffe4b5",
    navajowhite: "#ffdead",
    navy: "#000080",
    oldlace: "#fdf5e6",
    olive: "#808000",
    olivedrab: "#6b8e23",
    orange: "#ffa500",
    orangered: "#ff4500",
    orchid: "#da70d6",
    palegoldenrod: "#eee8aa",
    palegreen: "#98fb98",
    paleturquoise: "#afeeee",
    palevioletred: "#db7093",
    papayawhip: "#ffefd5",
    peachpuff: "#ffdab9",
    peru: "#cd853f",
    pink: "#ffc0cb",
    plum: "#dda0dd",
    powderblue: "#b0e0e6",
    purple: "#800080",
    red: "#ff0000",
    rosybrown: "#bc8f8f",
    royalblue: "#4169e1",
    saddlebrown: "#8b4513",
    salmon: "#fa8072",
    sandybrown: "#f4a460",
    seagreen: "#2e8b57",
    seashell: "#fff5ee",
    sienna: "#a0522d",
    silver: "#c0c0c0",
    skyblue: "#87ceeb",
    slateblue: "#6a5acd",
    slategray: "#708090",
    slategrey: "#708090",
    snow: "#fffafa",
    springgreen: "#00ff7f",
    steelblue: "#4682b4",
    tan: "#d2b48c",
    teal: "#008080",
    thistle: "#d8bfd8",
    tomato: "#ff6347",
    turquoise: "#40e0d0",
    violet: "#ee82ee",
    wheat: "#f5deb3",
    white: "#ffffff",
    whitesmoke: "#f5f5f5",
    yellow: "#ffff00",
    yellowgreen: "#9acd32"
  };
  return colors[value.toLowerCase()] || value;
}

