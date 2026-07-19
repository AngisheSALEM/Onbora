from django.core.management.base import BaseCommand
from accounts.models import User

class Command(BaseCommand):
    help = 'Seed the database with demo users for each role'

    def handle(self, *args, **kwargs):
        users_data = [
            {
                'username': 'client',
                'email': 'client@example.com',
                'password': 'clientpass',
                'role': User.CLIENT_B2B,
                'first_name': 'Jean',
                'last_name': 'Dupont',
                'company_name': 'SNCF',
                'phone': '0612345678',
            },
            {
                'username': 'sales',
                'email': 'sales@example.com',
                'password': 'salespass',
                'role': User.SALESPERSON,
                'first_name': 'Alice',
                'last_name': 'Martin',
                'company_name': '',
                'phone': '0687654321',
            },
            {
                'username': 'kam',
                'email': 'kam@example.com',
                'password': 'kampass',
                'role': User.KAM,
                'first_name': 'Pierre',
                'last_name': 'Richard',
                'company_name': '',
                'phone': '0699887766',
            },
            {
                'username': 'admin',
                'email': 'admin@example.com',
                'password': 'adminpass',
                'role': User.ADMIN,
                'first_name': 'Sophie',
                'last_name': 'Bernard',
                'company_name': 'Orange Business',
                'phone': '0600112233',
                'is_staff': True,
                'is_superuser': True,
            }
        ]

        self.stdout.write('Seeding demo users...')
        for data in users_data:
            username = data['username']
            # Delete if exists to allow clean re-run
            User.objects.filter(username=username).delete()
            
            is_staff = data.pop('is_staff', False)
            is_superuser = data.pop('is_superuser', False)
            password = data.pop('password')
            
            user = User.objects.create_user(**data)
            user.set_password(password)
            user.is_staff = is_staff
            user.is_superuser = is_superuser
            user.save()
            
            self.stdout.write(self.style.SUCCESS(f"User '{username}' with role '{user.role}' created successfully."))

        self.stdout.write(self.style.SUCCESS('Seeding complete!'))
