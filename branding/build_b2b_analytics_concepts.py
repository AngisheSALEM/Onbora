"""
Design 3 distinct B2B Analysis & Intelligence logo concepts for Onbora.
Color palette:
- Cobalt Blue: #4F6CE8 (Primary Onbora Blue)
- Deep Navy: #1B2A6B
- Electric Cyan/Light Blue: #7896FF / #5E81F4
- Dark Warm: #242124 (Canvas/Text)
- Pure White / Chalk: #F6F5F2
"""
import math

COBALT = "#4F6CE8"
DEEP_NAVY = "#1B2A6B"
ELECTRIC = "#7896FF"
DARK_WARM = "#242124"
WHITE = "#FFFFFF"

# -----------------------------------------------------------------------------
# CONCEPT 1: Le Prisme Analytique (Analytical Lens / Data Focus O)
# An 'O' composed of 3 precision analytical tiers focusing raw data into strategic insight.
# -----------------------------------------------------------------------------
concept_1_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" fill="none">
  <title>Onbora — Le Prisme Analytique</title>
  <!-- Outer strategic arc (Tier 1: Market Data) -->
  <path d="M 58 64 A 90 90 0 1 1 58 192" stroke="{COBALT}" stroke-width="24" stroke-linecap="round"/>
  <!-- Middle analytical arc (Tier 2: Business Signal) -->
  <path d="M 84 94 A 48 48 0 1 1 84 162" stroke="{ELECTRIC}" stroke-width="20" stroke-linecap="round"/>
  <!-- Focal insight core (Tier 3: Strategic Decision Node) -->
  <circle cx="160" cy="128" r="14" fill="{COBALT}"/>
  <!-- Focused analytical beam axis in negative space -->
  <line x1="46" y1="128" x2="74" y2="128" stroke="{COBALT}" stroke-width="12" stroke-linecap="round"/>
</svg>'''

# -----------------------------------------------------------------------------
# CONCEPT 2: Le Radar Décisionnel (B2B Radar & Signal Sweep O)
# An iconic 'O' merged with an analytical radar sweep and 3 ascending data indicators.
# -----------------------------------------------------------------------------
concept_2_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" fill="none">
  <title>Onbora — Le Radar Décisionnel</title>
  <!-- Main structural perimeter O ring with 45° analytic breach -->
  <path d="M 128 32 A 96 96 0 1 0 224 128" stroke="{COBALT}" stroke-width="26" stroke-linecap="round"/>
  <!-- 3 ascending metric bars integrated into the active quadrant -->
  <!-- Bar 1 (Baseline metric) -->
  <line x1="152" y1="120" x2="152" y2="84" stroke="{ELECTRIC}" stroke-width="14" stroke-linecap="round"/>
  <!-- Bar 2 (Scored insight) -->
  <line x1="178" y1="120" x2="178" y2="64" stroke="{COBALT}" stroke-width="14" stroke-linecap="round"/>
  <!-- Bar 3 (Strategic peak / Alpha opportunity) -->
  <line x1="204" y1="120" x2="204" y2="44" stroke="{ELECTRIC}" stroke-width="14" stroke-linecap="round"/>
  <!-- Radar sweep focal center -->
  <circle cx="128" cy="128" r="16" fill="{COBALT}"/>
</svg>'''

# -----------------------------------------------------------------------------
# CONCEPT 3: Le Nexus Matriciel (B2B Matrix & Synthesis O)
# Two faceted architectural blocks forming an 'O' with a dynamic upward analytical trend.
# -----------------------------------------------------------------------------
concept_3_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" fill="none">
  <title>Onbora — Le Nexus Matriciel</title>
  <g fill="{COBALT}">
    <!-- Primary lower-left analytical foundation block -->
    <path d="
      M 40 128
      C 40 79.39 79.39 40 128 40
      L 128 72
      C 97.07 72 72 97.07 72 128
      C 72 158.93 97.07 184 128 184
      L 128 216
      C 79.39 216 40 176.61 40 128
      Z
    "/>
    <!-- Ascending upper-right analytical growth block in Electric Blue -->
    <path d="
      M 128 40
      C 176.61 40 216 79.39 216 128
      L 184 128
      C 184 97.07 158.93 72 128 72
      Z
    " fill="{ELECTRIC}"/>
    <!-- Lower-right comparison sector -->
    <path d="
      M 216 128
      C 216 176.61 176.61 216 128 216
      L 128 184
      C 158.93 184 184 158.93 184 128
      Z
    "/>
    <!-- Internal growth vector representing business uplift -->
    <polygon points="106,146 150,102 150,126 126,150" fill="{ELECTRIC}"/>
  </g>
</svg>'''

def make_lockup(symbol_inner, name):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 256" width="760" height="256" fill="none">
  <title>Onbora Lockup — {name}</title>
  <g transform="translate(48, 48) scale(0.625)">
    {symbol_inner}
  </g>
  <text x="248" y="148" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, sans-serif" font-size="76" font-weight="700" letter-spacing="-2.5" fill="{DARK_WARM}">On<tspan fill="{COBALT}">bora</tspan></text>
  <text x="252" y="184" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, sans-serif" font-size="16" font-weight="600" letter-spacing="4" fill="#71717A">ANALYSE &amp; COPILOTE COMMERCIAL B2B</text>
</svg>'''

def get_inner(svg_text):
    s = svg_text.find(">") + 1
    e = svg_text.rfind("</svg>")
    inner = svg_text[s:e].strip()
    if "<title>" in inner:
        inner = inner[inner.find("</title>") + 8:].strip()
    return inner

# Save SVGs
with open("branding/analytics-lens.svg", "w", encoding="utf-8") as f:
    f.write(concept_1_svg)

with open("branding/analytics-radar.svg", "w", encoding="utf-8") as f:
    f.write(concept_2_svg)

with open("branding/analytics-matrix.svg", "w", encoding="utf-8") as f:
    f.write(concept_3_svg)

with open("branding/analytics-lens-lockup.svg", "w", encoding="utf-8") as f:
    f.write(make_lockup(get_inner(concept_1_svg), "Le Prisme Analytique"))

with open("branding/analytics-radar-lockup.svg", "w", encoding="utf-8") as f:
    f.write(make_lockup(get_inner(concept_2_svg), "Le Radar Décisionnel"))

with open("branding/analytics-matrix-lockup.svg", "w", encoding="utf-8") as f:
    f.write(make_lockup(get_inner(concept_3_svg), "Le Nexus Matriciel"))

print("Generated all B2B Analytics concepts successfully!")
