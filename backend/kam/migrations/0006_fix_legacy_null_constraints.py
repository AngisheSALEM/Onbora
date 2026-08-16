from django.db import migrations

def fix_postgresql_legacy_constraints(apps, schema_editor):
    connection = schema_editor.connection
    if connection.vendor == 'postgresql':
        with connection.cursor() as cursor:
            # 1. Ensure required columns exist
            cursor.execute("ALTER TABLE kam_prospectdossier ADD COLUMN IF NOT EXISTS raw_conversation_data jsonb DEFAULT '{}'::jsonb;")
            cursor.execute("ALTER TABLE kam_prospectdossier ADD COLUMN IF NOT EXISTS internal_kam_notes text DEFAULT '';")
            cursor.execute("ALTER TABLE kam_prospectdossier ADD COLUMN IF NOT EXISTS contact_name varchar(150) DEFAULT '';")
            cursor.execute("ALTER TABLE kam_prospectdossier ADD COLUMN IF NOT EXISTS phone varchar(50) DEFAULT '';")
            cursor.execute("ALTER TABLE kam_prospectdossier ADD COLUMN IF NOT EXISTS rccm varchar(100) DEFAULT '';")
            cursor.execute("ALTER TABLE kam_prospectdossier ADD COLUMN IF NOT EXISTS billing_address text DEFAULT '';")
            cursor.execute("ALTER TABLE kam_prospectdossier ADD COLUMN IF NOT EXISTS is_complete boolean DEFAULT false;")

            # 2. Dynamic PL/pgSQL loop to remove NOT NULL constraints on any legacy columns across tables
            cursor.execute("""
                DO $$ 
                DECLARE 
                    tbl_name text;
                    col_record RECORD;
                BEGIN 
                    FOR tbl_name IN SELECT unnest(ARRAY[
                        'kam_prospectdossier', 
                        'sales_enterprise', 
                        'sales_visitpreparation', 
                        'sales_visitreport', 
                        'discovery_clientconversation', 
                        'discovery_clientconversationmessage'
                    ])
                    LOOP
                        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl_name) THEN
                            FOR col_record IN 
                                SELECT column_name 
                                FROM information_schema.columns 
                                WHERE table_name = tbl_name 
                                  AND is_nullable = 'NO' 
                                  AND column_name NOT IN ('id', 'created_at', 'updated_at', 'source', 'status', 'name', 'sender', 'content', 'preparation_id', 'enterprise_id', 'conversation_id')
                            LOOP
                                EXECUTE format('ALTER TABLE %I ALTER COLUMN %I DROP NOT NULL;', tbl_name, col_record.column_name);
                            END LOOP;
                        END IF;
                    END LOOP;
                END $$;
            """)

class Migration(migrations.Migration):

    dependencies = [
        ('kam', '0005_ensure_raw_conversation_data'),
    ]

    operations = [
        migrations.RunPython(fix_postgresql_legacy_constraints, reverse_code=migrations.RunPython.noop),
    ]
