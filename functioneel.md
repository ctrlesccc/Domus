# Functioneel Ontwerp DOMUS

## 1. Inleiding

DOMUS is een self-hosted webapplicatie voor huishoudelijke administratie. De applicatie brengt documenten, contacten, persoonlijke relaties, contracten, abonnementen, vaste lasten, planning, auditinformatie en documentintake samen in een centrale beheeromgeving.

Het doel van DOMUS is tweeledig:

- administratieve informatie duurzaam en vindbaar opslaan
- gebruikers actief helpen met overzicht, opvolging, controle en intake van nieuwe informatie

DOMUS is daarmee niet alleen een digitaal archief, maar een werkplek voor dagelijks beheer van wonen, verzekeringen, zorg, energie en andere huishoudelijke onderwerpen.

## 2. Doelgroep

DOMUS richt zich op:

- particulieren en huishoudens die hun administratie centraal willen beheren
- gebruikers die documenten, kosten en relaties in onderlinge samenhang willen zien
- self-hosters die data lokaal of op een eigen server willen bewaren
- kleine beheersituaties met meerdere gebruikers, zoals gezinsleden of vertrouwde beheerders

## 3. Functionele Doelen

De applicatie ondersteunt de volgende hoofddoelen:

- documenten centraal opslaan en van metadata voorzien
- zakelijke en persoonlijke contacten beheren
- verplichtingen zoals verzekeringen, abonnementen en contracten volgen
- kosten op maand- en jaarniveau inzichtelijk maken
- belangrijke data en deadlines bewaken via planning en signalering
- documenten, contacten en verplichtingen groeperen per dossier of onderwerp
- wijzigingen vastleggen in een auditlog
- nieuwe documenten automatisch laten instromen via een importmap
- metadata van imports grotendeels automatisch laten herkennen via OCR en tekstanalyse
- meerdere gebruikers laten beheren met wachtwoordbeheer en rollen

## 4. Hoofdconcepten

### 4.1 Document

Een document is een digitaal bestand met zakelijke of persoonlijke relevantie, bijvoorbeeld:

- polis
- contract
- factuur
- garantiebewijs
- handleiding
- persoonlijk document

Een document bevat naast het bestand ook functionele metadata zoals:

- titel
- documentsoort
- documentdatum
- vervaldatum
- status
- notities
- gekoppelde contacten
- gekoppelde verplichtingen
- dossieronderwerp

Documenten ondersteunen versiebeheer. Hierdoor kan een nieuwe upload als volgende versie van een bestaand document worden opgeslagen, terwijl de oude versie bewaard blijft als historisch archief.

### 4.2 Contact

DOMUS onderscheidt:

- zakelijke contacten
- persoonlijke contacten

Zakelijke contacten zijn bijvoorbeeld verzekeraars, providers, gemeenten of zorgorganisaties. Persoonlijke contacten zijn bijvoorbeeld familie, vrienden of buren.

Persoonlijke contacten ondersteunen extra gegevens zoals:

- geboortedatum
- voorkeur voor verjaardagskaart
- voorkeur voor kerstkaart
- voorkeur voor rouwkaart

### 4.3 Verplichting

Een verplichting is een lopende of geplande administratieve relatie met een financieel of contractueel karakter, bijvoorbeeld:

- verzekering
- abonnement
- energiecontract
- internetcontract
- hypotheek

Per verplichting worden onder andere vastgelegd:

- type
- contractnummer
- bedrag
- frequentie
- startdatum
- einddatum
- opzegtermijn
- betaalmethode
- reminderdatum
- evaluatiedatum
- status
- gekoppelde documenten
- gekoppeld contact
- dossieronderwerp

### 4.4 Dossier

Een dossier is een thematische groepering van informatie. Binnen de huidige app zijn onder meer deze onderwerpen voorzien:

- Verzekeringen
- Wonen
- Zorg
- Energie
- Overig

Een dossier is geen los object met eigen schermbeheer, maar een inhoudelijke indeling die wordt toegekend aan documenten, contacten en verplichtingen. Op basis daarvan toont DOMUS overzichtspagina’s per onderwerp.

### 4.5 Importdocument

Een importdocument is een bestand dat buiten de applicatie in een bewaakte importmap wordt geplaatst. Zo’n bestand wordt niet direct een definitief document in het systeem, maar doorloopt eerst een intakeproces als draft.

Kenmerken van een importdocument:

- automatisch ontdekt via folder monitoring
- zichtbaar in de importqueue
- voorzien van OCR-resultaten en tekstextractie waar mogelijk
- automatisch voorgestelde metadata
- pas definitief na expliciete bevestiging door de gebruiker

### 4.6 Audititem

Elke belangrijke wijziging in de applicatie kan worden vastgelegd in de auditlog. Het audititem bevat onder andere:

- entiteitstype
- entiteit-id
- actie
- oude waarde
- nieuwe waarde
- datum en tijd
- uitvoerende gebruiker

## 5. Gebruikersrollen

DOMUS kent op dit moment twee rollen:

- `ADMIN`
- `USER`

### 5.1 Beheerder

Een beheerder kan:

- inloggen
- eigen wachtwoord wijzigen
- gebruikers aanmaken
- rollen wijzigen
- accounts activeren of deactiveren
- wachtwoorden van andere gebruikers resetten
- instellingen beheren
- referentietypen beheren
- back-ups beheren
- auditinformatie inzien

### 5.2 Gebruiker

Een reguliere gebruiker kan:

- inloggen
- eigen wachtwoord wijzigen
- werken met documenten, contacten, verplichtingen, planning en import
- auditinformatie inzien voor zover de pagina beschikbaar is

Gebruikersbeheer is voorbehouden aan beheerders.

## 6. Hoofdmodules

### 6.1 Inloggen

De loginpagina biedt toegang tot DOMUS via gebruikersnaam en wachtwoord. Na succesvolle authenticatie wordt een sessie-cookie geplaatst waarmee de gebruiker de beveiligde onderdelen van de applicatie kan gebruiken.

De loginpagina bevat:

- DOMUS-logo
- korte introductietekst
- gebruikersnaamveld
- wachtwoordveld
- foutmelding bij mislukte login

### 6.2 Dashboard

Het dashboard is het centrale startpunt na inloggen. De pagina biedt een actueel overzicht van de administratieve situatie.

Belangrijkste onderdelen:

- statistiekkaarten voor aantallen documenten, contacten, verplichtingen en kosten
- signalen voor bijna verlopen documenten
- signalen voor aflopende verplichtingen
- blok met nieuwe importitems
- groepering van polissen per verzekeraar
- datakwaliteitsblokken voor ontbrekende gegevens
- jaarlijkse kostenanalyse
- verdeling van maandkosten per type in cirkeldiagramvorm

Doel van het dashboard:

- snel signaleren
- prioriteren
- vanuit overzicht doorwerken naar detailbeheer

### 6.3 Documenten

De documentenmodule ondersteunt:

- uploaden van nieuwe documenten
- beheren van bestaande documenten
- filteren en zoeken
- previewen binnen de applicatie
- openen in nieuw tabblad
- versiebeheer
- koppelen aan één of meerdere contacten
- koppelen aan één of meerdere verplichtingen
- dossierindeling

De gebruiker kan per document de inhoud administratief verrijken en zo van een los bestand een bruikbare beheereenheid maken.

### 6.4 Documenteditor

De documenteditor wordt gebruikt voor:

- aanmaken van nieuwe documenten
- aanpassen van metadata
- vervangen van het bestand
- aanmaken van een nieuwe versie van een bestaand document

Hier komen bestand, metadata, relaties en status samen.

### 6.5 Contacten

De contactmodule ondersteunt zowel zakelijke als persoonlijke contacten.

Functionaliteit:

- toevoegen
- wijzigen
- archiveren/deactiveren
- contacttype toekennen
- dossieronderwerp kiezen
- relatie leggen met documenten en verplichtingen

Persoonlijke contacten bevatten aanvullend:

- geboortedatum
- kaartvoorkeuren

### 6.6 Verplichtingen

De verplichtingenmodule ondersteunt het vastleggen en volgen van contractuele of financiële verplichtingen.

Functionaliteit:

- toevoegen
- wijzigen
- beëindigen of archiveren
- bedrag en frequentie vastleggen
- documentkoppelingen beheren
- dashboardweergave aan/uit
- review- en reminderdata instellen
- dossieronderwerp toekennen

### 6.7 Zoeken

De zoekmodule biedt een centrale zoekfunctie over:

- documenten
- contacten
- verplichtingen

Doel:

- snel terugvinden van relevante informatie zonder door meerdere modules te hoeven navigeren

### 6.8 Jaarplanning

De jaarplanning brengt opvolging en tijdsgebonden administratie samen in één weergave.

De planning kan gebeurtenissen tonen zoals:

- documentdatums
- vervaldatums
- reminderdata
- reviewdata
- contracteinden
- verjaardagen van persoonlijke contacten

Doel:

- vooruitkijken
- opvolgmomenten niet missen
- administratieve spreiding over het jaar inzichtelijk maken

### 6.9 Dossiers

De dossierpagina groepeert informatie per onderwerp. Hierdoor hoeft de gebruiker niet eerst te bedenken of iets een document, contact of verplichting is.

Per dossier worden samengebracht:

- relevante documenten
- relevante verplichtingen
- relevante contacten

Dit ondersteunt thematisch werken, bijvoorbeeld een volledig overzicht van alle verzekeringsinformatie.

### 6.10 Importqueue

De importmodule ondersteunt een intakeproces voor nieuwe bestanden die buiten de app in een importmap worden geplaatst.

Proces:

1. een bestand komt in de importmap
2. de applicatie detecteert het bestand
3. DOMUS maakt een draft-item in de importqueue
4. OCR en tekstanalyse proberen metadata te herkennen
5. de gebruiker beoordeelt preview, confidence en waarschuwingen
6. de gebruiker vult ontbrekende gegevens aan
7. na akkoord wordt het bestand verplaatst naar de documentopslag en als document opgenomen

Hiermee wordt documentinvoer versneld en gestandaardiseerd.

### 6.11 Auditlog

De auditlog laat zien:

- wat is gewijzigd
- wanneer dat gebeurde
- door wie dat gebeurde

Ondersteunde entiteiten zijn onder andere:

- documenten
- contacten
- verplichtingen
- referentietypen
- instellingen
- gebruikers
- importafhandeling

De auditlog ondersteunt vertrouwen, controle en herstelbaarheid.

### 6.12 Instellingen

De instellingenpagina bundelt meerdere beheerfuncties:

- mijn account
- gebruikersbeheer
- contactsoorten
- documentsoorten
- verplichtingstypen
- app-instellingen
- back-ups
- prullenbak

#### Mijn account

Functionaliteit:

- wachtwoord wijzigen

#### Gebruikersbeheer

Functionaliteit:

- nieuwe gebruiker aanmaken
- weergavenaam wijzigen
- rol wijzigen
- account activeren/deactiveren
- wachtwoord resetten

#### Referentiebeheer

Beheer van:

- contactsoorten
- documentsoorten
- verplichtingstypen

Doel:

- consistente invoer
- betere filtering en analyse

#### App-instellingen

Bevat algemene configuraties, waaronder:

- weergavedichtheid
- overige instelbare applicatieparameters

#### Back-ups

De applicatie kan back-ups tonen en aanmaken van:

- database
- documentopslag

#### Prullenbak

De prullenbak ondersteunt herstel van verwijderde:

- documenten
- verplichtingen
- contacten

## 7. Functionele Processen

### 7.1 Nieuwe administratie registreren

Typisch proces:

1. gebruiker legt contacten vast
2. gebruiker maakt verplichtingen aan
3. gebruiker uploadt of importeert documenten
4. gebruiker koppelt documenten aan relevante contacten en verplichtingen
5. gebruiker vult ontbrekende data aan
6. dashboard en planning gaan de nieuwe informatie meenemen

### 7.2 Intake van documenten via importmap

Dit proces is gericht op minimale handmatige invoer:

1. bestand wordt buiten de app geplaatst
2. DOMUS herkent en registreert het bestand als draft
3. OCR en patroonherkenning vullen zoveel mogelijk metadata vooraf in
4. gebruiker controleert en verrijkt de gegevens
5. gebruiker finaliseert de intake

### 7.3 Doorlopende bewaking

Gebruikers kunnen DOMUS periodiek gebruiken om:

- het dashboard te controleren
- de planning te bekijken
- ontbrekende gegevens aan te vullen
- importdrafts af te handelen
- auditlog te raadplegen

## 8. Gebruikerservaring

DOMUS is ontworpen als rustige beheeromgeving met:

- duidelijke visuele hiërarchie
- dashboard als cockpit
- thematische dossierweergave
- mobiele hamburgernavigatie
- compacte of comfortabele weergavedichtheid
- inline previews waar relevant

De app wil vooral praktisch, betrouwbaar en overzichtelijk zijn.

## 9. Beveiliging en Vertrouwen

Functioneel gezien steunt DOMUS op:

- verplichte login
- gebruikersrollen
- accountactivatie
- auditlog
- prullenbak
- back-ups
- self-hosted opslag

Deze combinatie ondersteunt zowel dagelijks gemak als beheersbaarheid.

## 10. Randvoorwaarden

Voor correct gebruik gelden functioneel de volgende randvoorwaarden:

- de gebruiker moet toegang hebben tot een browser
- de applicatie moet kunnen schrijven naar documentopslag, importmap en back-upmap
- voor OCR van afbeeldingen kan extra runtime-activiteit nodig zijn
- voor multi-user gebruik moeten accounts beheerd worden via Instellingen

## 11. Samenvatting

DOMUS is functioneel ontworpen als een samenhangend administratief platform voor huishoudelijk beheer. De applicatie combineert archivering, relatiebeheer, verplichtingenbeheer, planning, importautomatisering en auditcontrole in één omgeving. De kernkracht zit in de onderlinge samenhang tussen documenten, contacten, verplichtingen en onderwerpen, waardoor gebruikers niet alleen informatie opslaan, maar die informatie ook actief kunnen beheren en opvolgen.
