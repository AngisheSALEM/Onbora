from django.core.management.base import BaseCommand
from accounts.models import User


class Command(BaseCommand):
    help = 'Seed or update the 9 operational demo accounts (Admin, Supervisor, KAM Manager, Sales reps, KAMs) without deleting existing users.'

    def handle(self, *args, **kwargs):
        self.stdout.write('Initialisation sécurisée et non-destructive des comptes opérationnels Onbora...')

        # 1. Compte Administrateur Général
        admin_user, created = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@onbora.cg',
                'role': User.ADMIN,
                'first_name': 'Bienvenu',
                'last_name': 'Mwamba',
                'company_name': 'Onbora Congo MSP',
                'phone': '+243810000999',
                'is_staff': True,
                'is_superuser': True,
            }
        )
        if created:
            admin_user.set_password('adminpass')
            admin_user.save()
            self.stdout.write(self.style.SUCCESS('Compte Administrateur (admin) créé.'))
        else:
            admin_user.role = User.ADMIN
            admin_user.is_staff = True
            admin_user.is_superuser = True
            admin_user.save()
            self.stdout.write('Compte Administrateur (admin) déjà existant (mis à jour).')

        # 2. Compte Superviseur Back-Office Terrain
        supervisor_user, created = User.objects.get_or_create(
            username='supervisor',
            defaults={
                'email': 'supervisor@onbora.cg',
                'role': User.SUPERVISOR,
                'first_name': 'Alain',
                'last_name': 'Mabiala',
                'company_name': 'Supervision Commerciale & Plaques Terrain',
                'phone': '+243815555444',
                'location': 'Kinshasa & National',
                'is_staff': True,
            }
        )
        if created:
            supervisor_user.set_password('supervisorpass')
            supervisor_user.save()
            self.stdout.write(self.style.SUCCESS('Compte Superviseur (supervisor) créé.'))
        else:
            supervisor_user.role = User.SUPERVISOR
            supervisor_user.is_staff = True
            supervisor_user.save()
            self.stdout.write('Compte Superviseur (supervisor) déjà existant (mis à jour).')

        # 3. Compte Gérant KAM Office (Direction Grands Comptes)
        kam_director_user, created = User.objects.get_or_create(
            username='kam_director',
            defaults={
                'email': 'kam.director@onbora.cg',
                'role': User.KAM_MANAGER,
                'first_name': 'Dieudonné',
                'last_name': 'Mavungu',
                'company_name': 'Direction KAM & Grands Comptes',
                'phone': '+243819999001',
                'location': 'Kinshasa & Grand Katanga',
                'is_staff': True,
            }
        )
        if created:
            kam_director_user.set_password('kamdirectorpass')
            kam_director_user.save()
            self.stdout.write(self.style.SUCCESS('Compte Gérant KAM Office (kam_director) créé.'))
        else:
            kam_director_user.role = User.KAM_MANAGER
            kam_director_user.is_staff = True
            kam_director_user.save()
            self.stdout.write('Compte Gérant KAM Office (kam_director) déjà existant (mis à jour).')

        # 4. Commerciaux de terrain (Sales & Plaques SOHO)
        sales_configs = [
            {
                'username': 'commercial',
                'email': 'commercial@onbora.cg',
                'password': 'demo123',
                'first_name': 'Dieudonné',
                'last_name': 'Mukendi',
                'phone': '+243810000001',
                'location': 'Kinshasa (Limete & Gombe)'
            },
            {
                'username': 'sales1',
                'email': 'sales1@onbora.cg',
                'password': 'sales1pass',
                'first_name': 'Grace',
                'last_name': 'Kambale',
                'phone': '+243820000002',
                'location': 'Kinshasa (Ngaliema & Lingwala)'
            },
            {
                'username': 'sales2',
                'email': 'sales2@onbora.cg',
                'password': 'sales2pass',
                'first_name': 'Patrick',
                'last_name': 'Bondo',
                'phone': '+242060000003',
                'location': 'Lubumbashi (Centre & Ruashi)'
            },
        ]
        for cfg in sales_configs:
            u, created = User.objects.get_or_create(
                username=cfg['username'],
                defaults={
                    'email': cfg['email'],
                    'role': User.SALESPERSON,
                    'first_name': cfg['first_name'],
                    'last_name': cfg['last_name'],
                    'phone': cfg['phone'],
                    'location': cfg['location'],
                }
            )
            if created:
                u.set_password(cfg['password'])
                u.save()
                self.stdout.write(self.style.SUCCESS(f"Compte Commercial ({cfg['username']}) créé."))
            else:
                u.role = User.SALESPERSON
                u.save()

        # 5. Key Account Managers (KAM Office)
        kam_configs = [
            {
                'username': 'kam1',
                'email': 'kam1@onbora.cg',
                'first_name': 'Chantal',
                'last_name': 'Kanyinda',
                'phone': '+243850000010',
                'location': 'Kinshasa',
                'kam_specialization': 'GRAND_COMPTE',
                'is_available': True
            },
            {
                'username': 'kam2',
                'email': 'kam2@onbora.cg',
                'first_name': 'Serge',
                'last_name': 'Mavinga',
                'phone': '+242050000020',
                'location': 'Brazzaville',
                'kam_specialization': 'PME',
                'is_available': True
            },
            {
                'username': 'kam3',
                'email': 'kam3@onbora.cg',
                'first_name': 'Junior',
                'last_name': 'Ilunga',
                'phone': '+243990000030',
                'location': 'Lubumbashi',
                'kam_specialization': 'GRAND_COMPTE',
                'is_available': True
            },
        ]
        for cfg in kam_configs:
            u, created = User.objects.get_or_create(
                username=cfg['username'],
                defaults={
                    'email': cfg['email'],
                    'role': User.KAM,
                    'first_name': cfg['first_name'],
                    'last_name': cfg['last_name'],
                    'phone': cfg['phone'],
                    'location': cfg['location'],
                    'kam_specialization': cfg['kam_specialization'],
                    'is_available': cfg['is_available']
                }
            )
            if created:
                u.set_password(f"{cfg['username']}pass")
                u.save()
                self.stdout.write(self.style.SUCCESS(f"Compte KAM ({cfg['username']}) créé."))
            else:
                u.role = User.KAM
                u.kam_specialization = cfg['kam_specialization']
                u.save()

        # 6. Suppression propre des anciens faux comptes clients démo de test s'ils existent encore
        purged_demo_clients = User.objects.filter(username__in=['client_rawbank', 'client_vodacom', 'client_tfm']).delete()
        if purged_demo_clients[0] > 0:
            self.stdout.write(f"Suppression de {purged_demo_clients[0]} anciens faux comptes clients B2B résiduels.")

        self.stdout.write(self.style.SUCCESS(
            f"Initialisation terminée avec succès. Total utilisateurs en base : {User.objects.count()} (Aucun compte personnel supprimé)."
        ))
