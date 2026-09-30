# Onbora Mobile

## Tester sur un téléphone physique

L'ordinateur et les téléphones doivent être sur le même réseau Wi-Fi (ou sur le
même partage de connexion). L'adresse du backend est chargée depuis `mobile/.env`.
`localhost` et `10.0.2.2` ne désignent pas l'ordinateur depuis un téléphone physique.

Dans un terminal, depuis `Onbora/backend`, lancer le backend sur le réseau :

```powershell
python manage.py runserver 0.0.0.0:8000
```

Dans un autre terminal, depuis `Onbora/mobile` :

```powershell
flutter run
```

La configuration locale actuelle utilise `http://10.252.252.54:8000`.
Si l'adresse de l'ordinateur change, ce lanceur Windows détecte l'IPv4 du réseau
avec passerelle, met à jour uniquement `API_BASE_URL` dans `.env`, puis lance Flutter :

```powershell
.\run-local.ps1
```

Pour mettre à jour l'adresse sans lancer Flutter :

```powershell
.\run-local.ps1 -ConfigureOnly
flutter run
```

S'il y a plusieurs réseaux actifs, sélectionner celui partagé avec le téléphone :

```powershell
.\run-local.ps1 -InterfaceAlias 'Wi-Fi' -ConfigureOnly
flutter run -d <device-id>
```

Avant de tester l'app, ouvrir `http://<IP-affichée>:8000/` dans le navigateur du
téléphone : la réponse doit identifier `Onbora API`. Si la page est inaccessible,
vérifier que le backend écoute sur `0.0.0.0:8000`, que le pare-feu autorise Python
sur le réseau partagé et que le Wi-Fi n'isole pas ses clients. Sur iPhone, autoriser
l'accès au réseau local. Après une modification de `.env`, relancer `flutter run`
pour embarquer la nouvelle adresse.

Le fichier `.env` reste local et ignoré par Git. `.env.example` décrit sa structure.

## Configuration Firebase Android

Si `android/app/google-services.json` (ou un fichier de variante sous `src/`) est
présent, Gradle applique le plugin Google Services. Sinon, la compilation reste
possible : l'app initialise déjà Firebase explicitement avec `firebase_options.dart`.
Les identifiants Firebase doivent être ceux d'une application enregistrée pour que
les notifications push fonctionnent ; leur réception doit être testée séparément.
