# Dorszolandia v23.1 — Premium Multipage QA

Status: **PRODUCTION**

## Zakres poprawki
- naprawiony Kreator na telefonie: brak poziomego wyjścia poza ekran,
- mobilny dock ma 5 równych pozycji i poprawny link do `/sklep`,
- link z Mapy do Dorszopedii prowadzi do `/dorszopedia`,
- strona główna desktop ma zbalansowany układ Dorszusia, Borysa i postaci wspierających bez dużej pustej przestrzeni,
- dokładnie jeden `<h1>` na każdej z 11 stron,
- wewnętrzne linki przeszły na clean URLs (`/mapa`, `/gry`, `/sklep` itd.),
- dodane `og:image`, `twitter:image`, tytuły i opisy do udostępniania linków,
- menu mobilne ma `aria-expanded`, `aria-controls`, `aria-current` i obsługę Escape,
- strony Mapa, Gry, Kreator i Sklep nie ładują już całego `site-data.js`,
- Mieszkańcy, Przygody i Dorszopedia korzystają z mniejszych bundli danych per podstrona,
- 6 ciężkich grafik materiałów zostało przekonwertowanych z PNG do WebP.

## QA
- `python scripts/validate.py` — OK
- `node --check js/app.js` — OK
- 11/11 stron z jednym H1
- 0 błędnych clean routes
- 0 brakujących assetów w HTML
- hamburger ARIA — OK
- OG/Twitter image metadata — OK
- deploy package: `9,978,204 B`
- SHA256: `96651c3c85c1b19113d98148610907e7fb8bbfcc0e206cee1c54852bffae8b6a`

## Dane projektu
- 56 pełnych historii
- 59 postaci Atlasu
- 10 głównych bohaterów cyklu
- 12 miejsc na mapie Premium
- 36 rekwizytów Kreatora

## Prawa
© 2026 Alexander Kuc · Dorszolandia. Wszelkie prawa zastrzeżone.

Pipeline: `main` → Vercel `dorszolandia-one`.
