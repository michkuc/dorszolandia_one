# Dorszolandia v24.1 — Premium Shop Polish

Status: **PRODUCTION**

## Cel
Dopracowanie podstrony `/sklep` według premium referencji użytkownika, bez uruchamiania sprzedaży przed gotowością operacyjną.

## Zmiany
- zachowano dedykowany hero `hero-sklep.webp`,
- dodano 8 kategorii z działającym filtrowaniem,
- przebudowano katalog na 6 kart koncepcji produktów,
- dodano wizualne mockupy książki, plecaka, kubka, maskotki, koszulki i plakatu z istniejących assetów Dorszolandii,
- dodano pasek założeń przyszłego sklepu,
- dodano sekcję planowanego zestawu Dorszolandii,
- dodano CTA „Powiadom mnie o starcie” przez e-mail,
- zachowano lokalną listę pomysłów bez konta,
- brak cen, płatności, aktywnego koszyka i komunikatów sugerujących działającą sprzedaż.

## QA
- `scripts/validate.py` — OK,
- `node --check js/app.js` — OK,
- `/sklep`: 1 H1,
- 8 filtrów kategorii,
- 6 kart produktów koncepcyjnych,
- 7 przycisków zapisywania pomysłów,
- 0 brakujących lokalnych assetów sklepu,
- responsive CSS dla desktop/tablet/mobile.

## Prawa
© 2026 Alexander Kuc · Dorszolandia. Wszelkie prawa zastrzeżone.

Pipeline: `main` → Vercel `dorszolandia-one`.
