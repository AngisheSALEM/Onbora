"""
Vectorize Onbora's Owl into clean SVG paths scaled to 256x256.
Supports solid Cobalt Blue (#4F6CE8), Duo-tone, and Gradient variants.
"""
import cv2
import numpy as np

img = cv2.imread('frontend/public/icone_onbora.jpeg', cv2.IMREAD_GRAYSCALE)
# Smooth slight jpeg compression artifacts
blurred = cv2.GaussianBlur(img, (3, 3), 0)
_, thresh = cv2.threshold(blurred, 180, 255, cv2.THRESH_BINARY_INV)

contours, hierarchy = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_TC89_L1)

# Sort contours by area
contours = sorted(contours, key=lambda c: cv2.contourArea(c), reverse=True)

# Combine bounding box
all_pts = np.vstack(contours)
min_x, min_y = all_pts[:, 0, 0].min(), all_pts[:, 0, 1].min()
max_x, max_y = all_pts[:, 0, 0].max(), all_pts[:, 0, 1].max()

orig_w = max_x - min_x
orig_h = max_y - min_y

# Scale to fit nicely in 256x256 with 24px vertical padding
target_h = 208.0
scale = target_h / orig_h
target_w = orig_w * scale

offset_x = (256.0 - target_w) / 2.0 - (min_x * scale)
offset_y = (256.0 - target_h) / 2.0 - (min_y * scale)

COBALT = "#4F6CE8"
DEEP_NAVY = "#1B2A6B"
LIGHT_BLUE = "#7896FF"
DARK_WARM = "#242124"

def contour_to_svg_path(contour, eps=0.8):
    approx = cv2.approxPolyDP(contour, eps, True)
    pts = approx.reshape(-1, 2)
    
    # Scale and translate points
    scaled_pts = []
    for x, y in pts:
        sx = round(x * scale + offset_x, 2)
        sy = round(y * scale + offset_y, 2)
        scaled_pts.append((sx, sy))
        
    if not scaled_pts:
        return ""
        
    # Build smooth SVG path
    d = [f"M {scaled_pts[0][0]} {scaled_pts[0][1]}"]
    for pt in scaled_pts[1:]:
        d.append(f"L {pt[0]} {pt[1]}")
    d.append("Z")
    return " ".join(d)

paths = [contour_to_svg_path(c, eps=0.8) for c in contours]

# -----------------------------------------------------------------------------
# Concept 1: Hibou Pure Cobalt (#4F6CE8)
# Pure vector faithful reproduction of Onbora's iconic owl in brand Cobalt.
# -----------------------------------------------------------------------------
owl_pure_cobalt = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" fill="none">
  <title>Onbora — Hibou Cobalt Pur</title>
  <g fill="{COBALT}">
    {"".join(f'<path d="{p}"/>' for p in paths)}
  </g>
</svg>'''

# -----------------------------------------------------------------------------
# Concept 2: Hibou Duo-Tone (Cobalt #4F6CE8 + Électrique #7896FF)
# Body in Cobalt, accent feather / ear elements in lighter contrast.
# -----------------------------------------------------------------------------
owl_duo_tone = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" fill="none">
  <title>Onbora — Hibou Duo-Tone</title>
  <!-- Main Owl Body -->
  <path d="{paths[0]}" fill="{COBALT}"/>
  <!-- Accent wing / ear feathers in energetic blue -->
  <path d="{paths[1]}" fill="{LIGHT_BLUE}"/>
  <path d="{paths[2]}" fill="{LIGHT_BLUE}"/>
</svg>'''

# -----------------------------------------------------------------------------
# Concept 3: Hibou Gradient Royal (#4F6CE8 -> #3250DB)
# Modern tech gradient depth across the owl.
# -----------------------------------------------------------------------------
owl_gradient = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" fill="none">
  <title>Onbora — Hibou Gradient Royal</title>
  <defs>
    <linearGradient id="onboraOwlGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6B88FF"/>
      <stop offset="60%" stop-color="{COBALT}"/>
      <stop offset="100%" stop-color="#2D48C4"/>
    </linearGradient>
  </defs>
  <g fill="url(#onboraOwlGrad)">
    {"".join(f'<path d="{p}"/>' for p in paths)}
  </g>
</svg>'''

# Make Lockups
def make_lockup(symbol_inner, name):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 256" width="760" height="256" fill="none">
  <title>Onbora Lockup — {name}</title>
  <g transform="translate(48, 48) scale(0.625)">
    {symbol_inner}
  </g>
  <text x="248" y="148" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, sans-serif" font-size="76" font-weight="700" letter-spacing="-2.5" fill="{DARK_WARM}">On<tspan fill="{COBALT}">bora</tspan></text>
  <text x="252" y="184" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, sans-serif" font-size="16" font-weight="600" letter-spacing="4" fill="#71717A">COPILOTE IA COMMERCIAL B2B</text>
</svg>'''

def get_inner(svg_str):
    s = svg_str.find(">") + 1
    e = svg_str.rfind("</svg>")
    inner = svg_str[s:e].strip()
    if "<title>" in inner:
        inner = inner[inner.find("</title>") + 8:].strip()
    return inner

with open("branding/owl-pure-cobalt.svg", "w", encoding="utf-8") as f:
    f.write(owl_pure_cobalt)

with open("branding/owl-duo-tone.svg", "w", encoding="utf-8") as f:
    f.write(owl_duo_tone)

with open("branding/owl-gradient.svg", "w", encoding="utf-8") as f:
    f.write(owl_gradient)

with open("branding/owl-pure-cobalt-lockup.svg", "w", encoding="utf-8") as f:
    f.write(make_lockup(get_inner(owl_pure_cobalt), "Hibou Cobalt Pur"))

with open("branding/owl-duo-tone-lockup.svg", "w", encoding="utf-8") as f:
    f.write(make_lockup(get_inner(owl_duo_tone), "Hibou Duo-Tone"))

with open("branding/owl-gradient-lockup.svg", "w", encoding="utf-8") as f:
    f.write(make_lockup(get_inner(owl_gradient), "Hibou Gradient Royal"))

print("Successfully vectorized Onbora Owl into 3 distinct blue treatments!")
