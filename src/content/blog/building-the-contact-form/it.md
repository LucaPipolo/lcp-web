---
title: "Un modulo di contatto senza spam su un sito statico: Astro, Vercel e Turnstile"
slug: "modulo-di-contatto-senza-spam"
description: >-
  Come ho realizzato il modulo di contatto di questo sito con Astro,
  Vercel Functions e Cloudflare Turnstile, mantenendo una CSP rigorosa
  e gestendo la conservazione e la cancellazione dei dati personali.
published: 2026-11-09
tags:
  - astro
  - vercel
  - security
  - privacy
  - developer-tools
---

Fino a qualche giorno fa, per contattarmi attraverso questo sito bisognava utilizzare un link `mailto:`. Era una soluzione semplice, che per un sito personale aveva sempre fatto il suo lavoro, ma che richiedeva di pubblicare il mio indirizzo email direttamente nell'HTML. Questo lo rendeva facilmente accessibile anche ai bot che raccolgono indirizzi da utilizzare per lo spam.

Ho quindi deciso di aggiungere un modulo di contatto, cercando però di mantenere il sito il più semplice possibile. È costruito con [Astro](https://astro.build/), generato interamente in modo statico e pubblicato su [Vercel](https://vercel.com/). Utilizza una [Content Security Policy (CSP)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP) piuttosto rigorosa, senza `unsafe-inline` o `unsafe-eval`, ed è disponibile in tre lingue. Non volevo modificare questa architettura soltanto per ricevere qualche messaggio.

Avevo anche altri due requisiti. Il primo era limitare lo spam senza complicare la compilazione per le persone reali. Il secondo riguardava la privacy: il modulo avrebbe raccolto nomi, indirizzi email e messaggi, quindi dovevo decidere come trattare queste informazioni, quanto conservarle e come cancellarle quando non sarebbero più servite.

Il risultato è il [modulo che trovi nella pagina di contatto](/it/contatti/). Per realizzarlo ho utilizzato Vercel Functions, Cloudflare Turnstile, Brevo e Neon, mantenendo il frontend statico e aggiungendo codice server soltanto dove necessario.

## Aggiungere un modulo senza rinunciare al sito statico

Il primo problema era capire dove eseguire il codice necessario a ricevere i messaggi. Astro dispone di un [adapter ufficiale per Vercel](https://docs.astro.build/en/guides/integrations-guide/vercel/), ma utilizzarlo avrebbe modificato il processo di build del progetto. Questo sito ha già una configurazione specifica, con un middleware che gestisce la lingua prima della cache e alcuni header di sicurezza definiti in `vercel.json`, CSP compresa. Preferivo non intervenire su parti che funzionavano già, soprattutto perché il modulo richiedeva soltanto pochi endpoint.

Ho scelto quindi di mantenere Astro completamente statico e utilizzare direttamente le [Vercel Functions](https://vercel.com/docs/functions). Le funzioni vivono nella cartella `api/` e vengono pubblicate da Vercel separatamente dal resto del sito. Nel mio caso ne ho create tre: `contact.ts` per ricevere i messaggi, `cleanup.ts` per eliminare i dati scaduti e `notify.ts` per inviare eventuali comunicazioni sulle modifiche all'informativa sulla privacy.

La funzione che riceve i messaggi utilizza le API standard del Web: una `Request` in ingresso e una `Response` in uscita. Non è stato necessario aggiungere un framework backend o cambiare il modo in cui Astro genera le pagine.

Anche la validazione è condivisa tra frontend e server. Le regole sulla lunghezza dei campi, sul formato dell'indirizzo email e sul numero massimo di link sono definite in un unico modulo TypeScript, importato da entrambi. In questo modo posso aggiornare una regola senza rischiare che il browser accetti dati che il server considera non validi.

Per il frontend ho utilizzato [Alpine.js](https://alpinejs.dev/), nella sua [build compatibile con la CSP](https://alpinejs.dev/advanced/csp). Questa versione non valuta espressioni JavaScript direttamente negli attributi HTML, quindi utilizzo metodi del componente al posto di espressioni inline. È un piccolo vincolo, ma aiuta a mantenere la logica separata dal markup e permette di rispettare la CSP senza ricorrere a `unsafe-eval`.

Il modulo chiede soltanto nome, email, messaggio e motivo del contatto. Quest'ultimo campo permette di scegliere tra un'opportunità di lavoro, un progetto, una collaborazione o altro. In base alla scelta, il testo d'esempio del messaggio cambia e suggerisce quali informazioni potrebbe essere utile includere. Ho curato anche la validazione dei campi: gli errori vengono mostrati dopo che l'utente ha iniziato a compilarli e, in caso di invio non valido, il focus si sposta sul primo campo da correggere. I messaggi sono collegati ai rispettivi input tramite `aria-describedby`, così da essere accessibili anche agli screen reader.

Il risultato è un modulo piuttosto essenziale, che si integra con il resto del sito senza richiedere rendering lato server. Per chi preferisce parlare invece di scrivere, ho aggiunto anche un collegamento a [Notion Calendar](https://www.notion.com/product/calendar) per prenotare una chiamata.

## Limitare lo spam senza complicare la compilazione

Un modulo pubblico prima o poi riceverà spam. Il mio obiettivo era ridurne il più possibile la quantità, evitando però di introdurre CAPTCHA invasivi o verifiche che rendessero frustrante l'esperienza di chi vuole semplicemente scrivermi.

Ho scelto di combinare diversi controlli, partendo da quelli più semplici e meno costosi. Il modulo contiene un campo nascosto, un _honeypot_, che normalmente una persona non vede e non compila, mentre alcuni bot lo riempiono automaticamente. Registro inoltre il tempo trascorso dall'apertura della pagina: un messaggio inviato in meno di tre secondi viene considerato sospetto. Questi controlli non sono infallibili, ma permettono di scartare una parte delle richieste automatizzate prima di utilizzare servizi esterni.

Il controllo principale è affidato a [Cloudflare Turnstile](https://www.cloudflare.com/application-services/products/turnstile/), configurato in modalità _managed_ con `appearance: "interaction-only"`. Nella maggior parte dei casi la verifica avviene senza alcuna interazione da parte dell'utente. Il widget compare soltanto quando Cloudflare ritiene necessario un controllo aggiuntivo.

Lo script di Turnstile viene caricato esclusivamente nella pagina di contatto. Il browser genera un token che viene inviato insieme al messaggio e verificato dalla funzione server attraverso l'API `siteverify` di Cloudflare. Ogni token può essere utilizzato una sola volta, quindi il widget viene reimpostato dopo ogni tentativo di invio. Ho previsto anche un timeout per gestire i casi in cui lo script venga bloccato da un'estensione del browser: invece di lasciare il modulo in attesa, viene mostrato un messaggio che spiega il problema.

Uno dei requisiti principali era mantenere la CSP esistente. Per integrare Turnstile sono state sufficienti due aggiunte, entrambe limitate al dominio di Cloudflare:

```text
script-src 'self' https://challenges.cloudflare.com
frame-src https://challenges.cloudflare.com
```

La direttiva `form-action` è rimasta impostata su `'none'`, perché il modulo non utilizza l'invio tradizionale del browser: i dati vengono trasmessi alla funzione tramite `fetch`.

A questi controlli si aggiunge una regola di _rate limiting_ nel [Vercel Firewall](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting), che blocca gli indirizzi IP da cui arrivano più di cinque richieste in dieci minuti. Il firewall interviene prima della funzione, quindi le richieste bloccate non raggiungono il codice server.

In pratica, i controlli più economici filtrano le richieste più semplici, Turnstile gestisce quelle più sofisticate e il firewall limita gli invii ripetuti. Per i controlli iniziali, la funzione restituisce anche una risposta apparentemente positiva quando scarta un messaggio sospetto, evitando di fornire ai bot indicazioni su come aggirare la protezione.

Questa configurazione mi permette di proteggere il modulo mantenendo un'esperienza quasi trasparente per chi lo utilizza normalmente.

## Ricevere i messaggi con Brevo

Una volta validato il messaggio, dovevo recapitarlo alla mia casella di posta. Ho scelto [Brevo](https://www.brevo.com/), un servizio europeo che vorrei utilizzare anche per una futura newsletter. Per l'invio utilizzo direttamente la sua API HTTP, senza aggiungere un SDK per una singola richiesta.

Ogni messaggio viene inviato come email in testo semplice. Il mittente è un indirizzo del mio dominio, autenticato con DKIM e protetto da una policy DMARC, mentre il campo `Reply-To` contiene l'indirizzo della persona che mi ha scritto. Questo mi permette di rispondere direttamente dalla casella di posta senza dover copiare manualmente gli indirizzi.

Ho preferito non inviare email automatiche di conferma. Un modulo pubblico che spedisce messaggi a indirizzi inseriti liberamente potrebbe essere utilizzato per inviare email indesiderate a terzi, e non volevo introdurre questo rischio soltanto per confermare la ricezione di un messaggio. La conferma viene mostrata direttamente nella pagina dopo l'invio.

Allo stesso modo, il modulo non aggiunge gli indirizzi ai contatti di Brevo. Chi mi scrive sta chiedendo di essere ricontattato, e il suo indirizzo viene utilizzato soltanto per quella finalità. Un'eventuale iscrizione alla newsletter richiederà un processo separato.

## Conservare i dati e rispettare la privacy

Fin qui il modulo avrebbe già potuto funzionare: ricevere una richiesta, verificarla e inviarmi un'email. Volevo però gestire anche ciò che accade ai dati dopo l'invio, evitando di lasciarli indefinitamente in una casella di posta o in un database.

La prima decisione riguardava la base giuridica del trattamento. Il modulo non richiede il consenso per leggere e rispondere ai messaggi, perché queste attività si basano sul legittimo interesse previsto dall'[articolo 6, paragrafo 1, lettera f), del GDPR](https://eur-lex.europa.eu/legal-content/IT/TXT/HTML/?uri=CELEX:02016R0679-20160504). Quando la richiesta riguarda un possibile incarico professionale, possono applicarsi anche le misure precontrattuali previste dalla lettera b), se ne ricorrono le condizioni.

Per questo non ho inserito la classica casella "Acconsento al trattamento dei dati". Ho preferito mostrare accanto al modulo un'informativa sintetica, con un collegamento a quella completa, e una casella non preselezionata con cui l'utente conferma di aver letto le informazioni.

Per documentare ciò che è stato comunicato, insieme a ogni messaggio salvo anche una registrazione contenente il testo esatto dell'informativa mostrata, la sua versione, la data e l'ora dell'invio, la pagina di provenienza e alcune informazioni tecniche. Mi sono ispirato anche a un [articolo di AyudaWP](https://ayudawp.com/registro-consentimiento-cookies-formularios-pedidos/) sulla documentazione delle informative e dei consensi.

Un dettaglio importante è che il testo da conservare viene recuperato direttamente dal server, leggendo i file YAML utilizzati per generare le pagine. Non viene inviato dal browser, perché un client modificato potrebbe trasmettere un testo diverso da quello effettivamente pubblicato. La registrazione include inoltre un hash SHA-256 del proprio contenuto, per rilevare eventuali modifiche successive.

Per l'indirizzo IP ho scelto di conservare soltanto un hash HMAC-SHA-256, calcolato con una chiave segreta custodita separatamente. In questo modo posso confrontare le registrazioni associate allo stesso indirizzo senza salvarlo in chiaro. L'hash rimane comunque un dato personale pseudonimizzato, quindi viene trattato e conservato come tale.

### Due database e due periodi di conservazione

Ho utilizzato [Neon](https://neon.tech/) per conservare i dati, creando due database separati, entrambi ospitati a Francoforte, in Germania. Il primo contiene i messaggi, mentre il secondo conserva le registrazioni delle informazioni sulla privacy mostrate agli utenti. Ogni database ha credenziali proprie e un identificativo comune permette di collegare un messaggio alla sua registrazione.

La separazione risponde soprattutto a un'esigenza di gestione: i messaggi e le prove hanno finalità e periodi di conservazione diversi. Ho stabilito di conservare i messaggi per **12 mesi**, un periodo che considero sufficiente per gestire una conversazione ed eventuali contatti successivi. Le registrazioni dell'informativa vengono invece conservate per **3 anni**, per poter documentare il rispetto degli obblighi di trasparenza anche dopo la cancellazione del messaggio. È un periodo scelto tenendo conto anche della normativa spagnola sulla protezione dei dati, non una durata imposta dal GDPR per ogni trattamento.

Il problema successivo era assicurarmi che questi dati venissero realmente eliminati alla scadenza. Ho quindi creato `api/cleanup.ts`, una Vercel Function richiamata ogni notte alle 03:00 UTC tramite un [Cron Job](https://vercel.com/docs/cron-jobs):

```json
"crons": [{ "path": "/api/cleanup/", "schedule": "0 3 * * *" }]
```

La funzione esegue due query `DELETE`, applicando a ciascun database il rispettivo periodo di conservazione. L'endpoint è protetto tramite `CRON_SECRET`, che Vercel invia nell'header `Authorization` delle richieste programmate. Qualsiasi richiesta priva del segreto corretto viene rifiutata.

Avrei potuto eseguire la pulizia ogni volta che qualcuno invia un nuovo messaggio, ma questo avrebbe lasciato i dati scaduti nel database durante eventuali periodi di inattività. Con un'esecuzione programmata, invece, la cancellazione avviene indipendentemente dall'utilizzo del modulo.

### Evitare di perdere i messaggi

C'era infine un'altra situazione da gestire: cosa succede se Brevo non riesce a inviare l'email oppure Neon non è temporaneamente disponibile?

La funzione esegue il salvataggio e l'invio contemporaneamente, utilizzando `Promise.allSettled`:

```ts
const [kept, delivered] = await Promise.allSettled([
  keep(submission, request),
  deliver(submission),
])

if (kept.status === "rejected" && delivered.status === "rejected") {
  return json({ error: "generic" }, 502)
}
```

Considero l'operazione riuscita se almeno uno dei due processi va a buon fine. Se il messaggio viene salvato nel database, posso recuperarlo anche quando l'invio email fallisce; se invece arriva l'email ma il database non risponde, il contenuto non è andato perso. Gli eventuali errori vengono comunque registrati nei log di Vercel.

Questa scelta evita anche di mostrare un errore a chi scrive quando il messaggio è già arrivato attraverso uno dei due canali, riducendo il rischio di invii duplicati.

## Avvisare gli utenti quando cambia la privacy policy

Mentre aggiornavo l'informativa sulla privacy per descrivere il nuovo modulo, mi sono posto un'ultima domanda: cosa succederà quando dovrò modificarla di nuovo?

Le persone che mi scrivono ricevono informazioni precise sul trattamento dei loro dati, e io conservo una registrazione della versione che hanno letto. Se in futuro cambiassi il titolare del trattamento, introducessi una nuova finalità o modificassi in modo significativo la gestione dei dati già raccolti, potrebbe essere necessario informarle prima che il cambiamento abbia effetto.

Le [linee guida europee sulla trasparenza](https://ec.europa.eu/newsroom/article29/items/622227) distinguono infatti tra modifiche formali e modifiche sostanziali. Correggere un refuso non richiede necessariamente una comunicazione individuale, mentre un cambiamento rilevante per i diritti o le aspettative degli interessati può richiederla.

Ho quindi aggiunto un piccolo sistema per inviare queste comunicazioni quando necessario, evitando di mandare automaticamente un'email a ogni aggiornamento dell'informativa.

Ogni avviso viene preparato in un file YAML che contiene oggetto e testo nelle tre lingue del sito. Uno script permette di controllare il numero di destinatari, effettuare un invio di prova e, infine, inviare la comunicazione:

```sh
bun run notify notices/2027-01-nuovo-hosting.yaml
bun run notify notices/2027-01-nuovo-hosting.yaml --test
bun run notify notices/2027-01-nuovo-hosting.yaml --send
```

Il saluto, il motivo per cui si riceve la comunicazione, il collegamento all'informativa aggiornata e le indicazioni per esercitare i propri diritti vengono aggiunti automaticamente. Ogni persona riceve un messaggio individuale nella lingua utilizzata quando ha compilato il modulo, senza che il suo indirizzo venga mostrato ad altri destinatari.

Lo script viene eseguito dal mio computer, ma l'invio avviene attraverso `api/notify.ts` su Vercel. In questo modo le credenziali di Brevo e dei database rimangono nelle variabili d'ambiente del server. L'endpoint è protetto da un segreto dedicato e utilizza una chiave di idempotenza per limitare il rischio di invii duplicati quando una richiesta deve essere ripetuta dopo un errore.

Il sistema registra anche l'esecuzione delle comunicazioni, indicando quando è stato effettuato l'invio, quale versione dell'informativa riguardava e quante email sono state inviate, senza memorizzare gli indirizzi dei destinatari nel registro.

Non è una funzionalità che prevedo di utilizzare spesso, ma preferisco averla pronta piuttosto che dover ricostruire manualmente l'elenco dei destinatari quando si presenterà la necessità.

## Il risultato

Il modulo di contatto è ora integrato nel sito senza aver modificato la sua architettura statica. Astro continua a generare le pagine, mentre le Vercel Functions gestiscono le poche operazioni che richiedono un server: ricevere i messaggi, conservarli, cancellarli alla scadenza e inviare eventuali comunicazioni sulla privacy.

Per la protezione dallo spam utilizzo controlli progressivi, Cloudflare Turnstile e il firewall di Vercel. La CSP rimane rigorosa, con le sole eccezioni necessarie per il widget di verifica. I messaggi arrivano tramite Brevo e vengono conservati su Neon, separatamente dalle registrazioni delle informazioni sulla privacy mostrate agli utenti.

La parte che mi interessava di più era riuscire a gestire l'intero ciclo di vita dei dati, dalla raccolta alla cancellazione, senza dover intervenire manualmente. Il modulo non si limita quindi a inviarmi un'email: conserva le informazioni necessarie, rispetta periodi di conservazione definiti e dispone già di un sistema per comunicare eventuali modifiche rilevanti.

Resta ancora un piccolo miglioramento da fare: rimuovere l'indirizzo email pubblicato direttamente nell'HTML della home, componendolo nel browser per renderne meno immediata la raccolta automatizzata.

Più avanti vorrei aggiungere anche una newsletter. Potrò riutilizzare parte dell'infrastruttura, soprattutto Brevo, Turnstile e il sistema di registrazione, ma con una differenza importante: l'iscrizione richiederà un consenso specifico e una doppia conferma. Gli indirizzi raccolti attraverso il modulo di contatto rimarranno separati.

Nel frattempo, il nuovo modulo è disponibile nella [pagina di contatto](/it/contatti/).
