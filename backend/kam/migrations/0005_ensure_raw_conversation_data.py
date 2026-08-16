from django.db import migrations

def add_columns_if_missing(apps, schema_editor):
    connection = schema_editor.connection
    with connection.cursor() as cursor:
        if connection.vendor == 'postgresql':
            cursor.execute("ALTER TABLE kam_prospectdossier ADD COLUMN IF NOT EXISTS raw_conversation_data jsonb DEFAULT '{}'::jsonb;")
            cursor.execute("ALTER TABLE kam_prospectdossier ADD COLUMN IF NOT EXISTS internal_kam_notes text DEFAULT '';")
            cursor.execute("""
                DO $$ 
                BEGIN 
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name='kam_prospectdossier' AND column_name='raw_qualification_data'
                    ) THEN 
                        ALTER TABLE kam_prospectdossier ALTER COLUMN raw_qualification_data DROP NOT NULL;
                        ALTER TABLE kam_prospectdossier ALTER COLUMN raw_qualification_data SET DEFAULT '{}'::jsonb;
                    END IF;
                END $$;
            """)
        elif connection.vendor == 'sqlite':
            cursor.execute("PRAGMA table_info(kam_prospectdossier);")
            columns = [column[1] for column in cursor.fetchall()]
            if 'raw_conversation_data' not in columns:
                cursor.execute("ALTER TABLE kam_prospectdossier ADD COLUMN raw_conversation_data JSON DEFAULT '{}';")
            if 'internal_kam_notes' not in columns:
                cursor.execute("ALTER TABLE kam_prospectdossier ADD COLUMN internal_kam_notes TEXT DEFAULT '';")

class Migration(migrations.Migration):

    dependencies = [
        ('kam', '0004_alter_prospectdossier_id'),
    ]

    operations = [
        migrations.RunPython(add_columns_if_missing, reverse_code=migrations.RunPython.noop),
    ]
