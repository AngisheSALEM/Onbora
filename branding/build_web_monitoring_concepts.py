"""
Refined B2B Analysis + Web-wide Monitoring Concepts with exact centering and balance.
"""
import math

COBALT = "#4F6CE8"
DEEP_NAVY = "#1B2A6B"
ELECTRIC = "#7896FF"
DARK_WARM = "#242124"
WHITE = "#FFFFFF"

# -----------------------------------------------------------------------------
# CONCEPT 1: La Sentinelle Web (The Global Web Sentinel / 360° Radar O)
# Perfectly centered: X bounds [28, 228], Y bounds [28, 228]
# -----------------------------------------------------------------------------
concept_1_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" fill="none">
  <title>Onbora — La Sentinelle Web</title>
  <!-- Outer global web perimeter ring with listening apertures -->
  <path d="M 128 32 A 96 96 0 1 0 224 128" stroke="{COBALT}" stroke-width="24" stroke-linecap="round"/>
  <!-- Continuous web monitoring signal waves -->
  <path d="M 128 64 A 64 64 0 0 1 192 128" stroke="{ELECTRIC}" stroke-width="16" stroke-linecap="round"/>
  <path d="M 128 92 A 36 36 0 0 1 164 128" stroke="{COBALT}" stroke-width="12" stroke-linecap="round"/>
  <!-- Central AI Sentinel Nucleus -->
  <circle cx="128" cy="128" r="14" fill="{COBALT}"/>
  <!-- Web sensor nodes intercepting global signals -->
  <circle cx="214" cy="74" r="8" fill="{ELECTRIC}"/>
  <circle cx="174" cy="38" r="8" fill="{COBALT}"/>
  <circle cx="218" cy="128" r="8" fill="{ELECTRIC}"/>
</svg>'''

# -----------------------------------------------------------------------------
# CONCEPT 2: Le Réseau Orbital (The Global Web Crawler & Analytics Matrix)
# -----------------------------------------------------------------------------
concept_2_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" fill="none">
  <title>Onbora — Le Réseau Orbital</title>
  <!-- Global Web Meridian Outer Ring (Internet-wide presence) -->
  <circle cx="128" cy="128" r="94" stroke="{COBALT}" stroke-width="22"/>
  <!-- Intersecting global web longitude elliptical orbit -->
  <ellipse cx="128" cy="128" rx="44" ry="94" stroke="{ELECTRIC}" stroke-width="18"/>
  <!-- Horizontal web equator band -->
  <line x1="34" y1="128" x2="222" y2="128" stroke="{COBALT}" stroke-width="16" stroke-linecap="round"/>
  <!-- Central analytical intelligence aperture (focusing the crawl into B2B metric) -->
  <circle cx="128" cy="128" r="18" fill="{WHITE}"/>
  <circle cx="128" cy="128" r="12" fill="{COBALT}"/>
</svg>'''

# -----------------------------------------------------------------------------
# CONCEPT 3: L'Écoute IA (The Omniscient Web Pulse & Analytics Beacon)
# Perfectly symmetrical dual-wave 'O' with central spectrum
# -----------------------------------------------------------------------------
concept_3_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" fill="none">
  <title>Onbora — L'Écoute IA</title>
  <!-- West listening wave (Ingesting global internet signals) -->
  <path d="M 128 34 A 94 94 0 0 0 128 222" stroke="{COBALT}" stroke-width="24" stroke-linecap="round"/>
  <!-- East analytical wave (Structuring into B2B Intelligence) -->
  <path d="M 128 34 A 94 94 0 0 1 128 222" stroke="{ELECTRIC}" stroke-width="24" stroke-linecap="round"/>
  <!-- Central analytical pulse spectrum: 3 bars indicating active listening -->
  <line x1="96" y1="128" x2="96" y2="106" stroke="{COBALT}" stroke-width="12" stroke-linecap="round"/>
  <line x1="128" y1="128" x2="128" y2="84" stroke="{ELECTRIC}" stroke-width="14" stroke-linecap="round"/>
  <line x1="160" y1="128" x2="160" y2="106" stroke="{COBALT}" stroke-width="12" stroke-linecap="round"/>
  <!-- Baseline horizon scan axis -->
  <line x1="84" y1="128" x2="172" y2="128" stroke="{COBALT}" stroke-width="8" stroke-linecap="round"/>
</svg>'''

def make_lockup(symbol_inner, name):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 256" width="760" height="256" fill="none">
  <title>Onbora Lockup — {name}</title>
  <g transform="translate(48, 48) scale(0.625)">
    {symbol_inner}
  </g>
  <text x="248" y="148" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, sans-serif" font-size="76" font-weight="700" letter-spacing="-2.5" fill="{DARK_WARM}">On<tspan fill="{COBALT}">bora</tspan></text>
  <text x="252" y="184" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, sans-serif" font-size="16" font-weight="600" letter-spacing="4" fill="#71717A">VEILLE WEB GLOBALE &amp; ANALYSE B2B</text>
</svg>'''

def get_inner(svg_text):
    s = svg_text.find(">") + 1
    e = svg_text.rfind("</svg>")
    inner = svg_text[s:e].strip()
    if "<title>" in inner:
        inner = inner[inner.find("</title>") + 8:].strip()
    return inner

# Save SVGs
with open("branding/sentinel-radar.svg", "w", encoding="utf-8") as f:
    f.write(concept_1_svg)

with open("branding/orbital-network.svg", "w", encoding="utf-8") as f:
    f.write(concept_2_svg)

with open("branding/omnipresent-pulse.svg", "w", encoding="utf-8") as f:
    f.write(concept_3_svg)

with open("branding/sentinel-radar-lockup.svg", "w", encoding="utf-8") as f:
    f.write(make_lockup(get_inner(concept_1_svg), "La Sentinelle Web"))

with open("branding/orbital-network-lockup.svg", "w", encoding="utf-8") as f:
    f.write(make_lockup(get_inner(concept_2_svg), "Le Réseau Orbital"))

with open("branding/omnipresent-pulse-lockup.svg", "w", encoding="utf-8") as f:
    f.write(make_lockup(get_inner(concept_3_svg), "L'Écoute IA"))

print("Refined all concepts successfully!")
