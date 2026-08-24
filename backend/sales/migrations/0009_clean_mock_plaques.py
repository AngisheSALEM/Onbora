from django.db import migrations

MOCK_CODES = [
    'KIN-GOMBE',
    'KIN-LIMETE',
    'BZV-CENTRE',
    'PNR-CENTRE',
    'LSH-CENTRE',
    'ABJ-PLATEAU',
    'DKR-PLATEAU',
]


def clean_mock_plaques_forward(apps, schema_editor):
    Plaque = apps.get_model('sales', 'Plaque')
    # Supprimer les plaques mockees par code
    Plaque.objects.filter(code__in=MOCK_CODES).delete()


def clean_mock_plaques_backward(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0008_plaque_boundary_geojson_plaque_kml_data_and_more'),
    ]

    operations = [
        migrations.RunPython(clean_mock_plaques_forward, clean_mock_plaques_backward),
    ]
