from django.http import HttpResponse

def render_export_html(title, content_html):
    return f"""<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>{title}</title>
    <style>
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #18181b;
            line-height: 1.6;
            margin: 0;
            padding: 30px;
            background-color: #ffffff;
        }}
        .no-print-bar {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            background-color: #f4f4f5;
            padding: 12px 24px;
            border-radius: 12px;
            margin-bottom: 30px;
            border: 1px solid #e4e4e7;
        }}
        .no-print-bar p {{
            margin: 0;
            font-size: 13px;
            color: #71717a;
            font-weight: 500;
        }}
        .print-btn {{
            padding: 8px 16px;
            background-color: #f97316;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 13px;
            font-weight: bold;
            cursor: pointer;
            transition: background-color 0.2s;
        }}
        .print-btn:hover {{
            background-color: #ea580c;
        }}
        .header {{
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            border-bottom: 2px solid #f97316;
            padding-bottom: 15px;
            margin-bottom: 30px;
        }}
        .header-logo {{
            display: flex;
            align-items: center;
            gap: 12px;
        }}
        .logo-text {{
            font-size: 24px;
            font-weight: 800;
            color: #050508;
            letter-spacing: -0.5px;
        }}
        .header-meta {{
            text-align: right;
            font-size: 12px;
            color: #475569;
        }}
        .document-title {{
            font-size: 26px;
            font-weight: 800;
            color: #050508;
            margin-top: 0;
            margin-bottom: 25px;
            letter-spacing: -0.5px;
        }}
        .section {{
            margin-bottom: 35px;
            page-break-inside: avoid;
        }}
        .section-title {{
            font-size: 14px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #ea580c;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 6px;
            margin-bottom: 20px;
        }}
        .grid {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }}
        .card {{
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 18px;
            background-color: #f8fafc;
        }}
        .card-title {{
            font-size: 13px;
            font-weight: bold;
            color: #334155;
            margin-top: 0;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        .badge {{
            display: inline-block;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
            margin-right: 5px;
            margin-bottom: 5px;
            border: 1px solid transparent;
        }}
        .badge-success {{ background-color: #ffedd5; color: #ea580c; border-color: #fed7aa; }}
        .badge-warning {{ background-color: #fef3c7; color: #92400e; border-color: #fde68a; }}
        .badge-danger {{ background-color: #fee2e2; color: #991b1b; border-color: #fecaca; }}
        .badge-neutral {{ background-color: #f1f5f9; color: #334155; border-color: #e2e8f0; }}
        
        .timeline {{
            border-left: 2px solid #e2e8f0;
            padding-left: 24px;
            margin-left: 12px;
            margin-top: 15px;
        }}
        .timeline-item {{
            position: relative;
            margin-bottom: 20px;
        }}
        .timeline-item::before {{
            content: '';
            position: absolute;
            left: -30px;
            top: 5px;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background-color: #f97316;
            border: 2px solid white;
            box-shadow: 0 0 0 2px #f97316;
        }}
        .timeline-title {{
            font-size: 13px;
            font-weight: bold;
            color: #0f172a;
            margin: 0 0 5px 0;
        }}
        .timeline-desc {{
            font-size: 12px;
            color: #475569;
            margin: 0;
        }}
        .email-preview {{
            background-color: #18181b;
            color: #f4f4f5;
            border-radius: 12px;
            padding: 20px;
            font-family: monospace;
            font-size: 12px;
            white-space: pre-wrap;
            border: 1px solid #27272a;
        }}
        .list-unstyled {{
            list-style: none;
            padding-left: 0;
            margin: 0;
        }}
        .list-unstyled li {{
            margin-bottom: 8px;
            font-size: 13px;
            color: #334155;
        }}
        @media print {{
            .no-print {{
                display: none !important;
            }}
            body {{
                padding: 0;
            }}
            .card {{
                background-color: #ffffff !important;
                border: 1px solid #cbd5e1 !important;
            }}
        }}
    </style>
</head>
<body>
    <div class="no-print no-print-bar">
        <p>Aperçu avant impression. Pour sauvegarder en PDF, choisissez "Enregistrer au format PDF" dans les options d'impression.</p>
        <button onclick="window.print()" class="print-btn">🖨️ Imprimer / PDF</button>
    </div>

    <div class="header">
        <div class="header-logo">
            <svg width="32" height="32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="100" height="100" rx="24" fill="#F97316" />
                <path d="M 33 26 C 31 16, 33 9, 36 7 C 38 5, 41 7, 40 16 C 39 23, 37 30, 36 33 C 35 34, 34 34, 33 33 Z M 43 23 C 41 12, 44 5, 47 3 C 49 1, 52 4, 50 14 C 49 22, 46 29, 44.5 32 C 44 33, 43 33, 43 32.5 Z M 53 24 C 51 15, 54 8, 57 6 C 59 4, 61 7, 59 16 C 57 24, 54 29, 52.5 32 C 52 33, 51 33, 51.5 32.5 Z M 50 35 C 62 35, 76 45, 76 58 C 76 65, 71 67, 65 67 L 65 77 C 76 77, 86 73, 86 58 C 86 40, 68 25, 50 25 C 32 25, 18 39, 18 58 C 18 77, 32 91, 50 91 C 68 91, 82 78, 84 63 L 74 63 C 72 72, 62 81, 50 81 C 38 81, 28 71, 28 58 C 28 45, 38 35, 50 35 Z" fill="white" />
            </svg>
            <span class="logo-text">Onbora</span>
        </div>
        <div class="header-meta">
            <p style="margin: 0 0 4px 0; font-weight: bold; color: #050508;">Orange Business Services MSP</p>
            <p style="margin: 0;">Généré automatiquement par Onbora Copilot</p>
        </div>
    </div>

    {content_html}
</body>
</html>"""

def get_export_response(filename, title, content_html):
    html = render_export_html(title, content_html)
    response = HttpResponse(html, content_type='text/html; charset=utf-8')
    # Use inline disposition so it opens directly in browser print view
    response['Content-Disposition'] = f'inline; filename="{filename}.html"'
    return response
