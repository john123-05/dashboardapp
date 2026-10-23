
import { tr } from '../i18n';/**
 * Ein Verzeichnis für alle Namen, die im Dashboard auftauchen können.
 *
 * Warum zentral: dieselben Dinge erreichen die Seite aus drei Richtungen -
 * direkt vom Automaten (`operator-liftpic-health`), über die Auswertung der
 * hochgeladenen Dateien (`park-dashboard-data`) und aus der älteren
 * `system-health`. Jede Quelle schreibt den Namen anders, und keine davon
 * liefert eine Erklärung mit. Ohne ein gemeinsames Verzeichnis steht auf
 * derselben Seite "3GerTis Steuerung", "Kamera" und "Kamera-Software"
 * nebeneinander - für den Betreiber drei verschiedene Dinge.
 *
 * Regel für jeden Eintrag: **vorne, was es tut. Dahinter, wie es auf dem PC
 * heisst.** Der Klarname muss ohne Vorwissen verständlich sein; der technische
 * Name ist das, was ein Techniker am Telefon hören will.
 */

export type Quelle = 'automat' | 'server' | 'unbekannt';

export type Benennung = {
  /** Was es tut - in Worten, die keine Vorkenntnis brauchen. */
  klar: string;
  /** Wie es auf dem PC heisst. Leer, wenn es keinen eigenen Namen hat. */
  tech: string;
  /** Ein Satz dazu, wofür es gut ist. */
  zweck: string;
  /** Steht es am Automaten oder auf unseren Servern? */
  quelle: Quelle;
};

type Eintrag = Benennung & { muster: RegExp };

/**
 * Reihenfolge zählt: das erste passende Muster gewinnt. Speziellere Muster
 * stehen deshalb vor allgemeineren ("Kartenterminal-Prüfung" vor
 * "Kartenterminal").
 */
const VERZEICHNIS: Eintrag[] = [
  // ---------------------------------------------------------------- Automat
  {
    muster: /^(kamera[- ]?software|3ger\s*tis.*|kamera(\s*\(tiscapture\))?|tiscapture|camera_?capture|camera26)$/i,
    get klar() { return tr('Kamera-Software'); }, tech: '3GerTis', quelle: 'automat',
    get zweck() { return tr('Nimmt das Foto auf, sobald die Lichtschranke auslöst.'); },
  },
  {
    muster: /^(lichtschranke.*|aidatest|speedshot)$/i,
    get klar() { return tr('Lichtschranke'); }, tech: 'AidaTest', quelle: 'automat',
    get zweck() { return tr('Erkennt Gäste und löst die Kamera aus.'); },
  },
  {
    muster: /^(verkaufsprogramm.*|photoviewer.*)$/i,
    get klar() { return tr('Verkaufsprogramm'); }, tech: 'PhotoViewer', quelle: 'automat',
    get zweck() { return tr('Bildschirm am Automaten: Fotos, Zahlung, Druck.'); },
  },
  {
    muster: /^(münzeinnahmen|muenzeinnahmen|münzstatistik|muenzstatistik|coinstats)$/i,
    get klar() { return tr('Münzeinnahmen'); }, tech: 'CoinStats', quelle: 'automat',
    get zweck() { return tr('Tagesabrechnung der Münzkasse.'); },
  },
  {
    muster: /^(münzprüfer|muenzpruefer|nri.*|coin\s*changer)$/i,
    get klar() { return tr('Münzprüfer'); }, tech: 'NRI CoinCharger', quelle: 'automat',
    get zweck() { return tr('Nimmt Münzen an und gibt Wechselgeld.'); },
  },
  {
    muster: /^(kartenterminal[- ]?prüfung|kartenterminal[- ]?pruefung|terminal[- ]?prüfung|checkingtool)$/i,
    get klar() { return tr('Kartenterminal-Prüfung'); }, tech: 'CheckingTool', quelle: 'automat',
    get zweck() { return tr('Prüft, ob das Terminal antwortet.'); },
  },
  {
    muster: /^(kartenterminal|zvt.*|easyzvt)$/i,
    get klar() { return tr('Kartenterminal'); }, tech: 'ZVT', quelle: 'automat',
    get zweck() { return tr('Bezahlterminal für EC und Kreditkarte.'); },
  },
  {
    muster: /^(drucker|printer|printsettings)$/i,
    get klar() { return tr('Drucker'); }, tech: 'Windows-Drucker', quelle: 'automat',
    get zweck() { return tr('Gibt die gekauften Bilder aus.'); },
  },
  {
    // "Liftpic Sync 7623" kommt mit angehängtem Kameracode aus park-dashboard-data.
    muster: /^(uploader|bild[- ]?upload|liftpic[- ]?sync.*)$/i,
    get klar() { return tr('Uploader'); }, tech: 'liftpic-sync', quelle: 'automat',
    get zweck() { return tr('Lädt die Fotos zu Liftpictures hoch.'); },
  },
  {
    muster: /^(statistik[- ]?e-?mail|tagesbericht.*)$/i,
    get klar() { return tr('Statistik-E-Mail'); }, tech: 'Tagesbericht', quelle: 'automat',
    get zweck() { return tr('Täglicher Umsatzbericht. Nebenfunktion.'); },
  },
  {
    muster: /^(abholcode|code-?vorschrift)$/i,
    get klar() { return tr('Abholcode'); }, tech: 'Settings.xml', quelle: 'automat',
    get zweck() { return tr('Legt fest, welche Nummer auf den Beleg gedruckt wird.'); },
  },
  {
    muster: /^(internetverbindung|netzwerk|internetconnection)$/i,
    get klar() { return tr('Internetverbindung'); }, tech: 'Netzwerk', quelle: 'automat',
    get zweck() { return tr('Nötig für Upload und Kartenzahlung.'); },
  },
  {
    muster: /^(anschlüsse|anschluesse|com-?schnittstellen)$/i,
    get klar() { return tr('Anschlüsse'); }, tech: 'COM-Schnittstellen', quelle: 'automat',
    get zweck() { return tr('Steckplätze für Lichtschranke und Münzprüfer.'); },
  },
  {
    muster: /^(speicherplatz|festplatte|disk)$/i,
    get klar() { return tr('Speicherplatz'); }, tech: 'Festplatte', quelle: 'automat',
    get zweck() { return tr('Freier Speicher für neue Fotos.'); },
  },
  {
    muster: /^(arbeitsspeicher|ram|memory)$/i,
    get klar() { return tr('Arbeitsspeicher'); }, tech: 'RAM', quelle: 'automat',
    get zweck() { return tr('Arbeitsspeicher des PCs.'); },
  },
  {
    muster: /^(pc-?laufzeit|uptime)$/i,
    get klar() { return tr('PC-Laufzeit'); }, tech: 'Windows', quelle: 'automat',
    get zweck() { return tr('Laufzeit seit dem letzten Neustart.'); },
  },
  {
    muster: /^(uhrzeit|clock)$/i,
    get klar() { return tr('Uhrzeit'); }, tech: 'Windows-Zeitdienst', quelle: 'automat',
    get zweck() { return tr('Steht im Abholcode jedes Fotos. Geht sie falsch, finden Gäste ihre Bilder nicht.'); },
  },

  // ----------------------------------------------------------------- Server
  {
    muster: /^external database$/i,
    get klar() { return tr('Datenbank'); }, tech: 'Supabase', quelle: 'server',
    get zweck() { return tr('Speichert Fotos, Verkäufe und Einstellungen.'); },
  },
  {
    muster: /^photo upload service$/i,
    get klar() { return tr('Foto-Ablage'); }, tech: 'Storage', quelle: 'server',
    get zweck() { return tr('Nimmt die hochgeladenen Bilder entgegen.'); },
  },
  {
    muster: /^payment processing$/i,
    get klar() { return tr('Zahlungsabwicklung'); }, tech: 'Payments', quelle: 'server',
    get zweck() { return tr('Verbucht die Online-Käufe der Gäste.'); },
  },
  {
    muster: /^cdn \/ image delivery$/i,
    get klar() { return tr('Bild-Auslieferung'); }, tech: 'CDN', quelle: 'server',
    get zweck() { return tr('Liefert die Fotos schnell an die Gäste aus.'); },
  },
  {
    muster: /^stripe api$/i,
    get klar() { return tr('Online-Bezahlung'); }, tech: 'Stripe', quelle: 'server',
    get zweck() { return tr('Wickelt Kartenzahlungen im Webshop ab.'); },
  },
];

/**
 * Namen in Klarname + technischen Namen zerlegen.
 *
 * Unbekannte Namen kommen unverändert zurück und gelten als `unbekannt` - sie
 * verschwinden dadurch nirgends, werden aber auch nicht falsch einsortiert.
 * Trägt der Name die Technik bereits in Klammern ("Kamera (TIScapture)"), wird
 * sie herausgelöst statt doppelt angezeigt.
 */
export function benenne(rohname: string | null | undefined): Benennung {
  const name = (rohname || '').trim();
  if (!name) return { klar: tr('Unbenannt'), tech: '', zweck: '', quelle: 'unbekannt' };

  for (const eintrag of VERZEICHNIS) {
    if (eintrag.muster.test(name)) {
      return {
        klar: eintrag.klar, tech: eintrag.tech,
        zweck: eintrag.zweck, quelle: eintrag.quelle,
      };
    }
  }

  const klammer = name.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (klammer) {
    return {
      klar: klammer[1].trim(), tech: klammer[2].trim(),
      zweck: '', quelle: 'unbekannt',
    };
  }
  return { klar: name, tech: '', zweck: '', quelle: 'unbekannt' };
}

/** Steht dieses Ding am Automaten? Entscheidet, wo es angezeigt gehört. */
export function stehtAmAutomaten(name: string | null | undefined): boolean {
  return benenne(name).quelle === 'automat';
}
