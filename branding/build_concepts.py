"""
Refined SVG generation for Onbora logo concepts with exact geometry and zero near-miss angles.
"""
import math

COBALT = "#4F6CE8"
DEEP_NAVY = "#1B2A6B"
LIGHT_BLUE = "#7896FF"
DARK_WARM = "#242124"
WHITE = "#FFFFFF"

# -------------------------------------------------------------
# CONCEPT A: L'Orbite Active (Dynamic Orbit O)
# Centered arc R=82, stroke 26, smooth aperture with orbital node.
# -------------------------------------------------------------
concept_a = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" fill="none">
  <title>Onbora — L'Orbite Active</title>
  <g transform="rotate(-30 128 128)">
    <!-- Sweeping orbital arc -->
    <path d="M 128 38 A 90 90 0 1 0 215 106" stroke="{COBALT}" stroke-width="28" stroke-linecap="round"/>
    <!-- Guiding AI beacon node -->
    <circle cx="204" cy="62" r="15" fill="{COBALT}"/>
  </g>
</svg>'''

# -------------------------------------------------------------
# CONCEPT B: L'Alliance (Synergy & Dual Handoff)
# Two interlocking arcs in solid Cobalt Blue and Deep Navy (zero opacity hack).
# -------------------------------------------------------------
concept_b = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" fill="none">
  <title>Onbora — L'Alliance</title>
  <!-- Primary Cobalt Arc (MSP & Copilot) -->
  <path d="M 64 74 A 86 86 0 0 1 198 84" stroke="{COBALT}" stroke-width="26" stroke-linecap="round"/>
  <path d="M 64 74 C 34 104 34 152 64 182" stroke="{COBALT}" stroke-width="26" stroke-linecap="round"/>
  <!-- Secondary Deep Navy Arc (Client B2B & KAM Convergence) -->
  <path d="M 192 182 A 86 86 0 0 1 58 172" stroke="{LIGHT_BLUE}" stroke-width="26" stroke-linecap="round"/>
  <path d="M 192 182 C 222 152 222 104 192 74" stroke="{LIGHT_BLUE}" stroke-width="26" stroke-linecap="round"/>
</svg>'''

# -------------------------------------------------------------
# CONCEPT C: Le Nexus Horizon (Direction & Foresight O)
# Monolithic ring with mathematically exact 30°/60° chevron in counter.
# -------------------------------------------------------------
# Chevron math: Tip at (150, 128), Base at X=108, Y = 128 +- 42 * tan(30°) = 128 +- 24.2487
y_top = round(128 - 42 * math.tan(math.radians(30)), 2)   # 103.75
y_bot = round(128 + 42 * math.tan(math.radians(30)), 2)   # 152.25

concept_c = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" fill="none">
  <title>Onbora — Le Nexus Horizon</title>
  <g fill="{COBALT}">
    <!-- Primary monolithic ring -->
    <path fill-rule="evenodd" clip-rule="evenodd" d="
      M 128 32
      C 181.019 32 224 74.981 224 128
      C 224 181.019 181.019 224 128 224
      C 74.981 224 32 181.019 32 128
      C 32 74.981 74.981 32 128 32
      Z
      M 128 66
      C 93.758 66 66 93.758 66 128
      C 66 162.242 93.758 190 128 190
      C 162.242 190 190 162.242 190 128
      C 190 93.758 162.242 66 128 66
      Z
    "/>
    <!-- Directional supersonic chevron with exact 30-degree angles -->
    <path d="M 108 {y_top} L 150 128 L 108 {y_bot} L 120 128 Z"/>
  </g>
</svg>'''

# -------------------------------------------------------------
# LOCKUPS (Height 256, Width 760)
# Vector typography for "Onbora" with Golden Ratio proportion
# -------------------------------------------------------------
def make_lockup(symbol_svg_inner, name):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 256" width="760" height="256" fill="none">
  <title>Onbora Lockup — {name}</title>
  <!-- Symbol scaled to 160x160 positioned at (48, 48) -->
  <g transform="translate(48, 48) scale(0.625)">
    {symbol_svg_inner}
  </g>
  <!-- Typography "Onbora" + subtitle -->
  <text x="248" y="148" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, sans-serif" font-size="76" font-weight="700" letter-spacing="-2.5" fill="{DARK_WARM}">On<tspan fill="{COBALT}">bora</tspan></text>
  <text x="252" y="184" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, sans-serif" font-size="16" font-weight="600" letter-spacing="4" fill="#71717A">COPILOTE IA COMMERCIAL B2B</text>
</svg>'''

with open("c:/Users/Salem/Documents/projet/Onbora/branding/concept-a.svg", "w", encoding="utf-8") as f:
    f.write(concept_a)

with open("c:/Users/Salem/Documents/projet/Onbora/branding/concept-b.svg", "w", encoding="utf-8") as f:
    f.write(concept_b)

with open("c:/Users/Salem/Documents/projet/Onbora/branding/concept-c.svg", "w", encoding="utf-8") as f:
    f.write(concept_c)

# Extract inner SVG for lockup
def extract_inner(svg_text):
    start = svg_text.find(">") + 1
    end = svg_text.rfind("</svg>")
    inner = svg_text[start:end].strip()
    # remove <title>
    if "<title>" in inner:
        inner = inner[inner.find("</title>") + 8:].strip()
    return inner

with open("c:/Users/Salem/Documents/projet/Onbora/branding/concept-a-lockup.svg", "w", encoding="utf-8") as f:
    f.write(make_lockup(extract_inner(concept_a), "Concept A"))

with open("c:/Users/Salem/Documents/projet/Onbora/branding/concept-b-lockup.svg", "w", encoding="utf-8") as f:
    f.write(make_lockup(extract_inner(concept_b), "Concept B"))

with open("c:/Users/Salem/Documents/projet/Onbora/branding/concept-c-lockup.svg", "w", encoding="utf-8") as f:
    f.write(make_lockup(extract_inner(concept_c), "Concept C"))

print("Successfully generated all concepts and lockups.")
