import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.graphics.shapes import Drawing, Rect, String, Circle, Line, Group

def make_color_swatch(hex_color, name, use_case):
    d = Drawing(460, 50)
    # Background rect
    d.add(Rect(0, 0, 460, 50, rx=5, ry=5, fillColor=colors.HexColor("#F9F9FB"), strokeColor=colors.HexColor("#E4E4E7"), strokeWidth=0.5))
    # Color rect
    d.add(Rect(10, 5, 80, 40, rx=4, ry=4, fillColor=colors.HexColor(hex_color), strokeColor=colors.HexColor("#CCCCCC"), strokeWidth=1))
    # Text info
    d.add(String(110, 28, f"{name} ({hex_color})", fontName="Helvetica-Bold", fontSize=12, fillColor=colors.HexColor("#111111")))
    d.add(String(110, 10, use_case, fontName="Helvetica", fontSize=9, fillColor=colors.HexColor("#666666")))
    return d

def make_buttons_mockup():
    d = Drawing(460, 60)
    # Background
    d.add(Rect(0, 0, 460, 60, rx=8, ry=8, fillColor=colors.HexColor("#FFFFFF"), strokeColor=colors.HexColor("#E4E4E7"), strokeWidth=0.5))
    # Primary button
    d.add(Rect(15, 10, 140, 40, rx=10, ry=10, fillColor=colors.HexColor("#F97316"), strokeColor=None))
    d.add(String(45, 25, "Bouton Primaire", fontName="Helvetica-Bold", fontSize=10, fillColor=colors.HexColor("#FFFFFF")))
    
    # Secondary button
    d.add(Rect(170, 10, 140, 40, rx=10, ry=10, fillColor=colors.HexColor("#FFFFFF"), strokeColor=colors.HexColor("#E4E4E7"), strokeWidth=1))
    d.add(String(195, 25, "Bouton Secondaire", fontName="Helvetica-Bold", fontSize=10, fillColor=colors.HexColor("#27272A")))
    
    # Toggle button (Light Theme Active)
    d.add(Rect(325, 10, 120, 40, rx=10, ry=10, fillColor=colors.HexColor("#FFFFFF"), strokeColor=colors.HexColor("#E4E4E7"), strokeWidth=1))
    d.add(String(340, 25, "Bascule theme", fontName="Helvetica-Bold", fontSize=10, fillColor=colors.HexColor("#27272A")))
    d.add(Circle(430, 30, 4, fillColor=colors.HexColor("#EA580C"), strokeColor=None))
    return d

def make_chat_mockup():
    d = Drawing(460, 180)
    # Chat container bg
    d.add(Rect(0, 0, 460, 180, rx=12, ry=12, fillColor=colors.HexColor("#FFFFFF"), strokeColor=colors.HexColor("#E4E4E7"), strokeWidth=0.5))
    
    # AI Bubble (Onbora) - Left
    d.add(Rect(15, 95, 280, 60, rx=10, ry=10, fillColor=colors.HexColor("#F4F4F5"), strokeColor=colors.HexColor("#E4E4E7"), strokeWidth=0.5))
    d.add(String(25, 140, "Onbora (IA)", fontName="Helvetica-Bold", fontSize=9, fillColor=colors.HexColor("#F97316")))
    d.add(String(25, 125, "Bonjour ! Je suis Onbora, votre copilote B2B Orange.", fontName="Helvetica", fontSize=9, fillColor=colors.HexColor("#18181B")))
    d.add(String(25, 110, "Comment puis-je qualifier vos besoins aujourd'hui ?", fontName="Helvetica", fontSize=9, fillColor=colors.HexColor("#18181B")))
    
    # User Bubble - Right
    d.add(Rect(165, 45, 280, 40, rx=10, ry=10, fillColor=colors.HexColor("#F97316"), strokeColor=None))
    d.add(String(175, 70, "Client B2B", fontName="Helvetica-Bold", fontSize=9, fillColor=colors.HexColor("#FFFFFF")))
    d.add(String(175, 55, "Je souhaite qualifier mon besoin de fibre pro.", fontName="Helvetica", fontSize=9, fillColor=colors.HexColor("#FFFFFF")))
    
    # Input field at bottom
    d.add(Rect(15, 12, 430, 25, rx=6, ry=6, fillColor=colors.HexColor("#FFFFFF"), strokeColor=colors.HexColor("#D4D4D8"), strokeWidth=1))
    d.add(String(25, 20, "Ecrivez un message...", fontName="Helvetica-Oblique", fontSize=8, fillColor=colors.HexColor("#A1A1AA")))
    return d

def make_card_mockup():
    d = Drawing(460, 90)
    # Service Card
    d.add(Rect(0, 0, 460, 90, rx=12, ry=12, fillColor=colors.HexColor("#FFFFFF"), strokeColor=colors.HexColor("#E4E4E7"), strokeWidth=0.5))
    # Active indicator (orange top/left line)
    d.add(Rect(0, 0, 6, 90, rx=0, ry=0, fillColor=colors.HexColor("#F97316"), strokeColor=None))
    
    # Card Header
    d.add(String(25, 65, "Fibre Optique Pro 1Gbps", fontName="Helvetica-Bold", fontSize=12, fillColor=colors.HexColor("#18181B")))
    # Description
    d.add(String(25, 50, "Connexion internet symetrique et GTR de 4h pour entreprises.", fontName="Helvetica", fontSize=9, fillColor=colors.HexColor("#52525B")))
    # Details
    d.add(String(25, 33, "Debit : 1 Gbps / Fibre Dediee", fontName="Courier-Bold", fontSize=8, fillColor=colors.HexColor("#71717A")))
    
    # Badge (Right)
    d.add(Rect(350, 45, 95, 25, rx=5, ry=5, fillColor=colors.HexColor("#FFF7ED"), strokeColor=colors.HexColor("#FED7AA"), strokeWidth=0.5))
    d.add(String(360, 53, "Recommande", fontName="Helvetica-Bold", fontSize=9, fillColor=colors.HexColor("#EA580C")))
    return d

def make_typo_showcase():
    d = Drawing(460, 110)
    # Background card
    d.add(Rect(0, 0, 460, 110, rx=8, ry=8, fillColor=colors.HexColor("#FFFFFF"), strokeColor=colors.HexColor("#E4E4E7"), strokeWidth=0.5))
    
    # Title H1
    d.add(String(20, 85, "Titre Principal H1 - Helvetica-Bold, 24px", fontName="Helvetica-Bold", fontSize=14, fillColor=colors.HexColor("#000000")))
    # Title H2
    d.add(String(20, 65, "Sous-titre H2 - Helvetica-Bold, 16px", fontName="Helvetica-Bold", fontSize=11, fillColor=colors.HexColor("#18181B")))
    # Body text
    d.add(String(20, 45, "Corps de texte - Helvetica, 10px (Lorem ipsum dolor sit amet...)", fontName="Helvetica", fontSize=9, fillColor=colors.HexColor("#27272A")))
    # Monospace text
    d.add(String(20, 25, "Code / Monospace - Courier-Bold, 9px (GTR: 4h, IP: 192.168.1.1)", fontName="Courier-Bold", fontSize=8, fillColor=colors.HexColor("#71717A")))
    return d

def build_pdf():
    pdf_path = "charte_graphique.pdf"
    doc = SimpleDocTemplate(pdf_path, pagesize=letter, leftMargin=40, rightMargin=40, topMargin=40, bottomMargin=40)
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=26,
        leading=32,
        textColor=colors.HexColor("#000000"),
        alignment=0, # Left
        spaceAfter=10
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#F97316"),
        alignment=0,
        spaceAfter=30
    )
    
    h1_style = ParagraphStyle(
        'H1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=colors.HexColor("#000000"),
        spaceBefore=20,
        spaceAfter=10,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor("#27272A"),
        spaceAfter=15
    )

    story = []
    
    # --- PAGE 1: COVER PAGE ---
    story.append(Spacer(1, 40))
    story.append(Paragraph("Onbora", ParagraphStyle('Brand', fontName='Helvetica-Bold', fontSize=14, textColor=colors.HexColor("#F97316"))))
    story.append(Spacer(1, 10))
    story.append(Paragraph("Charte Graphique Officielle", title_style))
    story.append(Paragraph("Guide d'Identite Visuelle, Palette, Typographie & Composants", subtitle_style))
    story.append(Spacer(1, 30))
    
    # Orange block line
    d_line = Drawing(480, 4)
    d_line.add(Rect(0, 0, 480, 4, fillColor=colors.HexColor("#F97316"), strokeColor=None))
    story.append(d_line)
    story.append(Spacer(1, 35))
    
    # Document Metadata
    story.append(Paragraph("<b>Version</b> : 1.0 (Juillet 2026)", body_style))
    story.append(Paragraph("<b>Auteur</b> : Antigravity Design", body_style))
    story.append(Paragraph("<b>Statut</b> : Valide (Theme Orange/Noir/Blanc)", body_style))
    story.append(Spacer(1, 40))
    
    story.append(Paragraph("Cette charte garantit la coherence et la qualite de l'interface utilisateur de la plateforme Onbora. Elle s'applique aux espaces Client B2B, Prospecteur, KAM, et MSP Administrateur.", body_style))
    
    story.append(PageBreak())
    
    # --- PAGE 2: PALETTE DE COULEURS ---
    story.append(Paragraph("1. Palette de Couleurs", h1_style))
    story.append(Paragraph("La palette principale s'articule autour d'un Orange dynamique et d'un contraste Noir/Blanc elegant, offrant une visibilite optimale pour les MSP.", body_style))
    story.append(Spacer(1, 10))
    
    story.append(Paragraph("<b>Couleurs Principales :</b>", ParagraphStyle('Sub', fontName='Helvetica-Bold', fontSize=11, spaceAfter=8)))
    story.append(make_color_swatch("#F97316", "Orange Onbora", "Accents, boutons primaires, indicateurs d'action active."))
    story.append(Spacer(1, 10))
    story.append(make_color_swatch("#EA580C", "Orange Sombre", "Hover sur boutons, dégradés d'actions."))
    story.append(Spacer(1, 10))
    story.append(make_color_swatch("#000000", "Noir Pur", "Texte principal en Thème Clair (Accessibilité maximale)."))
    story.append(Spacer(1, 10))
    story.append(make_color_swatch("#FFFFFF", "Blanc Pur", "Fond principal en Thème Clair, cartes et containers."))
    story.append(Spacer(1, 10))
    story.append(make_color_swatch("#050508", "Zinc Sombre", "Fond principal en Thème Sombre."))
    story.append(Spacer(1, 10))
    story.append(make_color_swatch("#18181B", "Zinc Moyen", "Composants sombres, en-têtes et menus."))
    
    story.append(PageBreak())
    
    # --- PAGE 3: TYPOGRAPHIE & BOUTONS ---
    story.append(Paragraph("2. Typographie & Hierarchy", h1_style))
    story.append(Paragraph("Onbora utilise Helvetica pour son interface claire et professionnelle, et Courier pour les donnees techniques.", body_style))
    story.append(Spacer(1, 5))
    story.append(make_typo_showcase())
    story.append(Spacer(1, 20))
    
    story.append(Paragraph("3. Styles des Boutons et Controles", h1_style))
    story.append(Paragraph("Les boutons primaires adoptent l'orange identitaire avec des angles adoucis. Les boutons de bascule de theme s'adaptent a l'environnement de la page.", body_style))
    story.append(Spacer(1, 5))
    story.append(make_buttons_mockup())
    
    story.append(PageBreak())
    
    # --- PAGE 4: COMPOSANTS DE CONVERSATION ---
    story.append(Paragraph("4. Interface de Conversation (Chatbot)", h1_style))
    story.append(Paragraph("L'interface de qualification conversationnelle structure les echanges entre l'IA (Onbora) et le prospect. Les bulles Onbora sont grises/blanches pour representer le systeme, et les bulles Client sont orange pour focaliser les actions de l'utilisateur.", body_style))
    story.append(Spacer(1, 10))
    story.append(make_chat_mockup())
    story.append(Spacer(1, 20))
    
    story.append(Paragraph("5. Cartes de Services (MSP Services)", h1_style))
    story.append(Paragraph("Les cartes de services sont utilisees pour presenter les offres MSP recommandees. Elles integrent des badges de recommandation ainsi qu'un repere vertical orange distinctif.", body_style))
    story.append(Spacer(1, 10))
    story.append(make_card_mockup())
    
    doc.build(story)
    print("PDF genere avec succes.")

if __name__ == "__main__":
    build_pdf()