import * as fs from 'node:fs';
import * as path from 'node:path';

const OUTPUT_BASE = path.resolve(
  process.cwd(),
  'public/assets/characters/narrator'
);
const MOUTHS_DIR = path.join(OUTPUT_BASE, 'mouths');

type PoseName =
  | 'neutral'
  | 'explaining'
  | 'shocked'
  | 'sarcastic'
  | 'angry'
  | 'dizzy';

type VisemeName = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'X';

interface PoseConfig {
  eyebrows: string;
  eyes: string;
  armsAndHands: string;
  fxOverlay: string;
  headTiltDeg?: number;
}

/**
 * Geometría Maestra (TV-Quality Flat Vector 2D Cel-Shaded):
 * - Lienzo universal: viewBox="0 0 500 600"
 * - Centro geométrico de la cabeza: x = 250
 * - Ojos (dentro de gafas de marco grueso): Izquierdo (cx=202, cy=175), Derecho (cx=298, cy=175)
 * - Nariz: (x=250, y=184..210)
 * - Punto de anclaje matemático de la boca: (cx: 250, cy: 245) — ZONA 100% DESPEJADA EN LAS POSES
 * - Hoodie: Naranja eléctrico (#FF5A1F) con cel-shading (#CC3B08) y detalles oscuros (#111827)
 * - Bordes negros gruesos: stroke="#0B0F19" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"
 */
const POSES: Record<PoseName, PoseConfig> = {
  neutral: {
    eyebrows: `
      <path d="M 172 132 Q 202 123 228 130" stroke="#0B0F19" stroke-width="8" stroke-linecap="round" fill="none" />
      <path d="M 272 130 Q 298 123 328 132" stroke="#0B0F19" stroke-width="8" stroke-linecap="round" fill="none" />
    `,
    eyes: `
      <ellipse cx="202" cy="175" rx="13" ry="16" fill="#0B0F19" />
      <circle cx="207" cy="168" r="5" fill="#FFFFFF" />
      <circle cx="197" cy="181" r="2.5" fill="#FFFFFF" />
      <ellipse cx="298" cy="175" rx="13" ry="16" fill="#0B0F19" />
      <circle cx="303" cy="168" r="5" fill="#FFFFFF" />
      <circle cx="293" cy="181" r="2.5" fill="#FFFFFF" />
    `,
    armsAndHands: `
      <!-- Brazo izquierdo relajado -->
      <path d="M 122 365 C 92 420, 96 495, 118 565 L 162 565 C 148 505, 146 445, 160 395 Z" fill="#FF5A1F" stroke="#0B0F19" stroke-width="6" stroke-linejoin="round" />
      <path d="M 122 365 C 102 415, 102 485, 118 565 L 134 565 C 122 490, 122 425, 138 380 Z" fill="#CC3B08" />
      <!-- Brazo derecho relajado -->
      <path d="M 378 365 C 408 420, 404 495, 382 565 L 338 565 C 352 505, 354 445, 340 395 Z" fill="#FF5A1F" stroke="#0B0F19" stroke-width="6" stroke-linejoin="round" />
      <path d="M 378 365 C 398 415, 398 485, 382 565 L 366 565 C 378 490, 378 425, 362 380 Z" fill="#CC3B08" />
    `,
    fxOverlay: '',
  },

  explaining: {
    eyebrows: `
      <path d="M 170 124 Q 202 110 230 124" stroke="#0B0F19" stroke-width="8" stroke-linecap="round" fill="none" />
      <path d="M 270 128 Q 298 118 330 128" stroke="#0B0F19" stroke-width="8" stroke-linecap="round" fill="none" />
    `,
    eyes: `
      <ellipse cx="202" cy="174" rx="14" ry="17" fill="#0B0F19" />
      <circle cx="207" cy="167" r="5.5" fill="#FFFFFF" />
      <ellipse cx="298" cy="174" rx="14" ry="17" fill="#0B0F19" />
      <circle cx="303" cy="167" r="5.5" fill="#FFFFFF" />
    `,
    armsAndHands: `
      <!-- Brazo izquierdo en cadera -->
      <path d="M 122 365 C 82 415, 86 490, 114 565 L 156 565 C 138 500, 140 440, 158 395 Z" fill="#FF5A1F" stroke="#0B0F19" stroke-width="6" stroke-linejoin="round" />
      <!-- Brazo derecho levantado apuntando una idea clave -->
      <path d="M 374 360 C 425 340, 448 295, 442 238 L 402 242 C 404 285, 388 318, 350 338 Z" fill="#FF5A1F" stroke="#0B0F19" stroke-width="6" stroke-linejoin="round" />
      <rect x="398" y="230" width="48" height="18" rx="7" fill="#111827" stroke="#0B0F19" stroke-width="6" stroke-linejoin="round" />
      <!-- Mano derecha con dedo índice levantado (cel-shaded) -->
      <circle cx="422" cy="204" r="22" fill="#FDBA74" stroke="#0B0F19" stroke-width="6" stroke-linejoin="round" />
      <path d="M 412 198 L 412 158 C 412 149, 428 149, 428 158 L 428 198 Z" fill="#FDBA74" stroke="#0B0F19" stroke-width="6" stroke-linejoin="round" />
    `,
    fxOverlay: `
      <!-- Destellos de énfasis editorial -->
      <path d="M 420 132 L 420 114 M 444 144 L 458 132 M 396 144 L 382 132" stroke="#FF5A1F" stroke-width="6" stroke-linecap="round" />
    `,
  },

  shocked: {
    eyebrows: `
      <path d="M 166 108 Q 202 90 232 112" stroke="#0B0F19" stroke-width="8.5" stroke-linecap="round" fill="none" />
      <path d="M 268 112 Q 298 90 334 108" stroke="#0B0F19" stroke-width="8.5" stroke-linecap="round" fill="none" />
    `,
    eyes: `
      <circle cx="202" cy="175" r="20" fill="#FFFFFF" stroke="#0B0F19" stroke-width="5" />
      <circle cx="202" cy="175" r="7" fill="#0B0F19" />
      <circle cx="205" cy="172" r="3" fill="#FFFFFF" />
      <circle cx="298" cy="175" r="20" fill="#FFFFFF" stroke="#0B0F19" stroke-width="5" />
      <circle cx="298" cy="175" r="7" fill="#0B0F19" />
      <circle cx="301" cy="172" r="3" fill="#FFFFFF" />
    `,
    armsAndHands: `
      <!-- Ambos brazos levantados en gesto de impacto -->
      <path d="M 124 360 C 68 320, 62 255, 98 205 L 130 225 C 106 262, 112 308, 152 338 Z" fill="#FF5A1F" stroke="#0B0F19" stroke-width="6" stroke-linejoin="round" />
      <path d="M 376 360 C 432 320, 438 255, 402 205 L 370 225 C 394 262, 388 308, 348 338 Z" fill="#FF5A1F" stroke="#0B0F19" stroke-width="6" stroke-linejoin="round" />
      <circle cx="116" cy="204" r="20" fill="#FDBA74" stroke="#0B0F19" stroke-width="6" stroke-linejoin="round" />
      <circle cx="384" cy="204" r="20" fill="#FDBA74" stroke="#0B0F19" stroke-width="6" stroke-linejoin="round" />
    `,
    fxOverlay: `
      <!-- Líneas de impacto cómico y gota de sudor -->
      <path d="M 88 118 L 58 96 M 78 150 L 44 142 M 412 118 L 442 96 M 422 150 L 456 142" stroke="#FF5A1F" stroke-width="6" stroke-linecap="round" />
      <path d="M 352 126 C 362 146, 362 158, 352 162 C 342 158, 342 146, 352 126 Z" fill="#38BDF8" stroke="#0B0F19" stroke-width="4" stroke-linejoin="round" />
    `,
  },

  sarcastic: {
    eyebrows: `
      <path d="M 168 140 L 230 138" stroke="#0B0F19" stroke-width="8" stroke-linecap="round" fill="none" />
      <path d="M 270 122 Q 302 102 332 120" stroke="#0B0F19" stroke-width="8" stroke-linecap="round" fill="none" />
    `,
    eyes: `
      <!-- Ojos entrecerrados con párpado superior cel-shaded -->
      <ellipse cx="202" cy="177" rx="14" ry="13" fill="#0B0F19" />
      <circle cx="206" cy="179" r="4" fill="#FFFFFF" />
      <path d="M 176 156 L 228 156 L 228 172 L 176 172 Z" fill="#F59E0B" />
      <line x1="176" y1="172" x2="228" y2="172" stroke="#0B0F19" stroke-width="6" stroke-linecap="round" />

      <ellipse cx="298" cy="176" rx="14" ry="14" fill="#0B0F19" />
      <circle cx="302" cy="176" r="4.5" fill="#FFFFFF" />
      <path d="M 272 156 L 324 156 L 324 168 L 272 168 Z" fill="#F59E0B" />
      <line x1="272" y1="168" x2="324" y2="168" stroke="#0B0F19" stroke-width="6" stroke-linecap="round" />
    `,
    armsAndHands: `
      <!-- Brazos cruzados sobre el pecho -->
      <path d="M 122 365 C 94 410, 108 465, 165 468 L 335 468 C 392 465, 406 410, 378 365 L 342 385 C 354 412, 344 430, 312 430 L 188 430 C 156 430, 146 412, 158 385 Z" fill="#FF5A1F" stroke="#0B0F19" stroke-width="6" stroke-linejoin="round" />
      <path d="M 162 440 L 338 440" stroke="#111827" stroke-width="8" stroke-linecap="round" />
      <circle cx="168" cy="442" r="18" fill="#FDBA74" stroke="#0B0F19" stroke-width="6" />
      <circle cx="332" cy="442" r="18" fill="#FDBA74" stroke="#0B0F19" stroke-width="6" />
    `,
    fxOverlay: '',
  },

  angry: {
    eyebrows: `
      <path d="M 168 118 L 232 142" stroke="#0B0F19" stroke-width="9" stroke-linecap="round" fill="none" />
      <path d="M 332 118 L 268 142" stroke="#0B0F19" stroke-width="9" stroke-linecap="round" fill="none" />
    `,
    eyes: `
      <ellipse cx="202" cy="176" rx="13" ry="14" fill="#0B0F19" />
      <circle cx="205" cy="173" r="4" fill="#EF4444" />
      <ellipse cx="298" cy="176" rx="13" ry="14" fill="#0B0F19" />
      <circle cx="301" cy="173" r="4" fill="#EF4444" />
    `,
    armsAndHands: `
      <!-- Puños cerrados en tensión -->
      <path d="M 122 365 C 74 345, 66 292, 92 252 L 130 268 C 114 295, 118 328, 152 345 Z" fill="#FF5A1F" stroke="#0B0F19" stroke-width="6" stroke-linejoin="round" />
      <path d="M 378 365 C 426 345, 434 292, 408 252 L 370 268 C 386 295, 382 328, 348 345 Z" fill="#FF5A1F" stroke="#0B0F19" stroke-width="6" stroke-linejoin="round" />
      <rect x="78" y="226" width="42" height="38" rx="14" fill="#FDBA74" stroke="#0B0F19" stroke-width="6" stroke-linejoin="round" />
      <rect x="380" y="226" width="42" height="38" rx="14" fill="#FDBA74" stroke="#0B0F19" stroke-width="6" stroke-linejoin="round" />
    `,
    fxOverlay: `
      <!-- Símbolo de vena cómica de frustración -->
      <path d="M 334 92 L 346 106 L 334 120 M 362 92 L 350 106 L 362 120" stroke="#EF4444" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none" />
    `,
  },

  dizzy: {
    eyebrows: `
      <path d="M 168 126 Q 200 142 230 120" stroke="#0B0F19" stroke-width="7.5" stroke-linecap="round" fill="none" />
      <path d="M 270 120 Q 300 142 332 126" stroke="#0B0F19" stroke-width="7.5" stroke-linecap="round" fill="none" />
    `,
    eyes: `
      <!-- Espirales de mareo dentro de las gafas -->
      <path d="M 202 175 m -3 0 a 3 3 0 1 0 6 0 a 8 8 0 1 0 -16 0 a 13 13 0 1 0 26 0" stroke="#0B0F19" stroke-width="4.5" stroke-linecap="round" fill="none" />
      <path d="M 298 175 m -3 0 a 3 3 0 1 0 6 0 a 8 8 0 1 0 -16 0 a 13 13 0 1 0 26 0" stroke="#0B0F19" stroke-width="4.5" stroke-linecap="round" fill="none" />
    `,
    armsAndHands: `
      <path d="M 122 365 C 84 425, 90 500, 110 565 L 154 565 C 140 505, 140 445, 158 395 Z" fill="#FF5A1F" stroke="#0B0F19" stroke-width="6" stroke-linejoin="round" />
      <path d="M 378 365 C 416 425, 410 500, 390 565 L 346 565 C 360 505, 360 445, 342 395 Z" fill="#FF5A1F" stroke="#0B0F19" stroke-width="6" stroke-linejoin="round" />
    `,
    fxOverlay: `
      <!-- Órbita y estrellas de confusión -->
      <ellipse cx="250" cy="44" rx="105" ry="20" stroke="#FACC15" stroke-width="5" stroke-dasharray="12 8" fill="none" />
      <polygon points="145,34 150,44 160,46 152,53 154,63 145,57 136,63 138,53 130,46 140,44" fill="#FACC15" stroke="#0B0F19" stroke-width="3" stroke-linejoin="round" />
      <polygon points="355,34 360,44 370,46 362,53 364,63 355,57 346,63 348,53 340,46 350,44" fill="#FACC15" stroke="#0B0F19" stroke-width="3" stroke-linejoin="round" />
      <polygon points="250,14 255,24 265,26 257,33 259,43 250,37 241,43 243,33 235,26 245,24" fill="#FF5A1F" stroke="#0B0F19" stroke-width="3" stroke-linejoin="round" />
    `,
  },
};

function renderPoseSvg(pose: PoseName, cfg: PoseConfig): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 600" width="500" height="600" fill="none" data-pose="${pose}">
  <!-- ===================================================================== -->
  <!-- CAPA 1: SOMBRA DE FONDO & CAPUCHA TRASERA DEL HOODIE (#FF5A1F)        -->
  <!-- ===================================================================== -->
  <ellipse cx="250" cy="576" rx="148" ry="14" fill="#0B0F19" opacity="0.45" />
  <path d="M 142 332 C 132 282, 175 262, 250 262 C 325 262, 368 282, 358 332 Z" fill="#CC3B08" stroke="#0B0F19" stroke-width="6" stroke-linejoin="round" />

  <!-- ===================================================================== -->
  <!-- CAPA 2: TORSO HOODIE NARANJA ELÉCTRICO (#FF5A1F) + CEL-SHADING        -->
  <!-- ===================================================================== -->
  <path d="M 116 570 C 116 405, 152 332, 250 332 C 348 332, 384 405, 384 570 Z" fill="#FF5A1F" stroke="#0B0F19" stroke-width="6" stroke-linejoin="round" />
  <!-- Sombra Cel-Shaded lateral derecha del torso -->
  <path d="M 250 335 C 338 335, 376 405, 380 567 L 318 567 C 318 445, 294 375, 250 335 Z" fill="#CC3B08" />
  <!-- Detalle oscuro central en V (camiseta interior + cuello del hoodie) -->
  <path d="M 192 334 L 250 412 L 308 334 Z" fill="#111827" stroke="#0B0F19" stroke-width="6" stroke-linejoin="round" />
  <!-- Bolsillo canguro y costuras oscuras -->
  <path d="M 176 485 L 324 485 L 338 567 L 162 567 Z" fill="#E04812" stroke="#0B0F19" stroke-width="6" stroke-linejoin="round" />
  <!-- Cordones oscuros del hoodie con herrajes -->
  <path d="M 224 378 L 218 462" stroke="#111827" stroke-width="8" stroke-linecap="round" />
  <path d="M 276 378 L 282 462" stroke="#111827" stroke-width="8" stroke-linecap="round" />
  <rect x="213" y="456" width="10" height="18" rx="4" fill="#F8FAFC" stroke="#0B0F19" stroke-width="4" />
  <rect x="277" y="456" width="10" height="18" rx="4" fill="#F8FAFC" stroke="#0B0F19" stroke-width="4" />

  <!-- ===================================================================== -->
  <!-- CAPA 3: BRAZOS Y MANOS SEGÚN LA POSE                                  -->
  <!-- ===================================================================== -->
  ${cfg.armsAndHands.trim()}

  <!-- ===================================================================== -->
  <!-- CAPA 4: CUELLO CON SOMBRA CEL-SHADED                                  -->
  <!-- ===================================================================== -->
  <rect x="220" y="274" width="60" height="72" rx="22" fill="#FDBA74" stroke="#0B0F19" stroke-width="6" stroke-linejoin="round" />
  <path d="M 223 288 C 242 312, 268 314, 277 298 L 277 278 L 223 278 Z" fill="#EA580C" opacity="0.45" />

  <!-- ===================================================================== -->
  <!-- CAPA 5: OREJAS Y CABEZA BASE (SIN BOCA EN 250, 245)                   -->
  <!-- ===================================================================== -->
  <!-- Oreja izquierda -->
  <circle cx="144" cy="188" r="22" fill="#FDBA74" stroke="#0B0F19" stroke-width="6" stroke-linejoin="round" />
  <path d="M 138 182 Q 146 188 140 196" stroke="#EA580C" stroke-width="5" stroke-linecap="round" fill="none" />
  <!-- Oreja derecha -->
  <circle cx="356" cy="188" r="22" fill="#F59E0B" stroke="#0B0F19" stroke-width="6" stroke-linejoin="round" />
  <path d="M 362 182 Q 354 188 360 196" stroke="#B45309" stroke-width="5" stroke-linecap="round" fill="none" />

  <!-- Rostro principal -->
  <rect x="148" y="84" width="204" height="210" rx="86" fill="#FDBA74" stroke="#0B0F19" stroke-width="6" stroke-linejoin="round" />
  <!-- Sombreado Cel-Shaded lateral derecho de la cara -->
  <path d="M 268 86 C 322 92, 349 132, 349 189 C 349 248, 314 288, 258 291 C 296 274, 322 236, 322 186 C 322 136, 298 102, 268 86 Z" fill="#F59E0B" opacity="0.55" />

  <!-- ===================================================================== -->
  <!-- CAPA 6: OJOS Y GAFAS DE MARCO GRUESO                                  -->
  <!-- ===================================================================== -->
  <!-- Fondo blanco suave de los lentes -->
  <rect x="162" y="146" width="80" height="58" rx="16" fill="#FFFFFF" fill-opacity="0.35" />
  <rect x="258" y="146" width="80" height="58" rx="16" fill="#FFFFFF" fill-opacity="0.35" />

  <!-- Ojos de la pose -->
  ${cfg.eyes.trim()}

  <!-- Reflejo diagonal cel-shaded en los cristales -->
  <path d="M 172 194 L 194 154" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round" opacity="0.7" />
  <path d="M 268 194 L 290 154" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round" opacity="0.7" />

  <!-- Montura gruesa de las gafas -->
  <rect x="160" y="145" width="82" height="60" rx="16" fill="none" stroke="#0B0F19" stroke-width="9" stroke-linejoin="round" />
  <rect x="258" y="145" width="82" height="60" rx="16" fill="none" stroke="#0B0F19" stroke-width="9" stroke-linejoin="round" />
  <!-- Puente y patillas de las gafas -->
  <path d="M 242 172 Q 250 166 258 172" stroke="#0B0F19" stroke-width="9" stroke-linecap="round" fill="none" />
  <line x1="146" y1="170" x2="160" y2="170" stroke="#0B0F19" stroke-width="8" stroke-linecap="round" />
  <line x1="340" y1="170" x2="354" y2="170" stroke="#0B0F19" stroke-width="8" stroke-linecap="round" />

  <!-- Nariz (termina en y=210 para dejar libre la coordenada de la boca en 250, 245) -->
  <path d="M 250 182 L 241 206 L 256 210" stroke="#0B0F19" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none" />

  <!-- NOTA GEOMÉTRICA: Zona (cx: 250, cy: 245) reservada 100% limpia para superposición de visemas -->

  <!-- ===================================================================== -->
  <!-- CAPA 7: CABELLO CON MECHÓN FRONTAL DINÁMICO Y CEJAS                   -->
  <!-- ===================================================================== -->
  <path d="M 146 150 C 138 92, 182 52, 252 54 C 318 54, 362 90, 354 150 C 342 118, 314 102, 282 100 C 266 118, 242 128, 214 124 C 228 108, 232 96, 226 90 C 192 98, 164 120, 146 150 Z" fill="#111827" stroke="#0B0F19" stroke-width="6" stroke-linejoin="round" />
  <!-- Mechón frontal dinámico con volumen e iluminación cel-shaded -->
  <path d="M 212 64 C 248 40, 304 48, 326 84 C 296 80, 268 96, 244 126 C 248 98, 236 78, 212 64 Z" fill="#1E293B" stroke="#0B0F19" stroke-width="6" stroke-linejoin="round" />
  <path d="M 232 66 C 258 56, 286 60, 304 76" stroke="#475569" stroke-width="5" stroke-linecap="round" fill="none" />

  <!-- Cejas expresivas -->
  ${cfg.eyebrows.trim()}

  <!-- ===================================================================== -->
  <!-- CAPA 8: EFECTOS SECUNDARIOS DE LA POSE                                -->
  <!-- ===================================================================== -->
  ${cfg.fxOverlay.trim()}
</svg>
`;
}

/**
 * Set de 9 Visemas de Rhubarb (A, B, C, D, E, F, G, H, X)
 * Todos en `<svg viewBox="0 0 500 600">` y anclados matemáticamente en `(cx: 250, cy: 245)`.
 * Estilo Flat Vector 2D con bordes negros gruesos (`stroke-width="6"`), cavidad oscura (`#2A0810`),
 * dientes estilizados (`#FFFFFF`) y lengua cel-shaded (`#F43F5E` / `#FB7185`).
 */
const MOUTH_SHAPES: Record<VisemeName, string> = {
  // A: Boca cerrada con presión labial para sonidos P, B, M en (250, 245)
  A: `
    <path d="M 216 245 Q 250 249 284 245" stroke="#0B0F19" stroke-width="7" stroke-linecap="round" fill="none" />
    <path d="M 212 241 Q 216 245 212 249 M 288 241 Q 284 245 288 249" stroke="#0B0F19" stroke-width="5" stroke-linecap="round" fill="none" />
    <path d="M 234 254 Q 250 258 266 254" stroke="#EA580C" stroke-width="4" stroke-linecap="round" fill="none" />
  `,

  // B: Labios entreabiertos con dientes juntos visibles para sonidos K, S, T, D, N, Z en (250, 245)
  B: `
    <rect x="212" y="232" width="76" height="26" rx="13" fill="#2A0810" stroke="#0B0F19" stroke-width="6" stroke-linejoin="round" />
    <rect x="218" y="235" width="64" height="11" rx="4" fill="#FFFFFF" />
    <rect x="222" y="246" width="56" height="8" rx="3" fill="#E2E8F0" />
    <line x1="216" y1="245" x2="284" y2="245" stroke="#0B0F19" stroke-width="3.5" />
    <rect x="212" y="232" width="76" height="26" rx="13" fill="none" stroke="#0B0F19" stroke-width="6" stroke-linejoin="round" />
  `,

  // C: Vocal abierta media (EH, AE) centrada en (250, 245)
  C: `
    <path d="M 210 230 Q 250 225 290 230 C 294 264, 206 264, 210 230 Z" fill="#2A0810" stroke="#0B0F19" stroke-width="6" stroke-linejoin="round" />
    <path d="M 217 232 Q 250 228 283 232 L 280 241 L 220 241 Z" fill="#FFFFFF" />
    <ellipse cx="250" cy="253" rx="24" ry="8" fill="#F43F5E" />
    <ellipse cx="246" cy="252" rx="14" ry="4.5" fill="#FB7185" />
    <path d="M 210 230 Q 250 225 290 230 C 294 264, 206 264, 210 230 Z" fill="none" stroke="#0B0F19" stroke-width="6" stroke-linejoin="round" />
  `,

  // D: Vocal muy abierta (AA, AH) gran apertura expresiva centrada en (250, 245)
  D: `
    <ellipse cx="250" cy="245" rx="38" ry="26" fill="#2A0810" stroke="#0B0F19" stroke-width="6" stroke-linejoin="round" />
    <path d="M 218 228 Q 250 221 282 228 L 278 238 L 222 238 Z" fill="#FFFFFF" />
    <ellipse cx="250" cy="259" rx="26" ry="11" fill="#F43F5E" />
    <ellipse cx="245" cy="257" rx="16" ry="6" fill="#FB7185" />
    <ellipse cx="250" cy="245" rx="38" ry="26" fill="none" stroke="#0B0F19" stroke-width="6" stroke-linejoin="round" />
  `,

  // E: Vocal redondeada media (AO, ER) centrada en (250, 245)
  E: `
    <ellipse cx="250" cy="245" rx="27" ry="20" fill="#2A0810" stroke="#0B0F19" stroke-width="6" stroke-linejoin="round" />
    <rect x="229" y="228" width="42" height="8" rx="3" fill="#FFFFFF" />
    <ellipse cx="250" cy="256" rx="17" ry="8" fill="#F43F5E" />
    <ellipse cx="247" cy="255" rx="10" ry="4.5" fill="#FB7185" />
    <ellipse cx="250" cy="245" rx="27" ry="20" fill="none" stroke="#0B0F19" stroke-width="6" stroke-linejoin="round" />
  `,

  // F: Labios fruncidos en "O/U" (UW, OW, W) centrados en (250, 245)
  F: `
    <circle cx="250" cy="245" r="15" fill="#2A0810" stroke="#0B0F19" stroke-width="6" stroke-linejoin="round" />
    <ellipse cx="250" cy="251" rx="8" ry="5" fill="#F43F5E" />
    <circle cx="250" cy="245" r="15" fill="none" stroke="#0B0F19" stroke-width="6" stroke-linejoin="round" />
    <path d="M 228 242 Q 233 245 228 248 M 272 242 Q 267 245 272 248" stroke="#0B0F19" stroke-width="4.5" stroke-linecap="round" fill="none" />
  `,

  // G: Dientes superiores sobre el labio inferior (F, V) centrado en (250, 245)
  G: `
    <path d="M 214 238 Q 250 256 286 238 C 282 258, 218 258, 214 238 Z" fill="#2A0810" stroke="#0B0F19" stroke-width="6" stroke-linejoin="round" />
    <rect x="222" y="235" width="56" height="11" rx="3" fill="#FFFFFF" stroke="#0B0F19" stroke-width="5" stroke-linejoin="round" />
    <line x1="240" y1="235" x2="240" y2="246" stroke="#0B0F19" stroke-width="3" />
    <line x1="260" y1="235" x2="260" y2="246" stroke="#0B0F19" stroke-width="3" />
  `,

  // H: Lengua elevada tocando el paladar detrás de los dientes (L, R) en (250, 245)
  H: `
    <rect x="214" y="231" width="72" height="28" rx="14" fill="#2A0810" stroke="#0B0F19" stroke-width="6" stroke-linejoin="round" />
    <rect x="220" y="233" width="60" height="8" rx="3" fill="#FFFFFF" />
    <path d="M 232 257 Q 250 235 268 257 Z" fill="#F43F5E" stroke="#0B0F19" stroke-width="3" stroke-linejoin="round" />
    <path d="M 238 256 Q 250 241 262 256 Z" fill="#FB7185" />
    <rect x="214" y="231" width="72" height="28" rx="14" fill="none" stroke="#0B0F19" stroke-width="6" stroke-linejoin="round" />
  `,

  // X: Boca en reposo / sonrisa confiada de presentador en (250, 245)
  X: `
    <path d="M 220 242 Q 250 254 280 242" stroke="#0B0F19" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round" fill="none" />
    <path d="M 216 239 Q 220 243 217 247 M 284 239 Q 280 243 283 247" stroke="#0B0F19" stroke-width="5" stroke-linecap="round" fill="none" />
  `,
};

function renderMouthSvg(viseme: VisemeName, innerSvg: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 600" width="500" height="600" fill="none" data-viseme="${viseme}" data-anchor="250,245">
  ${innerSvg.trim()}
</svg>
`;
}

function main(): void {
  fs.mkdirSync(MOUTHS_DIR, { recursive: true });

  const poseNames = Object.keys(POSES) as PoseName[];
  for (const pose of poseNames) {
    const filePath = path.join(OUTPUT_BASE, `${pose}.svg`);
    fs.writeFileSync(filePath, renderPoseSvg(pose, POSES[pose]), 'utf-8');
  }

  const visemeNames = Object.keys(MOUTH_SHAPES) as VisemeName[];
  for (const viseme of visemeNames) {
    const filePath = path.join(MOUTHS_DIR, `${viseme}.svg`);
    fs.writeFileSync(
      filePath,
      renderMouthSvg(viseme, MOUTH_SHAPES[viseme]),
      'utf-8'
    );
  }

  console.log(
    `✅ [TV-Quality SVG Rig 500x600] Generadas ${poseNames.length} poses en: ${OUTPUT_BASE}`
  );
  console.log(
    `✅ [Rhubarb Visemes @ (250, 245)] Generadas ${visemeNames.length} bocas en: ${MOUTHS_DIR}`
  );
}

main();
