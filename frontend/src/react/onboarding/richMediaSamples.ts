export const onboardingLottieSignal = {
  v: "5.7.4",
  fr: 30,
  ip: 0,
  op: 90,
  w: 240,
  h: 140,
  nm: "NEURODECK onboarding signal",
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: "cyan scan",
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [120, 70, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 0, k: [100, 100, 100] },
      },
      shapes: [
        {
          ty: "gr",
          it: [
            { ty: "rc", s: { a: 0, k: [168, 52] }, p: { a: 0, k: [0, 0] }, r: { a: 0, k: 8 } },
            { ty: "st", c: { a: 0, k: [0.37, 0.92, 1, 1] }, o: { a: 0, k: 100 }, w: { a: 0, k: 3 } },
            { ty: "fl", c: { a: 0, k: [0.37, 0.92, 1, 0.12] }, o: { a: 0, k: 20 } },
            { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
          ],
        },
      ],
      ip: 0,
      op: 90,
      st: 0,
      bm: 0,
    },
  ],
};

export const onboardingFallbackSvg =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180">
      <rect width="320" height="180" rx="18" fill="#071016"/>
      <rect x="42" y="42" width="236" height="96" rx="12" fill="none" stroke="#68f1ff" stroke-width="3"/>
      <path d="M70 92h58l18-24 25 50 18-26h62" fill="none" stroke="#7cffb2" stroke-width="4" stroke-linecap="round"/>
      <text x="54" y="150" fill="#9bb5c8" font-family="monospace" font-size="13">ONBOARDING SIGNAL READY</text>
    </svg>`,
  );

export const onboardingShaderSource = `
precision mediump float;
uniform float u_time;
varying vec2 v_uv;
void main() {
  float scan = sin((v_uv.y + u_time * 0.08) * 80.0) * 0.04;
  vec3 base = vec3(0.02, 0.07, 0.09);
  vec3 glow = vec3(0.20, 0.95, 1.0) * (0.16 + scan);
  gl_FragColor = vec4(base + glow, 1.0);
}
`;

export const onboardingSilentAudio =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=";

export const onboardingWebmPoster = onboardingFallbackSvg;
