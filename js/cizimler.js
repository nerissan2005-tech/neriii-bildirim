const HERO_SVG = '<svg viewBox="0 0 1000 380" preserveAspectRatio="xMaxYMid slice" aria-hidden="true"><defs>' +
  '<linearGradient id="hSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A1E45"/><stop offset=".32" stop-color="#5E3F72"/><stop offset=".6" stop-color="#B9708A"/><stop offset=".82" stop-color="#EE9F7C"/><stop offset="1" stop-color="#FAD09A"/></linearGradient>' +
  '<linearGradient id="hSea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C98C8C"/><stop offset=".35" stop-color="#7B4E72"/><stop offset="1" stop-color="#2B1B2E"/></linearGradient>' +
  '<radialGradient id="hSun" cx="810" cy="236" r="230" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFE9C4" stop-opacity=".95"/><stop offset=".25" stop-color="#FFC78E" stop-opacity=".55"/><stop offset="1" stop-color="#FFC78E" stop-opacity="0"/></radialGradient>' +
  '<radialGradient id="hStar" cx="700" cy="74" r="60" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFF6DE" stop-opacity=".9"/><stop offset=".3" stop-color="#FFF0D0" stop-opacity=".35"/><stop offset="1" stop-color="#FFF0D0" stop-opacity="0"/></radialGradient>' +
  '</defs>' +
  '<rect width="1000" height="250" fill="url(#hSky)"/>' +
  '<g fill="#FFF" opacity=".75"><circle cx="420" cy="40" r="1.2"/><circle cx="470" cy="96" r=".9"/><circle cx="540" cy="30" r="1"/><circle cx="590" cy="120" r=".8"/><circle cx="640" cy="36" r="1.1"/><circle cx="760" cy="90" r=".9"/><circle cx="830" cy="28" r="1.3"/><circle cx="880" cy="70" r=".8"/><circle cx="940" cy="40" r="1"/><circle cx="975" cy="110" r=".8"/><circle cx="360" cy="80" r=".9"/><circle cx="300" cy="30" r="1"/><circle cx="690" cy="140" r=".7"/></g>' +
  '<circle cx="700" cy="74" r="60" fill="url(#hStar)"/>' +
  '<path d="M700 38 L704.5 69.5 L736 74 L704.5 78.5 L700 110 L695.5 78.5 L664 74 L695.5 69.5 Z" fill="#FFF8E6"/>' +
  '<path d="M700 56 L702.4 71.6 L718 74 L702.4 76.4 L700 92 L697.6 76.4 L682 74 L697.6 71.6 Z" fill="#FFF8E6" opacity=".8" transform="rotate(45 700 74)"/>' +
  '<circle cx="700" cy="74" r="3.2" fill="#FFF"/>' +
  '<rect width="1000" height="380" fill="url(#hSun)"/>' +
  '<circle cx="810" cy="232" r="38" fill="#FFEBC6"/>' +
  '<path d="M0 240 L0 206 C 70 190 130 172 200 184 C 260 194 320 164 390 178 C 450 190 520 204 600 198 C 660 194 700 214 760 222 L1000 222 L1000 240 Z" fill="#8B5E80" opacity=".75"/>' +
  '<path d="M560 242 C 620 222 680 214 740 226 C 790 236 820 236 860 226 C 910 210 960 206 1000 212 L1000 244 L560 244 Z" fill="#5A3A5E"/>' +
  '<path d="M0 244 L0 214 C 60 214 140 202 220 224 C 270 236 320 240 360 244 Z" fill="#4D3253"/>' +
  '<rect y="242" width="1000" height="138" fill="url(#hSea)"/>' +
  '<g fill="#FFDDB0"><rect x="770" y="250" width="80" height="3" rx="1.5" opacity=".8"/><rect x="782" y="262" width="56" height="3" rx="1.5" opacity=".65"/><rect x="792" y="274" width="36" height="2.5" rx="1.25" opacity=".5"/><rect x="798" y="285" width="24" height="2" rx="1" opacity=".38"/><rect x="803" y="295" width="14" height="2" rx="1" opacity=".26"/></g>' +
  '<g fill="#FFF0D6" opacity=".35"><rect x="630" y="252" width="18" height="2" rx="1"/><rect x="636" y="262" width="8" height="1.5" rx=".75"/></g>' +
  '<path d="M0 380 L0 322 C 120 306 220 334 340 316 C 470 298 570 330 700 320 C 820 310 900 330 1000 314 L1000 380 Z" fill="#2B1B2E" opacity=".94"/>' +
  '<path d="M0 380 C 160 352 300 368 420 360 C 560 350 700 372 1000 352 L1000 380 Z" fill="#1E1220" opacity=".7"/>' +
  '<g fill="#1E1220"><path d="M650 276 h54 v46 a12 12 0 0 1 -12 12 h-30 a12 12 0 0 1 -12 -12 Z"/></g>' +
  '<path d="M704 288 c 20 0 20 28 0 28" fill="none" stroke="#1E1220" stroke-width="7"/>' +
  '<g fill="none" stroke="#FFF2E2" stroke-width="2" stroke-linecap="round" opacity=".38"><path d="M668 266 c -7 -10 7 -14 0 -26"/><path d="M686 264 c -7 -10 7 -14 0 -26"/></g>' +
  '<path d="M738 336 L 868 322 L 882 338 L 752 352 Z" fill="#3A2440"/>' +
  '<path d="M742 334 L 866 321" stroke="#6C4A6E" stroke-width="2"/>' +
  '<g fill="#8E6A8C"><circle cx="760" cy="333" r="1.6"/><circle cx="776" cy="331" r="1.6"/><circle cx="792" cy="329.5" r="1.6"/><circle cx="808" cy="328" r="1.6"/><circle cx="824" cy="326" r="1.6"/><circle cx="840" cy="324.5" r="1.6"/></g>' +
  '<g fill="#1E1220"><path d="M30 380 C 34 330 46 290 70 250 C 60 300 56 340 58 380 Z"/><path d="M58 380 C 70 340 94 310 128 292 C 104 322 90 350 84 380 Z"/><path d="M10 380 C 4 346 -10 320 -30 306 C 0 312 20 340 26 380 Z"/>' +
  '<path d="M968 380 C 962 340 948 306 924 282 C 948 296 970 330 984 380 Z"/><path d="M990 380 C 1000 344 1012 318 1030 300 L 1030 380 Z"/></g>' +
  '</svg>';

const ART_SVG = '<svg viewBox="0 0 300 340" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><defs>' +
  '<linearGradient id="aBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4A2E52"/><stop offset="1" stop-color="#26172A"/></linearGradient>' +
  '<linearGradient id="aWin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6E4D86"/><stop offset=".55" stop-color="#D98C8C"/><stop offset="1" stop-color="#F7C68F"/></linearGradient>' +
  '<radialGradient id="aGlow" cx="190" cy="220" r="170" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFC994" stop-opacity=".45"/><stop offset="1" stop-color="#FFC994" stop-opacity="0"/></radialGradient></defs>' +
  '<rect width="300" height="340" fill="url(#aBg)"/>' +
  '<path d="M120 250 V140 A70 70 0 0 1 260 140 V250 Z" fill="url(#aWin)"/>' +
  '<circle cx="222" cy="118" r="2.4" fill="#FFF6DE"/><circle cx="160" cy="132" r="1.2" fill="#FFF"/><circle cx="240" cy="160" r="1" fill="#FFF"/>' +
  '<path d="M190 66 V250 M120 170 H260" stroke="#2E1C33" stroke-width="6"/>' +
  '<path d="M120 250 V140 A70 70 0 0 1 260 140 V250" fill="none" stroke="#2E1C33" stroke-width="8"/>' +
  '<rect width="300" height="340" fill="url(#aGlow)"/>' +
  '<rect x="100" y="250" width="180" height="10" rx="3" fill="#2E1C33"/>' +
  '<path d="M0 340 L0 286 C 60 270 120 296 190 284 C 240 276 270 288 300 282 L300 340 Z" fill="#1E1220"/>' +
  '<g fill="#140B16"><ellipse cx="160" cy="292" rx="52" ry="20"/><circle cx="118" cy="280" r="16"/><path d="M106 270 l3 -16 l9 11 Z"/><path d="M121 266 l7 -14 l5 15 Z"/><path d="M206 298 c 26 6 22 28 -14 20 c 14 -2 22 -10 14 -20 Z"/></g>' +
  '<path d="M112 282 q4 2 8 0" stroke="#5A3E5E" stroke-width="1.5" fill="none" stroke-linecap="round"/>' +
  '<g fill="#140B16"><path d="M232 252 l6 -26 h26 l6 26 Z"/><path d="M250 226 C 246 206 236 196 226 192 C 240 196 252 208 252 226 Z"/><path d="M252 226 C 256 204 268 194 280 190 C 268 198 258 210 255 226 Z"/><path d="M251 226 C 250 206 252 190 258 180 C 258 196 256 212 254 226 Z"/></g>' +
  '</svg>';
