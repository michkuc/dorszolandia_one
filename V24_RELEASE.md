# Dorszolandia v24 — Premium Visual Redesign

Status: **PRODUCTION**

## Zakres
- wykorzystano grafiki premium dostarczone przez użytkownika jako rzeczywiste hero i tła serwisu,
- strona główna korzysta z nowego głównego artworku Dorszolandii,
- `/mieszkancy` używa dedykowanego bannera Bohaterowie i mieszkańcy,
- `/przygody` używa bannera Opowieści,
- `/dorszopedia` używa bannera Dorszopedia,
- `/gry` używa bannera Gry,
- `/kreator` używa bannera Kreator Dorsza,
- `/sklep` używa bannera Sklep,
- pozostałe podstrony korzystają z premium tła świata,
- top navigation ma pływający szklany wygląd,
- główna strona została uproszczona do 6 wizualnych wejść do najważniejszych światów,
- zachowano Mapę, Materiały i Piosenkę jako osobne dodatkowe wejścia,
- sekcje i karty dostały szklane, bardziej przestrzenne powierzchnie i spójne błękitno-złote CTA,
- pionowa makieta użytkownika była wzorcem kompozycji i hierarchii, nie jest publikowana jako osobny obraz.

## Funkcje zachowane
- 56 pełnych historii,
- 59 postaci Atlasu,
- 10 bohaterów głównego cyklu,
- 12 miejsc mapy Premium,
- 36 rekwizytów Kreatora,
- 6 gier,
- sklep pozostaje planem bez aktywnej sprzedaży.

## QA
- `scripts/validate.py` — OK,
- `node --check js/app.js` — OK,
- 11/11 stron z pojedynczym H1,
- 0 brakujących lokalnych assetów HTML,
- 8 grafik premium zoptymalizowanych do WebP,
- clean URLs zachowane.

## Prawa
© 2026 Alexander Kuc · Dorszolandia. Wszelkie prawa zastrzeżone.

Pipeline: `main` → Vercel `dorszolandia-one`.
