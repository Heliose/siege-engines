// Material token sets in the kit's own token scheme (light ships, dark kept working).
// Each set remaps paper, faces, the four shades, the line tones and dots, so every kit
// solid, tube and line inside a [data-mat] group takes the material.
const T = (paper, face, top, s0, s1, s2, s3, hi, mid, lo, faint, dot, litTop, litShade, lit) =>
  `--anatomy-paper:${paper};--anatomy-face:${face};--anatomy-top:${top};--anatomy-shade-0:${s0};--anatomy-shade-1:${s1};--anatomy-shade-2:${s2};--anatomy-shade-3:${s3};--anatomy-hi:${hi};--anatomy-mid:${mid};--anatomy-lo:${lo};--anatomy-faint:${faint};--anatomy-dot:${dot};--anatomy-lit-top:${litTop};--anatomy-lit-shade:${litShade};--anatomy-lit:${lit}`;

const SETS = {
  wood: {
    light: T("#fbf8f1", "#fffdf8", "#fffcf5", "#d9cfbe", "#e4dccd", "#ede7db", "#f5f1e8", "#2e281f", "#8b8071", "#b9ae9c", "#d9d0c1", "#3a3228", "#ffffff", "#f1ebdf", "#000000"),
    dark: T("#18150f", "#201c16", "#241f18", "#110e0a", "#14110d", "#181410", "#1c1813", "#e4d8c4", "#827664", "#4c4438", "#302b23", "#e9dcc5", "#2e281f", "#231e17", "#ffffff"),
  },
  oak: {
    light: T("#f2ebdf", "#f8f3ea", "#f7f1e6", "#c7b9a1", "#d3c7b1", "#ded4c2", "#e8e0d2", "#2b2318", "#7e705c", "#ab9c85", "#cbbfa9", "#30281c", "#fdf9f1", "#e6ddcd", "#000000"),
    dark: T("#1b1711", "#231e17", "#28221a", "#130f0b", "#17130e", "#1b1711", "#201b14", "#e8d9bf", "#8a7b64", "#544a3b", "#362f25", "#eadbc0", "#312a20", "#251f18", "#ffffff"),
  },
  iron: {
    light: T("#a2a7ab", "#b5b9bd", "#cdd1d4", "#73787c", "#83888c", "#92979b", "#a2a7ab", "#15171a", "#3a3e42", "#555a5e", "#6a6f73", "#eef0f2", "#e0e3e5", "#aaafb2", "#000000"),
    dark: T("#262a2e", "#2e3338", "#373d43", "#1a1d20", "#1f2326", "#24282c", "#2a2f33", "#c9cfd4", "#6e757c", "#464c52", "#31363b", "#d0d5da", "#424950", "#30353a", "#ffffff"),
  },
  bronze: {
    light: T("#c9a568", "#d7b67b", "#e7ce98", "#98763d", "#ab894d", "#bd9a5c", "#cdab6b", "#3a2a0e", "#6c5323", "#8a6d36", "#a5874c", "#33250b", "#f3e0b0", "#cfaa66", "#1f1606"),
    dark: T("#3d3118", "#493a1d", "#574624", "#2a2110", "#332814", "#3d3118", "#493a1d", "#ead18e", "#8f753a", "#5f4d26", "#45381d", "#ead18e", "#675330", "#46381c", "#fff0c8"),
  },
  copper: {
    light: T("#d9a07b", "#e4b08f", "#eec5a8", "#a8633f", "#b9744f", "#c8855f", "#d5966f", "#3b1a09", "#7b3d1d", "#9e5937", "#ba7550", "#3a1708", "#f6d8c2", "#d39a76", "#1f0c03"),
    dark: T("#3b2416", "#472c1b", "#553421", "#29180e", "#311d11", "#3b2416", "#472c1b", "#f1bf9b", "#9a5e3c", "#623b25", "#45291a", "#f1bf9b", "#663f27", "#46291a", "#ffe6d4"),
  },
  rope: {
    light: T("#efe6d2", "#f6efdf", "#f8f2e4", "#c9b893", "#d5c6a5", "#dfd3b7", "#e9dfc8", "#493c25", "#8c7b59", "#b6a581", "#d3c5a6", "#3e3320", "#fbf6ea", "#e3d8c0", "#000000"),
    dark: T("#201b12", "#28221a", "#2d271c", "#16120c", "#1a160e", "#1e1a11", "#231e14", "#e6d7b6", "#8c7d5c", "#574b34", "#352e20", "#e6d7b6", "#342d21", "#262016", "#ffffff"),
  },
  sinew: {
    light: T("#f3ebd6", "#f8f2e2", "#faf5e7", "#d4c196", "#ddcca6", "#e6d9b8", "#efe5cb", "#4d3f22", "#937d50", "#bea97b", "#dacba4", "#43371d", "#fffaee", "#e9dcbd", "#000000"),
    dark: T("#221d12", "#2a2418", "#30291b", "#18140c", "#1c170e", "#211b11", "#262014", "#ead9b1", "#907d56", "#594c31", "#372f1f", "#ead9b1", "#383022", "#2a2318", "#ffffff"),
  },
  hide: {
    light: T("#cdb9a0", "#d9c7b0", "#e3d4c0", "#9f876c", "#ae977c", "#bca68b", "#c8b39a", "#2d2116", "#6a5541", "#8d7862", "#a8927a", "#2b2015", "#ece0cf", "#c4ae94", "#000000"),
    dark: T("#251d15", "#2d241b", "#33291f", "#1a140e", "#1f1811", "#241c14", "#292017", "#dcc7ab", "#7d6a55", "#4f4234", "#33291f", "#dcc7ab", "#3b3025", "#2b2219", "#ffffff"),
  },
  stone: {
    light: T("#f0f0ec", "#f6f6f3", "#f9f9f6", "#cbccc6", "#d6d7d1", "#e0e1dc", "#e9eae6", "#28292b", "#7b7d80", "#a9abad", "#c9cac8", "#2e2f31", "#ffffff", "#e3e4e0", "#000000"),
    dark: T("#18191a", "#1e1f20", "#232425", "#111213", "#141516", "#17181a", "#1b1c1e", "#d8d9da", "#6e7072", "#424446", "#2b2c2e", "#d8d9da", "#2b2c2e", "#202122", "#ffffff"),
  },
  granite: {
    light: T("#dcdcd8", "#e6e6e2", "#ececea", "#a9aaa5", "#b7b8b3", "#c5c6c1", "#d2d3ce", "#1f2022", "#5f6164", "#8a8c8f", "#a8aaac", "#2a2b2d", "#f4f4f2", "#cfd0cb", "#000000"),
    dark: T("#1e1f20", "#252627", "#2b2c2d", "#151617", "#191a1b", "#1d1e1f", "#222324", "#d2d3d4", "#6a6c6e", "#424446", "#2e2f31", "#d2d3d4", "#323335", "#262728", "#ffffff"),
  },
  clay: {
    light: T("#ecc8ad", "#f2d4bd", "#f6dfcc", "#c0855f", "#cc9672", "#d7a785", "#e1b897", "#3d1f10", "#87503a", "#ad7457", "#c99376", "#3a1d0e", "#fbeadb", "#dcae8f", "#1a0a03"),
    dark: T("#2b1b13", "#332117", "#3b271b", "#1e120c", "#23160f", "#291a12", "#2f1e15", "#f0c4a6", "#9a6448", "#5e3a28", "#3c261a", "#f0c4a6", "#45291c", "#331f15", "#ffe8d8"),
  },
  lead: {
    light: T("#aeb2b8", "#bcc0c5", "#cfd2d6", "#7c8188", "#8b9097", "#9a9fa5", "#a8adb3", "#1b1d21", "#4a4e55", "#6b7077", "#878c92", "#22252a", "#e0e2e5", "#b2b6bb", "#000000"),
    dark: T("#272a2f", "#2f3338", "#383c42", "#1b1d21", "#202327", "#25282d", "#2b2e33", "#cdd1d6", "#6f747b", "#474b51", "#32363b", "#cdd1d6", "#40454b", "#2f3338", "#ffffff"),
  },
  pitch: {
    light: T("#56504a", "#615a53", "#6e665e", "#3a3530", "#433d38", "#4c4640", "#56504a", "#0e0c0a", "#26221e", "#34302b", "#45403a", "#d8d0c4", "#7c746b", "#5b544d", "#000000"),
    dark: T("#16130f", "#1b1713", "#201b16", "#0f0d0a", "#120f0c", "#15120e", "#191511", "#b5aa9b", "#5a5148", "#3a342d", "#26221d", "#b5aa9b", "#26211b", "#1c1814", "#ffffff"),
  },
};

export const MATERIALS = Object.keys(SETS);

export const MATERIAL_CSS = Object.entries(SETS)
  .map(([name, set]) => `[data-mat="${name}"]{${set.light}}.iso[data-theme="dark"] [data-mat="${name}"]{${set.dark}}`)
  .join("\n");
