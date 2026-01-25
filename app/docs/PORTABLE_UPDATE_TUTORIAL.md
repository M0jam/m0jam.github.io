# Tutorial: Update der portablen PlayHub-Version

Dieses Tutorial beschreibt detailliert, wie Sie eine bestehende portable Version von PlayHub auf einem USB-Stick oder externen Laufwerk durch eine neuere Version ersetzen, ohne Ihre Daten zu verlieren.

## Warum ist dieser Prozess notwendig?
Da die portable Version über keine automatische Update-Funktion verfügt (um die Portabilität zu gewährleisten und Änderungen am Host-System zu vermeiden), müssen Updates manuell durchgeführt werden. Dies stellt sicher, dass:
*   Neue Funktionen und Fehlerbehebungen angewendet werden.
*   Ihre Datenbank und Einstellungen (`data`-Ordner) erhalten bleiben.
*   Keine Konflikte mit alten Dateien entstehen.

## Voraussetzungen
*   **Neue Version:** Die Datei `PlayHub_Portable_X.X.X.exe` (z.B. aus dem Build-Ordner oder von GitHub).
*   **Ziel-Laufwerk:** Der USB-Stick/Festplatte mit der alten Version.
*   **Backup (Empfohlen):** Eine Sicherheitskopie des `data`-Ordners.

---

## Schritt-für-Schritt-Anleitung

### Schritt 1: Identifikation der Dateien
1.  Öffnen Sie den Ordner auf Ihrem USB-Stick, in dem PlayHub liegt.
2.  Notieren Sie den Namen der aktuellen Datei (z.B. `PlayHub_Portable_1.0.3.exe`).
3.  Stellen Sie sicher, dass PlayHub **nicht läuft**.

### Schritt 2: Download der neuen Version
Laden Sie die neueste portable `.exe`-Datei herunter (z.B. von GitHub Releases oder aus Ihrem lokalen `dist`-Ordner).
*   *Hinweis:* Achten Sie darauf, dass der Dateiname die Version enthält (z.B. `PlayHub_Portable_1.0.4.exe`).

### Schritt 3: Vergleich (Optional aber empfohlen)
Prüfen Sie, ob die neue Datei vertrauenswürdig ist.
*   Rechtsklick auf die neue Datei -> `Eigenschaften` -> `Details`.
*   Vergleichen Sie die Versionsnummer und das Änderungsdatum.

### Schritt 4: Austausch der Datei
1.  **Löschen** Sie die alte `.exe`-Datei vom USB-Stick (oder verschieben Sie sie in einen Backup-Ordner).
    *   *Wichtig:* Löschen Sie **NICHT** den `data`-Ordner! Dieser enthält Ihre Spiele-Bibliothek und Logins.
2.  **Kopieren** Sie die neue `PlayHub_Portable_1.0.4.exe` in denselben Ordner.

### Schritt 5: Integration testen
1.  Starten Sie die neue `.exe`-Datei vom USB-Stick.
2.  PlayHub sollte starten und automatisch den bestehenden `data`-Ordner erkennen.
3.  Überprüfen Sie, ob Ihre Spiele und Einstellungen noch vorhanden sind.
4.  Gehen Sie zu `Einstellungen` -> `Über`, um die neue Versionsnummer zu bestätigen.

---

## Mögliche Fallstricke & Lösungen

| Problem | Lösung |
| :--- | :--- |
| **Daten weg?** | Haben Sie den `data`-Ordner gelöscht oder verschoben? Stellen Sie das Backup wieder her. |
| **Fehlermeldung beim Start?** | Stellen Sie sicher, dass keine Instanz von PlayHub im Hintergrund läuft (Task-Manager prüfen). |
| **Laufwerksbuchstabe geändert?** | PlayHub korrigiert Pfade automatisch beim Start eines Spiels. Falls ein Spiel nicht startet, versuchen Sie es erneut. |
| **Virenscanner blockiert?** | Da portable Dateien oft executable sind, kann es zu Fehlalarmen kommen. Fügen Sie eine Ausnahme hinzu. |

---

## Checkliste zur Validierung
- [ ] Alte `.exe` wurde entfernt/verschoben.
- [ ] Neue `.exe` befindet sich im Root-Verzeichnis des USB-Ordners.
- [ ] Der `data`-Ordner ist unberührt an der gleichen Stelle.
- [ ] PlayHub startet ohne Fehlermeldung.
- [ ] Versionsnummer in den Einstellungen ist korrekt.
- [ ] Ein Spiel lässt sich starten (Test der Pfad-Korrektur).
