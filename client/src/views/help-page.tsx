import { PageHeader } from "../ui/page-header";

const modules = [
  {
    title: "Dashboard",
    description:
      "Het dashboard bundelt signalen, kosten, importwachtrij en datakwaliteit in een werkoverzicht. Je ziet direct welke documenten of verplichtingen aandacht nodig hebben.",
  },
  {
    title: "Documenten",
    description:
      "Beheer documenten met preview, versiebeheer, gekoppelde contacten, verplichtingen, dossierindeling en statusbewaking. Nieuwe versies blijven netjes gegroepeerd.",
  },
  {
    title: "Contacten",
    description:
      "Zakelijke en persoonlijke contacten worden apart beheerd. Persoonlijke contacten ondersteunen geboortedatum en kaartvoorkeuren, zodat planning en opvolging completer worden.",
  },
  {
    title: "Verplichtingen",
    description:
      "Leg contracten, abonnementen, polissen en andere vaste lasten vast met bedrag, frequentie, evaluatiedatum, herinnering en einddatum.",
  },
  {
    title: "Jaarplanning",
    description:
      "De jaarplanning brengt documentdata, vervaldata, herinneringen, evaluaties, contracteinden en verjaardagen samen op een tijdlijn.",
  },
  {
    title: "Dossiers",
    description:
      "Onderwerpen zoals Verzekeringen, Wonen, Zorg en Energie tonen documenten, contacten en verplichtingen in samenhang. Zo werk je per thema in plaats van per lijst.",
  },
  {
    title: "Import",
    description:
      "Bestanden die in de importmap worden geplaatst verschijnen automatisch als concept in de intakequeue. Daar controleer en verrijk je de metadata voordat ze definitief worden opgenomen.",
  },
  {
    title: "Auditlog",
    description:
      "De auditlog laat wijzigingen aan documenten, contacten, verplichtingen, referenties en instellingen zien. Dat geeft transparantie en helpt bij herstel of controle.",
  },
];

const importFlow = [
  "Plaats bestanden buiten de app in de bewaakte importmap.",
  "DOMUS ontdekt nieuwe bestanden automatisch en zet ze in de importqueue als draft.",
  "OCR en tekstanalyse proberen titel, documentsoort, contact, data, dossier en notities al vooraf in te vullen.",
  "In de intake controleer je preview, confidence en waarschuwingen en vul je alleen aan wat nog ontbreekt.",
  "Pas na jouw akkoord wordt het bestand verplaatst naar de documentopslag en als definitief document opgenomen.",
];

const practicalTips = [
  "Gebruik dossieronderwerpen consequent. Dat maakt de dossierweergave en dashboardanalyse veel sterker.",
  "Vul documentdatum, vervaldatum, reviewdatum en geboortedata zoveel mogelijk in. De planning wordt daardoor waardevoller.",
  "Koppel documenten aan contacten en verplichtingen. Zo ontstaat een bruikbaar netwerk tussen bestanden, partijen en kosten.",
  "Gebruik de importqueue als intakeplek en niet als eindstation. Werk concepten zo snel mogelijk af voor een schoon systeem.",
  "Controleer regelmatig de auditlog, importqueue en blokken met ontbrekende gegevens op het dashboard.",
];

const settingsItems = [
  "Referentietypen beheren voor contacten, documenten en verplichtingen.",
  "Back-ups maken van database en documentopslag.",
  "Prullenbak controleren en herstelbare items terugzetten.",
  "Weergavedichtheid kiezen tussen comfort en compact.",
];

export function HelpPage() {
  return (
    <>
      <PageHeader
        eyebrow="Help"
        title="Gebruik en mogelijkheden"
        description="Praktische uitleg over de modules, importworkflow en beheerfuncties die momenteel beschikbaar zijn in DOMUS."
      />

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="app-card px-6 py-6">
          <div className="app-section-kicker">Doel</div>
          <h3 className="app-section-title mt-2">Waar DOMUS voor bedoeld is</h3>
          <p className="mt-4 text-sm leading-7 text-stone-700">
            DOMUS is een centrale werkplek voor huishoudelijke administratie. De app combineert documenten,
            contacten, verplichtingen, planning, dossiervorming en kostenbewaking in een rustige omgeving die
            vooral gericht is op overzicht en opvolging.
          </p>
          <p className="mt-4 text-sm leading-7 text-stone-700">
            Het systeem is bedoeld om informatie niet alleen op te slaan, maar ook actief bruikbaar te maken:
            wat loopt af, wat ontbreekt nog, wat kost iets, wie hoort erbij en welk onderwerp vraagt aandacht.
          </p>
        </div>

        <div className="app-card px-6 py-6">
          <div className="app-section-kicker">Navigatie</div>
          <h3 className="app-section-title mt-2">Hoe je door de app werkt</h3>
          <div className="mt-4 space-y-3 text-sm text-stone-700">
            <div className="rounded-2xl bg-sand-50 px-4 py-3">Desktop: volledig linkermenu met alle hoofdmodules.</div>
            <div className="rounded-2xl bg-sand-50 px-4 py-3">Mobiel: compact hamburger-menu zodat de inhoud centraal blijft staan.</div>
            <div className="rounded-2xl bg-sand-50 px-4 py-3">Instellingen: centrale plek voor dichtheid, referenties, back-ups en beheer.</div>
            <div className="rounded-2xl bg-sand-50 px-4 py-3">Zoeken: snelle ingang om documenten, contacten en verplichtingen terug te vinden.</div>
          </div>
        </div>
      </section>

      <section className="app-card px-6 py-6">
        <div className="app-section-kicker">Modules</div>
        <h3 className="app-section-title mt-2">Wat je in DOMUS kunt doen</h3>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {modules.map((module) => (
            <div className="rounded-[1.35rem] bg-sand-50/85 px-4 py-4" key={module.title}>
              <div className="font-semibold text-ink-900">{module.title}</div>
              <p className="mt-2 text-sm leading-6 text-stone-600">{module.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div className="app-card px-6 py-6">
          <div className="app-section-kicker">Importflow</div>
          <h3 className="app-section-title mt-2">Van importmap naar definitief document</h3>
          <div className="mt-4 space-y-3 text-sm text-stone-700">
            {importFlow.map((step, index) => (
              <div className="rounded-2xl bg-sand-50 px-4 py-3" key={step}>
                {index + 1}. {step}
              </div>
            ))}
          </div>
        </div>

        <div className="app-card px-6 py-6">
          <div className="app-section-kicker">OCR en Suggesties</div>
          <h3 className="app-section-title mt-2">Wat automatisch wordt vooringevuld</h3>
          <p className="mt-4 text-sm leading-7 text-stone-700">
            Nieuwe importdocumenten worden geanalyseerd met tekstextractie en OCR. DOMUS probeert daarbij onder
            meer titel, documentsoort, contact, documentdatum, vervaldatum, dossier en notities alvast te herkennen.
          </p>
          <p className="mt-4 text-sm leading-7 text-stone-700">
            De intake toont confidence-scores en waarschuwingen, zodat je snel ziet welke velden betrouwbaar zijn
            en welke nog handmatige controle nodig hebben. Hierdoor blijft de gebruiker in controle, terwijl de
            app het meeste voorwerk al doet.
          </p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr_1fr]">
        <div className="app-card px-6 py-6">
          <div className="app-section-kicker">Planning</div>
          <h3 className="app-section-title mt-2">Waar de jaarplanning op let</h3>
          <div className="mt-4 space-y-2 text-sm text-stone-700">
            <div className="rounded-2xl bg-sand-50 px-4 py-3">Documentdatums en vervaldatums</div>
            <div className="rounded-2xl bg-sand-50 px-4 py-3">Herinneringen en evaluatiedata van verplichtingen</div>
            <div className="rounded-2xl bg-sand-50 px-4 py-3">Contracteinden en aflopende afspraken</div>
            <div className="rounded-2xl bg-sand-50 px-4 py-3">Verjaardagen van persoonlijke contacten</div>
          </div>
        </div>

        <div className="app-card px-6 py-6">
          <div className="app-section-kicker">Dossiers</div>
          <h3 className="app-section-title mt-2">Werken per onderwerp</h3>
          <p className="mt-4 text-sm leading-7 text-stone-700">
            Dossiers bundelen losse gegevens tot een onderwerp. Als documenten, contacten en verplichtingen
            hetzelfde dossier hebben, kun je veel sneller per thema werken, bijvoorbeeld rond verzekeringen,
            wonen, zorg of energie.
          </p>
        </div>

        <div className="app-card px-6 py-6">
          <div className="app-section-kicker">Controle</div>
          <h3 className="app-section-title mt-2">Audit en herstel</h3>
          <p className="mt-4 text-sm leading-7 text-stone-700">
            De auditlog houdt belangrijke wijzigingen bij. Verwijderde gegevens gaan eerst naar de prullenbak en
            blijven daar herstelbaar. Samen met back-ups geeft dat extra zekerheid bij dagelijks gebruik.
          </p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div className="app-card px-6 py-6">
          <div className="app-section-kicker">Instellingen</div>
          <h3 className="app-section-title mt-2">Beheerfuncties</h3>
          <div className="mt-4 space-y-3 text-sm text-stone-700">
            {settingsItems.map((item) => (
              <div className="rounded-2xl bg-sand-50 px-4 py-3" key={item}>
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="app-card px-6 py-6">
          <div className="app-section-kicker">Aanpak</div>
          <h3 className="app-section-title mt-2">Aanbevolen werkwijze</h3>
          <div className="mt-4 space-y-3 text-sm text-stone-700">
            {practicalTips.map((item, index) => (
              <div className="rounded-2xl bg-sand-50 px-4 py-3" key={item}>
                {index + 1}. {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
