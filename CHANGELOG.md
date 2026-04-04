# Changelog

All notable changes to DOMUS are documented in this file.

## [1.1.0] - 2026-04-04

### Added
- Jaarplanning met tijdlijn voor documentdatums, vervaldatums, reviewdata, contracteinden en verjaardagen.
- Dossierweergave voor onderwerpen zoals Verzekeringen, Wonen, Zorg en Energie.
- Auditlog-pagina als zichtbare productfeature.
- Importworkflow met bewaakte importmap en intakequeue voor nieuwe documenten.
- OCR- en tekstextractie voor importdocumenten met automatische metadata-suggesties.
- Confidence-scores, waarschuwingen en inline preview in de importintake.
- Geboortedatum voor persoonlijke contacten.
- Expliciete dossiertoewijzing voor contacten, documenten en verplichtingen.
- Gebruikersbeheer in Instellingen.
- Mogelijkheid om het eigen wachtwoord te wijzigen.
- Mogelijkheid om nieuwe gebruikers aan te maken, rollen te beheren, accounts te activeren/deactiveren en wachtwoorden te resetten.
- Actorinformatie in de auditlog, zodat zichtbaar is welke gebruiker een wijziging uitvoerde.
- Docker-setup met `Dockerfile`, `.dockerignore`, `docker-compose.yml` en startup-initialisatie.

### Changed
- Dashboard visueel aangescherpt met meer ritme, kleuraccenten en duidelijkere hiërarchie.
- Kostenanalyse uitgebreid met een cirkeldiagram voor kosten per maand per type.
- Statistiekkaarten op het dashboard responsiever gemaakt voor kleinere schermen.
- Mobiele navigatie gewijzigd naar een hamburger-menu.
- Weergavedichtheid verplaatst van de sidebar naar Instellingen.
- Header-typografie vervangen door een strakkere display-font.
- Tekstlogo vervangen door het DOMUS-logo in zijmenu en loginpagina.
- Documentpreview vereenvoudigd: inklappen verwijderd en previewpaneel compacter gemaakt.
- Helppagina bijgewerkt naar de volledige actuele functionaliteit van de app.
- Server-CSP aangepast zodat assets ook correct laden in HTTP-deployments zonder ongewenste HTTPS-upgrade.

### Improved
- Importsuggesties aangescherpt met herkenning op basis van eerdere documentpatronen.
- Responsive gedrag verbeterd op dashboard en navigatie.
- Docker-runtime verbeterd voor Linux/OpenSSL 3 en SQLite-hostvolumes.
- Container-startup robuuster gemaakt met automatische bootstrap en runtime-migratie voor bestaande installaties.

### Technical
- Prisma-schema uitgebreid met gebruikersrollen, actieve/inactieve accounts, laatste login en audit-actorvelden.
- Nieuwe migratie toegevoegd voor gebruikers- en audituitbreidingen.
- Container-setup ondersteunt opslag van database, documenten en back-ups buiten de container via host-volumes.

