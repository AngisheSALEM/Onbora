from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('kam', '0012_accountmemoryevent'),
    ]

    operations = [
        migrations.AddField(
            model_name='kamappointment',
            name='visit_purpose',
            field=models.CharField(blank=True, choices=[('DISCOVERY', 'Prospection / Découverte'), ('QUALIFICATION', 'Qualification / Proposition'), ('FOLLOW_UP', 'Suivi / Revue client'), ('GROWTH', 'Renouvellement / Développement')], max_length=20, null=True),
        ),
        migrations.AddField(
            model_name='kamappointment',
            name='purpose_source',
            field=models.CharField(blank=True, choices=[('AUTO', 'Suggestion automatique'), ('MANUAL', 'Choix du KAM')], max_length=10, null=True),
        ),
        migrations.AddField(
            model_name='kamappointment',
            name='purpose_reason',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
    ]
