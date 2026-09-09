# Dorszolandia v22 PREMIUM — FINAL

Wersja premium zgodna z makietami użytkownika z 09.09.2026, bez utraty danych v21.

## Najważniejsze zmiany
- hero premium zgodny z kierunkiem makiet,
- mapa premium z 12 nazwanymi miejscami,
- Dorszuś i Borys podmienieni na grafiki z przesłanego ZIP,
- Krab Szczękacz i Pani Świecikora podmienieni na wersje z ZIP,
- Krab Krabiewicz dodany jako 10. postać cyklu,
- warstwa CSS premium: szkło, mocniejsze karty, zwarty landing i bogatsze sekcje,
- zachowane 56 pełnych historii, 59 bohaterów Atlasu i 36 rekwizytów Kreatora.

## Pakiet wdrożeniowy
Google Drive file ID: `1RiXybg-8NtLTiq5oyAsVrK8fujzHT62Q`
SHA256: `f50e56ff3f5162a22ace82aa5729bf9837371bd60769d13392cd0002e88fa43e`
Bytes: `20332188`

Pakiet deploy został odchudzony wyłącznie o nieużywane runtime `assets/characters/sourcecards`; wszystkie zasoby rzeczywiście referencjonowane przez stronę pozostały.

## QA
- `python scripts/validate.py` — OK
- `node --check js/app.js` — OK
- 170 unikalnych odwołań do assetów sprawdzone
- brakujące assety: 0
- 56 historii
- 59 postaci Atlasu
- 10 postaci cyklu
- 12 pinów mapy
- 36 rekwizytów
- Vercel Preview — SUCCESS

## Plik do pobrania
`Dorszolandia_v22_PREMIUM_FINAL.zip` został zapisany w folderze Drive v22 Premium.

Status: gotowe do produkcji.
