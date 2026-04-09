# Technisch Ontwerp DOMUS

## 1. Inleiding

DOMUS is een full-stack webapplicatie met een React/Vite-frontend, een Express/TypeScript-backend, Prisma als datalaag en SQLite als database. Bestanden worden buiten de database opgeslagen op het filesystem. De applicatie is ontworpen voor self-hosting en ondersteunt containerdeployments via Docker.

Dit document beschrijft de technische architectuur, applicatielagen, data-opbouw, containerisering en belangrijke runtimeprocessen.

## 2. Technologie-stack

### Frontend

- React 19
- TypeScript 6
- React Router
- Vite 8
- Tailwind CSS 4

### Backend

- Node.js 22
- Express 5
- TypeScript 6
- Prisma Client 7
- JWT-authenticatie via cookies
- Multer voor uploads
- Tesseract.js voor OCR op afbeeldingen
- pdf-parse voor PDF-tekstextractie

### Data en opslag

- SQLite database
- filesystem voor documentopslag
- filesystem voor importmap
- filesystem voor back-ups

### Containerisatie

- Docker multi-stage build
- Debian Bookworm Slim als basisimage
- Docker Compose voor lokale/prod deployment

## 3. Architectuuroverzicht

DOMUS heeft een klassieke client-serverarchitectuur.

### 3.1 Frontendlaag

De frontend draait als single-page application en wordt opgebouwd uit views en herbruikbare UI-componenten. In productie wordt de gebuilde frontend (`client/dist`) door de Express-server statisch geserveerd.

Belangrijke frontendonderdelen:

- router in [main.tsx](c:/Projects/Domus/client/src/main.tsx)
- shell en navigatie in [app-shell.tsx](c:/Projects/Domus/client/src/ui/app-shell.tsx)
- pagina’s in [client/src/views](c:/Projects/Domus/client/src/views)
- API-client in [api.ts](c:/Projects/Domus/client/src/lib/api.ts)
- authenticatiestatus in [auth.tsx](c:/Projects/Domus/client/src/state/auth.tsx)
- centrale stijlen in [styles.css](c:/Projects/Domus/client/src/styles.css)

### 3.2 Backendlaag

De backend biedt JSON-API-routes onder `/api/*`, authenticatie, bestandsverwerking, importdetectie, auditregistratie en statische frontend-serving in productie.

Belangrijke backendonderdelen:

- applicatieopbouw in [app.ts](c:/Projects/Domus/server/src/app.ts)
- start-up in [index.ts](c:/Projects/Domus/server/src/index.ts)
- configuratie in [config.ts](c:/Projects/Domus/server/src/config.ts)
- routes in [server/src/routes](c:/Projects/Domus/server/src/routes)
- middleware in [server/src/middleware](c:/Projects/Domus/server/src/middleware)
- hulplagen in [server/src/lib](c:/Projects/Domus/server/src/lib)

### 3.3 Data- en opslaglaag

De relationele metadata staat in SQLite. Binaire bestanden staan op schijf.

Opslaggebieden:

- `prisma/dev.db` voor SQLite
- `storage/documents` voor definitieve documenten
- `prisma.config.ts` voor Prisma CLI-configuratie en datasource-resolutie
- `storage/import` voor nieuwe imports
- `backups` voor back-upbestanden

## 4. Frontendontwerp

## 4.1 Routing

De frontend gebruikt `createBrowserRouter` met een protected layout.

Belangrijke routes:

- `/login`
- `/dashboard`
- `/planning`
- `/dossiers`
- `/imports`
- `/documents`
- `/documents/new`
- `/documents/:id`
- `/contacts`
- `/personal-contacts`
- `/obligations`
- `/search`
- `/audit`
- `/help`
- `/settings`

Authenticatie wordt afgedwongen via:

- `ProtectedLayout`
- `PublicOnlyRoute`

## 4.2 State management

Er is geen globale statebibliotheek zoals Redux. De app gebruikt:

- React local state
- eenvoudige context voor authenticatie
- directe API-calls per pagina

Voordelen:

- eenvoudige codebasis
- weinig abstractielaag
- goed passend bij middelgrote self-hosted applicatie

## 4.3 API-aanroepen

Alle frontendrequests lopen via `request<T>()` in [api.ts](c:/Projects/Domus/client/src/lib/api.ts).

Eigenschappen:

- `credentials: include` voor cookie-auth
- JSON default headers
- centrale foutafhandeling
- typed responses via TypeScript
- frontend-event voor het verversen van navigatietellers na mutaties

## 4.4 UI-ontwerp

De UI is opgebouwd uit card-based layouts en Tailwind utility classes.

Belangrijke UX-kenmerken:

- app-shell met zijmenu op desktop
- hamburger-menu op mobiel
- rustige kleurstelling met zand-, groen- en inkttinten
- compacte en comfortabele density modes
- dashboardgerichte informatiearchitectuur

## 5. Backendontwerp

## 5.1 Applicatieinitialisatie

De backendstart volgt dit proces:

1. `.env` laden via [config.ts](c:/Projects/Domus/server/src/config.ts)
2. storage directories beschikbaar maken
3. import watcher starten
4. Express-app initialiseren
5. API-routes registreren
6. in productie frontend dist serveren

## 5.2 Middleware

Gebruikte middleware:

- `helmet`
- `cors`
- `express.json`
- `cookie-parser`
- `morgan`
- rate limiting op login
- custom error handler

Bijzonderheid:

- `helmet` is expliciet geconfigureerd met `upgrade-insecure-requests: null` om ongewenste HTTPS-upgrades in pure HTTP-deployments te voorkomen

## 5.3 Authenticatie

Authenticatie is gebaseerd op:

- JWT
- HTTP-only cookie
- server-side verificatie per request

Belangrijke onderdelen:

- token signing in [auth.ts](c:/Projects/Domus/server/src/lib/auth.ts)
- cookie set/clear in dezelfde module
- auth middleware in [middleware/auth.ts](c:/Projects/Domus/server/src/middleware/auth.ts)

Auth payload bevat:

- `userId`
- `username`
- `displayName`
- `role`

Er zijn twee guards:

- `requireAuth`
- `requireAdmin`

Beheer van gebruikers, instellingen, referentietabellen en back-ups gebruikt expliciet de admin-guard.

## 5.4 API-routes

Belangrijke routegroepen:

### Auth

[auth.ts](c:/Projects/Domus/server/src/routes/auth.ts)

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/change-password`

### Users

[users.ts](c:/Projects/Domus/server/src/routes/users.ts)

- `GET /api/users`
- `POST /api/users`
- `PUT /api/users/:id`
- `POST /api/users/:id/reset-password`

### Dashboard

[dashboard.ts](c:/Projects/Domus/server/src/routes/dashboard.ts)

Levert aggregaties, signalen, kostenanalyse, datakwaliteitsinformatie, belangrijke documenten en importqueuegegevens.
Daarnaast is er een lichtgewicht endpoint voor navigatietellers, zodat de app-shell niet steeds het volledige dashboard hoeft op te halen.

### Documents

[documents.ts](c:/Projects/Domus/server/src/routes/documents.ts)

Ondersteunt:

- lijstweergave
- detailweergave
- upload
- update
- versiebeheer
- markering van belangrijke documenten
- soft delete
- permanent delete
- preview
- download

### Contacts

[contacts.ts](c:/Projects/Domus/server/src/routes/contacts.ts)

Ondersteunt:

- lijstweergave
- detailweergave
- create/update/delete

### Obligations

[obligations.ts](c:/Projects/Domus/server/src/routes/obligations.ts)

Ondersteunt create/update/delete en koppelingen naar documenten en contacten.

### Reference data

- [contact-types.ts](c:/Projects/Domus/server/src/routes/contact-types.ts)
- [document-types.ts](c:/Projects/Domus/server/src/routes/document-types.ts)
- [obligation-types.ts](c:/Projects/Domus/server/src/routes/obligation-types.ts)

### Planning

[planning.ts](c:/Projects/Domus/server/src/routes/planning.ts)

Levert tijdlijnitems uit verschillende domeinen.

### Dossiers

[dossiers.ts](c:/Projects/Domus/server/src/routes/dossiers.ts)

Groepeert documenten, verplichtingen en contacten per dossieronderwerp.

### Imports

[imports.ts](c:/Projects/Domus/server/src/routes/imports.ts)

Ondersteunt:

- ophalen van importqueue
- handmatige sync
- opnieuw analyseren van importitems
- finaliseren van importitems
- preview en download van draft-bestanden

### Audit

[audit.ts](c:/Projects/Domus/server/src/routes/audit.ts)

Levert auditregels met filtering op entiteit en actie.

### Settings / Backups / Trash

- [settings.ts](c:/Projects/Domus/server/src/routes/settings.ts)
- [backups.ts](c:/Projects/Domus/server/src/routes/backups.ts)
- [trash.ts](c:/Projects/Domus/server/src/routes/trash.ts)

## 6. Datamodel

Het datamodel is gedefinieerd in [schema.prisma](c:/Projects/Domus/prisma/schema.prisma).

## 6.1 Kernmodellen

### User

Velden:

- gebruikersnaam
- gehashte wachtwoordhash
- weergavenaam
- rol
- actief/inactief
- laatste login

### AppSetting

Generieke key-value opslag voor applicatie-instellingen.

### ContactType / DocumentType / ObligationType

Referentietabellen voor consistente classificatie.

### Contact

Bevat stamgegevens van zakelijke en persoonlijke contacten.

### Document

Bevat metadata van een document en verwijzing naar het bestand op schijf.

### ImportDocument

Bevat metadata van bestanden die nog in intake zijn.

### Obligation

Bevat contract- of kosteninformatie.

### AuditLog

Bevat auditinformatie inclusief actorvelden.

## 6.2 Relaties

Belangrijke relaties:

- contacttype 1:n contacten
- documenttype 1:n documenten
- verplichtingstype 1:n verplichtingen
- contact 1:n documenten
- contact 1:n verplichtingen
- document n:m contacten via `document_contacts`
- document n:m verplichtingen via `obligation_documents`
- document self relation voor versiegeschiedenis

## 6.3 Soft delete

Soft delete wordt toegepast op:

- contacten
- documenten
- verplichtingen

Dit gebeurt via `deletedAt`. De prullenbakmodule werkt op basis van die soft-deletevelden.

## 6.4 Enums

Belangrijke enums:

- `UserRole`
- `ContactKind`
- `ContactTypeCategory`
- `DossierTopic`
- `ImportStatus`
- `OcrStatus`
- `DocumentStatus`
- `ObligationFrequency`
- `ObligationStatus`

## 7. Bestandsopslag

## 7.1 Definitieve documenten

Uploads en gefinaliseerde imports worden fysiek opgeslagen onder:

- `storage/documents`

De database bewaart:

- originele bestandsnaam
- opgeslagen bestandsnaam
- mime type
- bestandsgrootte
- storage path

## 7.2 Importmap

Nieuwe externe documenten komen in:

- `storage/import`

De import watcher scant deze map en verwerkt de inhoud naar `import_documents`.

## 7.3 Back-ups

Back-upbestanden worden opgeslagen onder:

- `backups`

## 8. Import- en OCR-architectuur

## 8.1 Import watcher

De watcher is geïmplementeerd in [import-watcher.ts](c:/Projects/Domus/server/src/lib/import-watcher.ts).

Verantwoordelijkheden:

- importmap scannen
- nieuwe bestanden registreren
- bestaande pending items synchroniseren
- OCR/analyse in een achtergrondqueue plaatsen

## 8.2 Analyselaag

De analyse van importdocumenten vindt plaats in [import-analysis.ts](c:/Projects/Domus/server/src/lib/import-analysis.ts).

Technieken:

- `pdf-parse` voor PDF-tekstextractie
- `tesseract.js` voor OCR op afbeeldingen
- patroonherkenning op documenttype, contact, datums en herkenbare referenties

Resultaat:

- OCR-tekst
- drafttitel
- draftdocumenttype
- draftcontact
- draftdocumentdatum
- draftvervaldatum
- draftdossier
- draftnotities
- confidence, waarschuwingen en verklarende signalen voor de intake-UI

## 8.3 Finalisatie

Bij finalisatie:

1. importbestand wordt verplaatst naar definitieve opslag
2. nieuw documentrecord wordt aangemaakt
3. importrecord wordt op `IMPORTED` gezet
4. auditlog wordt geschreven

## 9. Auditarchitectuur

Auditlogschrijven gebeurt centraal via [audit.ts](c:/Projects/Domus/server/src/lib/audit.ts).

Elke schrijfoperatie kan de volgende gegevens meegeven:

- entiteitstype
- entiteit-id
- actie
- oude waarde
- nieuwe waarde
- uitvoerende gebruiker

De actorinformatie wordt meestal afgeleid via:

- `auditActorFromRequest(request)`

## 10. Serialisatie en validatie

## 10.1 Validatie

Inkomende payloads worden gevalideerd met Zod in [validators.ts](c:/Projects/Domus/server/src/lib/validators.ts).

Voorbeelden:

- login
- wachtwoordwijziging
- gebruikersbeheer
- documenten
- contacten
- verplichtingen
- instellingen
- referentiegegevens

## 10.2 Serialisatie

Domeinobjecten worden omgezet naar frontendvriendelijke responses via serializers in [serializers.ts](c:/Projects/Domus/server/src/lib/serializers.ts).

## 11. Deployment en Docker

## 11.1 Dockerfile

De containerisatie gebruikt een multi-stage build in [Dockerfile](c:/Projects/Domus/Dockerfile).

### Build-stage

- base image: `node:22-bookworm-slim`
- `npm ci`
- code kopiëren
- `prisma generate`
- client en server builden

### Runtime-stage

- opnieuw `node:22-bookworm-slim`
- installatie van `sqlite3` en `openssl`
- kopiëren van build artefacts
- kopiëren van bootstrap- en migratiebestanden
- entrypointscript configureren

## 11.2 Docker Compose

[docker-compose.yml](c:/Projects/Domus/docker-compose.yml) definieert de service:

- image/build
- poortmapping `4000:4000`
- `.env`
- runtime environment
- host-volumes voor database, storage en backups

Standaard mountpoints in de container:

- `/app/prisma`
- `/app/storage`
- `/app/backups`

## 11.3 Entrypoint

[docker-entrypoint.sh](c:/Projects/Domus/docker-entrypoint.sh) verzorgt:

- aanmaken van runtimefolders
- databasebootstrap op eerste start
- uitvoeren van seedscript
- toepassen van runtime-migratie voor user/auditvelden op bestaande databases

## 12. Configuratie

De serverconfiguratie staat in [config.ts](c:/Projects/Domus/server/src/config.ts).

Belangrijke instellingen:

- `PORT`
- `CLIENT_URL`
- `JWT_SECRET`
- `MAX_UPLOAD_SIZE_MB`
- storage root
- import root
- database path
- backups root

Voor Docker is `DATABASE_URL` expliciet ingesteld op:

- `file:/app/prisma/dev.db`

## 13. Beveiliging

Technische beveiligingsmaatregelen:

- JWT in HTTP-only cookies
- server-side route guards
- admin guard op gebruikersbeheer, instellingen, referentiebeheer en back-ups
- rate limiting op login
- soft delete in plaats van hard delete als standaardpad
- auditregistratie
- productie-cookies met `secure` ingeschakeld

## 14. Performance en schaal

DOMUS is ontworpen voor een relatief beperkte maar inhoudelijk rijke dataset, passend bij huishoudelijke administratie.

Sterke punten:

- eenvoudige architectuur
- weinig moving parts
- SQLite voldoende voor dit gebruiksscenario
- filesystem opslag efficiënt voor documenten

Beperkingen:

- geen horizontale schaalstrategie
- importanalyse draait nog in-process en niet in een aparte worker/container
- geen server-side pagination op alle lijsten
- dashboard bevat nog steeds relatief rijke samengestelde queries, ondanks lichtere navigatietellers

Voor de huidige doelgroep zijn dit acceptabele ontwerpkeuzes.

## 15. Belangrijke Ontwerpkeuzes

### Waarom SQLite

- eenvoudig self-hostbaar
- geen aparte databaseserver nodig
- goed passend bij single-instance huishoudelijke applicatie

### Waarom filesystem voor bestanden

- eenvoudig te back-uppen
- grote bestanden niet in database
- goed inzichtelijk voor self-hosters

### Waarom één gecombineerde container mogelijk is

- frontend wordt statisch geserveerd door backend
- deployment wordt eenvoudiger
- minder operationele componenten

### Waarom draft-imports

- voorkomt dat onvolledig herkende documenten direct “definitief” worden
- houdt gebruiker in controle
- maakt OCR veilig inzetbaar

## 16. Onderhoud en Verdere Uitbreiding

Technisch logische vervolgrichtingen:

- aparte health endpoint voor Docker healthchecks
- non-root runtime user in Docker
- HTTPS deployment achter reverse proxy
- notification service voor reminders
- slimmere learning rules voor imports
- meer granulariteit in autorisaties
- betere migrate-strategie dan handmatige SQL-bestanden

## 17. Samenvatting

DOMUS is technisch opgezet als een moderne, overzichtelijke en self-hosted full-stack applicatie. De combinatie van React, Express, Prisma, SQLite en filesystem-opslag past goed bij het probleemdomein: administratief beheer met documenten, relaties, verplichtingen en opvolging. Door de toevoeging van importintake, OCR, auditactoren, gebruikersbeheer en Dockerdeployment is de applicatie inmiddels niet alleen functioneel rijk, maar ook operationeel goed inzetbaar.
