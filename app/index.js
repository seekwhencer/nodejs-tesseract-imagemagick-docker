import './globals.js';
import './log.js';
import KazIO from "./io.js";

/*

Deutsche Bank Kontoauszüge OCR Service.

Kopiere einfach PDF-Files in den angegebenen Source-Ordner.
Du kannst auch Unterordner erstellen.

!!! Eine Instanz ist ein Quell-Ordner und ein Ziel-Ordner. !!!

Programmablauf:

- es werden alle PDF-Files (recursiv) vom Source-Ordner indiziert
- es wird geschaut, ob davon schon Bilder erzeugt / ob das PDF in Bilder konvertiert wurde
- wenn keine Bilder existieren, werden welche mit imagemagick erzeugt
- die Bilder pro pdf mit tesseract analysieren, Text extrahieren
- die Daten als JSON speichern

*/

// create an instance for a specific source root target root folder
// the folder must be absolute
// the folder must be a read only docker shared volume

const io = new KazIO({
    sourceRootPath: '/kaz/source',
    targetRootPath: '/kaz/target',
    forceConversion: false,
    forceRecognition: true
});

// register the finish event with you own
io.on('finished', () => {
    // do something
});

// just kick ass the process
io.run();