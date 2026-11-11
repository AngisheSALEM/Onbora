import qrcode

def generate_qr(
    data: str = "https://onbora.io",
    output_path: str = "onbora_qr.png",
    box_size: int = 10,
    border: int = 4,
    fill_color: str = "black",
    back_color: str = "white",
) -> None:
    """Génère un QR code à partir d'une URL ou d'un texte."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=box_size,
        border=border,
    )
    qr.add_data(data)
    qr.make(fit=True)

    img = qr.make_image(fill_color=fill_color, back_color=back_color)
    img.save(output_path)
    print(f"QR Code généré avec succès : {output_path}")

if __name__ == "__main__":
    generate_qr()
