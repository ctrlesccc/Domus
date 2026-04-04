# Changelog

All notable changes to DOMUS are documented in this file.

## [1.5.0] - 2026-04-04

### Added
- Drag-and-drop dossierindeling op de dossierpagina voor documenten, contacten en verplichtingen.
- Dossier-toewijzing via een directe serveractie zonder eerst formulieren te openen.

### Changed
- Helpscherm volledig bijgewerkt naar de actuele functionaliteit van dashboard, verplichtingen, instellingen, audit en dossiers.
- Gebruiksuitleg uitgebreid met nieuwe informatie over betaalwijzen, afschrijvingsplanning, klikbare kostenlegenda en drag-and-drop dossierbeheer.

### Fixed
- Auditlog-layout verbeterd zodat wijzigingsdetails weer leesbaar en netjes afbreekbaar worden weergegeven.
- Auditkaarten responsiever gemaakt met een stabielere verdeling tussen metadata en detailweergave.

## [1.2.1] - 2026-04-04

### Fixed
- Auditlog-layout verbeterd zodat wijzigingsdetails weer leesbaar en netjes afbreekbaar worden weergegeven.
- Auditkaarten responsiever gemaakt met een stabielere verdeling tussen metadata en detailweergave.

## [1.2.0] - 2026-04-04

### Added
- Geplande afschrijvingsdatum zonder jaar voor verplichtingen via maand- en dagselectie.
- Dashboardblok met komende afschrijvingen voor de komende 30 dagen.
- Instellingenbeheer voor dropdownwaarden van `Betaalwijze`.
- Instellingenbeheer voor dossiers, inclusief toevoegen, wijzigen en verwijderen.
- Uitklapbare legenda bij `Kosten per maand per type` op het dashboard, met directe inzage in de onderliggende verplichtingen.

### Changed
- `Betaalwijze` in verplichtingen gewijzigd van vrij tekstveld naar dropdown.
- Dropdownvelden alfabetisch gesorteerd gemaakt.
- Verplichtingenlijst gewijzigd naar alfabetische standaardvolgorde.
- Lijstkoppen klikbaar gemaakt voor handmatige sortering in de belangrijkste lijsten.
- Dashboard aangepast: blok `Jaarlijkse kostenanalyse` verwijderd en `Kosten per maand per type` over de volle breedte geplaatst met legenda rechts.
- Dossiers aangepast van vaste technische waarden naar beheerbare tekstopties.

### Fixed
- Nieuwe verplichting wordt na opslaan weer correct leeggemaakt.
- Bedragveld bij nieuwe verplichtingen accepteert nu ook komma-invoer zoals `12,50`.

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
