"""
Script officiel de génération des assets graphiques Onbora à partir de la nouvelle identité de marque.
Génère tous les logos (light & dark), favicons multi-résolutions, icônes web PWA, et icônes d'application mobile Flutter/Android.
"""

import os
from PIL import Image, ImageOps, ImageDraw
import numpy as np

SOURCE_PATH = r"C:/Users/Salem/.gemini/antigravity/brain/9f68ccdb-348c-4373-bd09-142bd8b8b75d/.user_uploaded/media_1793361233741_f61017ba.png"

def create_branding_assets():
    print(f"Loading source logo from: {SOURCE_PATH}")
    src_img = Image.open(SOURCE_PATH).convert("RGBA")
    arr = np.array(src_img)

    # 1. Bounding box du logo complet (Badge 'On' + 'bora')
    alpha = arr[:, :, 3]
    content_mask = alpha > 15
    y_indices, x_indices = np.where(content_mask)
    y_min, y_max = y_indices.min(), y_indices.max()
    x_min, x_max = x_indices.min(), x_indices.max()

    print(f"Full logo bbox: X=[{x_min}, {x_max}], Y=[{y_min}, {y_max}] (Size: {x_max - x_min + 1}x{y_max - y_min + 1})")

    # Crop précis du logo complet
    full_logo_light = src_img.crop((x_min, y_min, x_max + 1, y_max + 1))
    
    # 2. Création de la version Dark Mode du logo complet (Texte 'bora' blanc au lieu de noir)
    full_logo_arr = np.array(full_logo_light)
    full_logo_dark_arr = full_logo_arr.copy()
    
    # Repérage de la zone de texte 'bora' (à droite du badge bleu)
    # Dans full_logo_arr, le badge bleu s'arrête vers x ~ 330
    text_mask = (full_logo_dark_arr[:, 330:, 3] > 0)
    full_logo_dark_arr[:, 330:, 0][text_mask] = 255
    full_logo_dark_arr[:, 330:, 1][text_mask] = 255
    full_logo_dark_arr[:, 330:, 2][text_mask] = 255
    full_logo_dark = Image.fromarray(full_logo_dark_arr)

    # 3. Extraction du badge 'On' (l'icône / favicon sans 'bora')
    blue_mask = (arr[:, :, 2] > 180) & (arr[:, :, 0] < 120) & (arr[:, :, 1] < 150) & (arr[:, :, 3] > 40)
    b_y, b_x = np.where(blue_mask)
    badge_crop = src_img.crop((b_x.min(), b_y.min(), b_x.max() + 1, b_y.max() + 1))
    bw, bh = badge_crop.size
    print(f"Badge 'On' raw size: {bw}x{bh}")

    # 4. Création de l'icône carrée centrée (512x512)
    # Centrage optique du badge avec marges équilibrées
    def make_square_icon(badge, size=512, badge_ratio=0.88):
        canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        target_w = int(size * badge_ratio)
        target_h = int(target_w * (badge.height / badge.width))
        resized = badge.resize((target_w, target_h), Image.Resampling.LANCZOS)
        offset_x = (size - target_w) // 2
        offset_y = (size - target_h) // 2
        canvas.paste(resized, (offset_x, offset_y), resized)
        return canvas

    icon_512 = make_square_icon(badge_crop, size=512, badge_ratio=0.88)
    icon_180 = make_square_icon(badge_crop, size=180, badge_ratio=0.88)

    # Création d'une icône remplie squircle pour les contextes d'app natifs
    def make_native_squircle_icon(badge, size=512):
        canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        # Scaler le badge pour remplir avec bordure squircle
        target_w = int(size * 0.92)
        target_h = int(target_w * (badge.height / badge.width))
        resized = badge.resize((target_w, target_h), Image.Resampling.LANCZOS)
        offset_x = (size - target_w) // 2
        offset_y = (size - target_h) // 2
        canvas.paste(resized, (offset_x, offset_y), resized)
        return canvas

    app_icon_512 = make_native_squircle_icon(badge_crop, size=512)

    # 5. Export des fichiers Frontend Web
    frontend_public = r"frontend/public"
    
    # Logos complets
    full_logo_light.save(os.path.join(frontend_public, "onbora_logo.png"), "PNG")
    full_logo_dark.save(os.path.join(frontend_public, "onbora_logo_dark.png"), "PNG")
    
    # Favicons et icônes web (public & app router)
    icon_512.save(os.path.join(frontend_public, "icon.png"), "PNG")
    icon_180.save(os.path.join(frontend_public, "apple-icon.png"), "PNG")
    
    # Multi-size ICO pour favicon.ico (16, 32, 48, 64)
    ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64)]
    ico_images = [make_square_icon(badge_crop, size=s[0], badge_ratio=0.92) for s in ico_sizes]
    ico_images[0].save(
        os.path.join(frontend_public, "favicon.ico"),
        format="ICO",
        sizes=ico_sizes,
        append_images=ico_images[1:]
    )

    # Sync vers frontend/src/app/ pour Next.js App Router metadata
    frontend_app = r"frontend/src/app"
    if os.path.exists(frontend_app):
        import shutil
        shutil.copyfile(os.path.join(frontend_public, "icon.png"), os.path.join(frontend_app, "icon.png"))
        shutil.copyfile(os.path.join(frontend_public, "apple-icon.png"), os.path.join(frontend_app, "apple-icon.png"))
        shutil.copyfile(os.path.join(frontend_public, "favicon.ico"), os.path.join(frontend_app, "favicon.ico"))

    # icone_onbora.jpeg pour compatibilité existante
    jpeg_canvas = Image.new("RGB", (512, 512), (13, 14, 18))  # Dark canvas Onbora
    jpeg_canvas.paste(icon_512, (0, 0), icon_512)
    jpeg_canvas.save(os.path.join(frontend_public, "icone_onbora.jpeg"), "JPEG", quality=95)

    print("[OK] Frontend public branding assets generated!")

    # 6. Export des fichiers Mobile Flutter
    mobile_icons_dir = r"mobile/assets/icons"
    os.makedirs(mobile_icons_dir, exist_ok=True)
    app_icon_512.save(os.path.join(mobile_icons_dir, "app_icon.png"), "PNG")
    jpeg_canvas.save(os.path.join(mobile_icons_dir, "app_icon.jpeg"), "JPEG", quality=95)
    
    # Export launcher icons Android
    res_dir = r"mobile/android/app/src/main/res"
    density_map = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192,
    }
    for folder, px in density_map.items():
        folder_path = os.path.join(res_dir, folder)
        if os.path.exists(folder_path):
            launcher_img = make_square_icon(badge_crop, size=px, badge_ratio=0.90)
            launcher_img.save(os.path.join(folder_path, "ic_launcher.png"), "PNG")
            print(f"[OK] Generated {folder}/ic_launcher.png ({px}x{px})")

    # 7. Génération des fichiers SVG (Vector / High-DPI wrapper)
    import base64

    with open(os.path.join(frontend_public, "icon.png"), "rb") as f:
        icon_b64 = base64.b64encode(f.read()).decode("utf-8")

    svg_icon = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">\n'
        '  <title>Onbora — App Icon</title>\n'
        f'  <image href="data:image/png;base64,{icon_b64}" width="512" height="512" />\n'
        '</svg>'
    )

    with open(os.path.join(frontend_public, "onbora-app-icon.svg"), "w", encoding="utf-8") as f:
        f.write(svg_icon)

    with open(os.path.join(frontend_public, "onbora-logo.svg"), "w", encoding="utf-8") as f:
        f.write(svg_icon)

    with open(os.path.join(mobile_icons_dir, "onbora_logo.svg"), "w", encoding="utf-8") as f:
        f.write(svg_icon)

    with open(os.path.join(frontend_public, "onbora_logo.png"), "rb") as f:
        logo_b64 = base64.b64encode(f.read()).decode("utf-8")

    svg_lockup = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 745 282" width="745" height="282">\n'
        '  <title>Onbora — Logo Officiel</title>\n'
        f'  <image href="data:image/png;base64,{logo_b64}" width="745" height="282" />\n'
        '</svg>'
    )

    with open(os.path.join(frontend_public, "onbora-logo-lockup.svg"), "w", encoding="utf-8") as f:
        f.write(svg_lockup)

    print("[OK] SVG files generated!")
    print("[DONE] All Onbora branding assets successfully updated!")

if __name__ == "__main__":
    create_branding_assets()
