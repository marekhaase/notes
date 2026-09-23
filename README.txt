POZNÁMKY (webová verze)
========================

SPUŠTĚNÍ
--------
Stačí dvakrát kliknout na index.html - otevře se ve výchozím
prohlížeči. Žádná instalace, žádný Python, žádný server.

Funguje úplně stejně jako předchozí desktopová appka:
- Kategorie (předměty) - přidávání, mazání, filtrování
- Datum a hodina u každé poznámky, dvouhodinovky
- Týdenní rozvrh - nastavíš jednou, jaký předmět máš kdy
- Časy hodin - appka podle skutečného aktuálního času pozná,
  která hodina zrovna probíhá, a při "+ Nová" rovnou předvyplní
  správný předmět
- Rozvrh dne - přehled poznámek podle hodin pro zvolený den
- Tučné a kurzíva formátování (označ text a klikni, nebo Ctrl+B/I)
- Koš - smazané poznámky jde 7 dní obnovit
- Sdílení - export otevřené poznámky jako .txt soubor
- Zoom textu - Ctrl+kolečko myši, Ctrl+/Ctrl-, Ctrl+0 reset

KLÁVESOVÉ ZKRATKY
-----------------
Ctrl+N   nová poznámka
Ctrl+F   fokus do vyhledávání
Ctrl+B   tučně (v textu poznámky)
Ctrl+I   kurzíva (v textu poznámky)
Ctrl+D   přepnout "Dvouhodinovka"
Ctrl+R   otevřít rozvrh dne

DATA
----
Všechno se ukládá do localStorage přímo v prohlížeči (na tomhle
počítači, v tomhle prohlížeči). Nic se neposílá nikam po síti.

Pozor: localStorage je vázaný na konkrétní prohlížeč. Pokud appku
otevřeš jednou ve Firefoxu a podruhé v Chromu, uvidíš dvě different
sady dat. Drž se jednoho prohlížeče, nebo si nastav Poznámky jako
výchozí appku pro index.html.

Zálohu dat (pro jistotu, nebo přenos na jiný počítač) zatím appka
neumí exportovat jedním klikem - kdyby se to hodilo, stačí říct.

IKONA NA PLOŠE / V NABÍDCE APLIKACÍ (volitelné)
------------------------------------------------
Pokud chceš appku spouštět jako "normální appku" z nabídky
aplikací (ne jen otevírat soubor v prohlížeči), dej vědět -
dá se to zaregistrovat podobně jako předchozí desktopová verze,
jen appka poběží v prohlížeči místo přes Python/tkinter.
