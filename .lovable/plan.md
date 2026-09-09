# BlushLuxe — roze community-app

Een mobile-first app in Pinterest-stijl waar mensen foto's delen, elkaars posts liken en reviews met sterren achterlaten. Te installeren op je telefoon als app-icoon.

## Uitstraling

Verfijnd luxe roze: zacht poederroze achtergrond, diep roomrood/rozehout als accent, warme champagne-tinten, veel witruimte, zachte ronde hoeken en subtiele schaduwen. Een elegant serif-lettertype voor titels, rustige schreefloze tekst daaronder. Geen felroze, geen paarse verlopen.

## Schermen

1. **Ontdek (startpagina)** — foto's in een Pinterest-achtig metselwerkraster, twee kolommen op mobiel. Zoekbalk bovenaan, hartje op elke foto.
2. **Zoeken** — zoeken op titel, omschrijving en tags; resultaten in hetzelfde raster.
3. **Postdetail** — grote foto, titel, omschrijving, maker, hartjes, en daaronder reviews met sterrenscore plus het gemiddelde.
4. **Uploaden** — foto kiezen, titel, omschrijving en tags invullen. Alleen voor ingelogde gebruikers.
5. **Profiel** — eigen foto's, naam en avatar aanpassen, uitloggen.
6. **Inloggen/registreren** — e-mail met wachtwoord en inloggen met Google.

Onderaan een vaste navigatiebalk: Ontdek, Zoeken, Uploaden, Profiel.

## Regels

- Iedereen kan bladeren, zoeken en posts bekijken zonder account.
- Hartjes, uploads, sterren en reviews vereisen inloggen; anders verschijnt een nette "log in om dit te doen"-knop.
- Eén review per persoon per post, aan te passen of te verwijderen door de schrijver.
- Je kunt je eigen foto's en reviews verwijderen, die van anderen niet.

## Installeerbaar op telefoon

App-naam, app-icoon en roze themakleur zodat BlushLuxe via "Zet op beginscherm" als echte app opent. Geen offline-modus (niet gevraagd).

## Technisch

- Lovable Cloud aanzetten voor accounts, database en bestandsopslag.
- Tabellen: `profiles` (naam, avatar), `posts` (afbeelding, titel, omschrijving, tags, maker), `likes` (uniek per gebruiker+post), `reviews` (score 1-5, tekst, uniek per gebruiker+post). RLS: publiek lezen, schrijven alleen als ingelogde eigenaar; GRANTs per tabel.
- Publieke opslagbucket `post-images` voor uploads, schrijfrechten alleen voor ingelogde gebruikers.
- Routes in TanStack Start: `/` (ontdek), `/search`, `/post/$id`, `/auth`, en onder `_authenticated/`: `/upload`, `/profile`. Lezen via publieke serverfuncties, schrijven via geauthenticeerde serverfuncties.
- Google-login via de Lovable-broker plus e-mail/wachtwoord.
- Manifest en icoon in `public/`, gekoppeld in de root-route; geen service worker.
- Eigen kleur- en lettertokens in `src/styles.css`; startpagina vervangt de placeholder.

## Wat ik nog nodig heb

De app start leeg. Ik vul hem met een paar voorbeeldfoto's zodat het raster meteen gevuld is; die kun je later verwijderen.
