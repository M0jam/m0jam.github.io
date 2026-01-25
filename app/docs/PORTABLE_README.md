# PlayHub Portable

Dies ist die portable Version von PlayHub, optimiert für die Nutzung auf USB-Laufwerken und externen Festplatten.

## Funktionen

*   **Portabel:** Startet direkt ohne Installation.
*   **Isoliert:** Alle Daten (Einstellungen, Datenbanken, Cache) werden im `data`-Ordner neben der ausführbaren Datei gespeichert.
*   **Keine Spuren:** Hinterlässt keine Einträge in der Windows-Registry oder im Benutzerverzeichnis des Host-Computers.
*   **Laufwerksunabhängig:** Erkennt automatisch den Laufwerksbuchstaben und passt Pfade entsprechend an.

## Installation & Nutzung

1.  Kopieren Sie die `PlayHub_Portable_*.exe` Datei in einen beliebigen Ordner auf Ihrem USB-Stick oder externen Laufwerk.
2.  Starten Sie die Datei (z.B. `PlayHub_Portable_1.0.4.exe`).
3.  Ein Ordner `data` wird automatisch im selben Verzeichnis erstellt. Hier werden alle Ihre Daten gespeichert.

## Hinweise

*   **Verschlüsselung:** In der portablen Version wird ein fester Schlüssel für die Verschlüsselung sensibler Daten (wie Tokens) verwendet, damit diese auch bei einem Wechsel des Laufwerksbuchstabens lesbar bleiben. Beachten Sie, dass jeder, der Zugriff auf die Dateien hat, diese theoretisch entschlüsseln könnte (wie bei den meisten portablen Apps).
*   **Updates:** Automatische Updates sind in der portablen Version deaktiviert, um die Portabilität zu gewährleisten. Bitte laden Sie neuere Versionen manuell herunter.
*   **Pfade:** Wenn Sie Spiele von diesem USB-Laufwerk hinzufügen, stellen Sie sicher, dass PlayHub läuft, bevor Sie die Spiele starten.

## Fehlerbehebung

*   **Keine Daten sichtbar?** Stellen Sie sicher, dass Sie die `.exe` nicht aus einem temporären Verzeichnis (wie im Browser-Download-Dialog) starten, sondern zuerst entpacken/speichern.
*   **Schreibrechte:** Das Laufwerk muss beschreibbar sein, damit PlayHub funktionieren kann.
