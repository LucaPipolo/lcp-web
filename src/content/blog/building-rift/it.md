---
title: "Rift: come gestisco più agenti AI in parallelo con Docker e Git worktree"
description: >-
  Ogni agente AI con il proprio ambiente Docker, le proprie porte e un dominio
  HTTPS locale. Come ho sviluppato Rift con Laravel Zero e come lo utilizzo
  insieme a Orca per lavorare su più funzionalità in parallelo.
published: 2026-11-06
tags:
  - ai-agents
  - docker
  - git
  - laravel
  - developer-tools
---

I [Git worktree](https://git-scm.com/docs/git-worktree) permettono di lavorare su più branch dello stesso repository senza dover passare continuamente da uno all'altro. Ogni worktree ha la propria directory e il proprio checkout, ma tutti condividono lo stesso repository Git. Una soluzione particolarmente comoda quando si lavora con più agenti AI contemporaneamente, perché ciascuno può occuparsi di una funzionalità diversa senza interferire con il lavoro degli altri.

Le cose si complicano quando bisogna avviare le applicazioni. Tre worktree significano tre server di sviluppo che cercano di utilizzare la stessa porta `4321`, magari insieme a tre database PostgreSQL sulla `5432`. Il primo parte senza problemi, gli altri trovano le porte già occupate.

Si può risolvere tutto manualmente, cambiando le porte e adattando la configurazione di ogni ambiente, ma è poco pratico quando gli agenti lavorano su più attività in parallelo. Ognuno dovrebbe poter avviare la propria applicazione per verificare le modifiche, mentre io vorrei poter aprire ciascuna versione nel browser senza perdere tempo a riconfigurare Docker.

È proprio per questo che ho sviluppato [Rift](https://github.com/LucaPipolo/rift), un CLI open source che gestisce ambienti Docker indipendenti per ogni Git worktree, assegnando automaticamente porte e domini HTTPS locali.

## Un ambiente per ogni agente

Rift permette di eseguire più copie dello stesso progetto contemporaneamente, ognuna con i propri container, le proprie porte e un indirizzo HTTPS dedicato. Per esempio, un progetto con tre worktree potrebbe avere questa configurazione:

| Worktree          | Indirizzo                     |
| ----------------- | ----------------------------- |
| `myapp/`          | `https://myapp.test`          |
| `myapp-search/`   | `https://search.myapp.test`   |
| `myapp-checkout/` | `https://checkout.myapp.test` |

Posso lasciare tutte e tre le applicazioni in esecuzione, passare da una all'altra nel browser e fermare un ambiente senza interrompere gli altri. Questo torna particolarmente utile quando più agenti stanno lavorando su funzionalità diverse e voglio verificare i risultati man mano che completano le attività.

Rift si appoggia alla configurazione [Docker Compose](https://docs.docker.com/compose/) o [Laravel Sail](https://laravel.com/docs/sail) già presente nel progetto e utilizza [Caddy](https://caddyserver.com/) come reverse proxy condiviso per gestire HTTPS e instradare le richieste verso i container corretti. Il CLI si installa una sola volta, mentre ogni progetto definisce le proprie impostazioni attraverso un file YAML.

## Come è nato Rift

La prima versione risale ad agosto, quando ho configurato l'ambiente di sviluppo Docker di questo sito. Avevo bisogno di lavorare su più branch contemporaneamente e avevo risolto il problema scrivendo quattro file Bash: `setup.sh`, `up.sh`, `down.sh` e una libreria di funzioni condivise. In tutto, quasi seicento righe di codice.

Il funzionamento era già molto simile a quello attuale. Ogni checkout utilizzava il nome della propria directory come nome del progetto Docker Compose, in modo che Docker creasse container, reti e volumi separati. Tutti gli ambienti erano collegati a un unico router Caddy, che gestiva i certificati HTTPS e instradava le richieste in base al dominio. All'avvio di un worktree, gli script registravano la relativa rotta attraverso l'API di amministrazione di Caddy, per poi rimuoverla quando l'ambiente veniva fermato. Un resolver DNS locale faceva puntare tutti i domini `*.test` a `127.0.0.1`, evitando di dover aggiornare `/etc/hosts` ogni volta.

Gli script funzionavano bene e mi avevano permesso di risolvere il problema per questo sito. Erano però legati alla sua configurazione, quindi difficili da riutilizzare in altri progetti senza doverli modificare.

A quel punto ho deciso di trasformare quella soluzione in uno strumento indipendente, che potessi installare una sola volta e configurare per ogni progetto attraverso un file YAML.

Con la versione 1.0 di Rift, i quasi seicento righi di Bash utilizzati da questo sito sono stati sostituiti da un file `rift.yaml`:

```yaml
name: lcp-web
domain: lcp-web.test

preset: compose

app:
  service: app
  port: 4321

ports:
  - { key: APP_PORT, default: 4321 }
```

Tutta la logica per preparare gli ambienti, gestire i container, assegnare le porte e configurare il router è ora all'interno di Rift, mentre il file YAML contiene soltanto le informazioni specifiche del progetto.

## Come funziona

Rift parte dalla configurazione Docker già esistente, senza richiedere di riscrivere i servizi o adottare una struttura particolare. Il comando `rift init` analizza i file Compose e le variabili d'ambiente, propone una configurazione iniziale e genera il file `rift.yaml`.

Il setup iniziale richiede anche una piccola modifica a Docker Compose per collegare il servizio applicativo alla rete del router condiviso e rendere disponibile la directory Git comune all'interno del container. Una volta aggiunta questa configurazione al repository, i nuovi worktree la erediteranno automaticamente.

A quel punto, per creare un ambiente su un nuovo branch, bastano tre comandi:

```bash
git worktree add -b search ../myapp-search
cd ../myapp-search
rift setup
```

`rift setup` prepara il file `.env`, assegna le porte disponibili, avvia i container e registra l'applicazione nel router. Il nuovo worktree sarà raggiungibile su `https://search.myapp.test`, mentre la copia principale continuerà a funzionare su `https://myapp.test`.

Per la gestione quotidiana ci sono pochi comandi:

```bash
rift up        # Avvia il worktree corrente
rift down      # Lo ferma senza interrompere gli altri
rift status    # Mostra le applicazioni registrate nel router
rift doctor    # Diagnostica eventuali problemi
```

Una delle decisioni che ho preso durante lo sviluppo è stata quella di non modificare i file Docker Compose a runtime. Rift gestisce le porte attraverso variabili d'ambiente, aggiornando i valori nel `.env` e preservando tutte le altre chiavi, i commenti e l'ordine originale. Naturalmente, le porte che si vogliono gestire devono essere parametrizzate anche nel file Compose, ma per il resto il progetto continua a funzionare come prima. Se voglio avviare i servizi manualmente con `docker compose up`, posso continuare a farlo.

## Come utilizzo Rift con Orca

Il caso d'uso che mi interessa di più è lo sviluppo parallelo con agenti AI. Attualmente utilizzo [Orca](https://onorca.dev/), un Agent Development Environment (ADE) che permette di gestire più attività contemporaneamente, ciascuna nel proprio Git worktree.

Con Orca posso affidare una funzionalità a un agente, lasciare che un altro si occupi di correggere un bug e lavorare personalmente su un terzo branch. Ogni attività ha la propria directory, quindi gli agenti possono modificare i file senza interferire tra loro. Per i progetti che utilizzano Docker, però, rimane il problema di avviare tutti gli ambienti contemporaneamente, ed è qui che entra in gioco Rift.

Orca permette di configurare degli script da eseguire automaticamente quando viene creato o archiviato un worktree. L'integrazione con Rift richiede soltanto due comandi.

Nello script di setup:

```bash
cd "$ORCA_WORKTREE_PATH" && rift setup
```

E nello script di archiviazione:

```bash
cd "$ORCA_WORKTREE_PATH" && rift down
```

Quando creo una nuova attività in Orca, il primo script prepara l'ambiente Docker del relativo worktree, assegna le porte e avvia l'applicazione. Quando archivio l'attività, il secondo ferma i container e rimuove la rotta dal router, lasciando tutto il resto in esecuzione.

In pratica, posso creare un'attività, assegnarla a un agente e lasciare che lavori sul proprio branch. Quando voglio verificare le modifiche, l'applicazione è già disponibile su un indirizzo HTTPS locale. Se ho più agenti al lavoro, posso aprire le diverse versioni nel browser e confrontare i risultati senza cambiare branch o riavviare continuamente i servizi.

Lo trovo particolarmente utile per le modifiche all'interfaccia, le nuove funzionalità e, in generale, tutte quelle attività in cui leggere il diff non basta per valutare il risultato. Posso vedere direttamente come si comporta l'applicazione, mentre gli altri agenti continuano a lavorare sui rispettivi task.

## Perché ho scelto Laravel Zero

Quando ho deciso di trasformare gli script Bash in un CLI, la scelta di [Laravel Zero](https://laravel-zero.com/) è stata piuttosto naturale. Lavoro con Laravel da anni, mi piace il modo in cui è strutturato e apprezzo molto la sua developer experience, quindi volevo mantenere lo stesso approccio anche per questo progetto.

Laravel Zero è un framework pensato per sviluppare applicazioni CLI utilizzando molti dei componenti e delle convenzioni di Laravel. Offre una struttura familiare per organizzare i comandi, gestire le dipendenze e costruire interfacce da terminale con input interattivi, progress indicator e output formattati.

Per Rift volevo anche una CLI piacevole da utilizzare, con comandi chiari, messaggi leggibili e feedback utili durante le operazioni. Quando uno strumento avvia diversi container, configura un router o modifica le variabili d'ambiente, è importante capire cosa sta facendo e dove si è verificato un eventuale errore. Laravel Zero mi ha permesso di concentrarmi su questi aspetti utilizzando strumenti con cui avevo già molta familiarità.

Un altro vantaggio è la testabilità. Rift esegue continuamente comandi esterni, soprattutto `docker` e `git`, e comunica con l'API HTTP di Caddy. Laravel mette a disposizione le API `Process`, `Http` e `Sleep`, insieme ai rispettivi _fake_, che permettono di simulare queste operazioni durante i test senza dover realmente eseguire i processi o modificare l'ambiente della macchina.

La suite è scritta con [Pest](https://pestphp.com/) e raggiunge il 100% di code coverage e type coverage, con [Larastan](https://github.com/larastan/larastan) configurato al livello massimo. Anche l'ambiente di sviluppo di Rift è completamente containerizzato, quindi per lavorare sul progetto bastano Docker e [GNU Make](https://www.gnu.org/software/make/), senza dover installare PHP localmente.

### Un eseguibile che include PHP

Rift è scritto in [PHP](https://www.php.net/), ma non volevo obbligare chi lo utilizza a installare PHP e gestirne le dipendenze. Per questo ho scelto di distribuirlo come eseguibile autonomo, che include anche il runtime.

La build crea un archivio PHAR dell'applicazione e lo concatena a un runtime PHP statico, chiamato _micro_, fornito da [static-php-cli](https://static-php.dev/):

```bash
cat "$micro" "$root/builds/rift.phar" > "$root/builds/rift-$target"
```

Il risultato è un singolo eseguibile per macOS e Linux, disponibile sia per ARM64 sia per x86-64. Durante la build, i runtime scaricati vengono verificati attraverso checksum definiti nel repository, così da utilizzare sempre i file previsti.

Per semplificare ulteriormente l'installazione, il repository funziona anche come tap di [Homebrew](https://brew.sh/):

```bash
brew tap lucapipolo/rift https://github.com/LucaPipolo/rift
brew trust lucapipolo/rift
brew install rift
```

In questo modo posso continuare a sviluppare Rift con Laravel, mentre chi lo utilizza deve soltanto installare un eseguibile, senza preoccuparsi di PHP o Composer.

## Un router condiviso tra tutti i progetti

Una delle parti più delicate da implementare è stata la gestione del router. Rift utilizza un unico container Caddy per servire tutti i progetti e i relativi worktree, quindi ogni ambiente deve poter registrare e rimuovere le proprie rotte senza modificare quelle degli altri.

L'API di amministrazione di Caddy mette a disposizione l'endpoint `POST /load`, che permette di caricare una configurazione completa, ma sostituisce quella già presente. Utilizzarlo mentre altri progetti sono in esecuzione significherebbe rischiare di perdere le loro rotte.

Rift utilizza quindi questo endpoint soltanto durante l'inizializzazione di un router vuoto. Da quel momento, ogni worktree aggiunge e rimuove esclusivamente le proprie rotte attraverso operazioni mirate sull'API. Quando eseguo `rift down`, vengono eliminate soltanto le configurazioni associate all'ambiente corrente e gli altri progetti continuano a funzionare normalmente.

Anche HTTPS viene gestito centralmente attraverso la Certification Authority locale di Caddy, che deve essere considerata attendibile dalla macchina una sola volta. Rift può così generare i certificati necessari per tutti i domini dei progetti, compresi quelli aggiuntivi utilizzati dalle API o dai pannelli di amministrazione.

C'è un dettaglio da considerare con i certificati wildcard: un certificato per `*.myapp.test` copre `search.myapp.test`, ma non `api.search.myapp.test`, perché il wildcard vale soltanto per un livello di sottodomini. Rift tiene conto anche di questo quando registra gli hostname di un worktree, richiedendo i certificati necessari per quelli che non sono coperti dal wildcard principale.

## Gestire le porte senza conflitti

Un altro aspetto che ha richiesto un po' di attenzione è l'assegnazione delle porte. Quando viene creato un worktree, Rift eredita il `.env` della copia principale, se disponibile, e quindi anche le porte configurate per i vari servizi. Il problema è che quelle porte potrebbero essere già utilizzate da altri ambienti.

Rift controlla le porte definite in `rift.yaml` e mantiene i valori esistenti quando sono disponibili, mentre in caso di conflitto cerca una porta libera. Il controllo, però, deve considerare anche i worktree che in quel momento non sono in esecuzione.

Immaginiamo di avere due worktree fermi, entrambi configurati per pubblicare PostgreSQL sulla porta `5432`. Se Rift controllasse soltanto le porte attualmente in ascolto, potrebbe considerare la `5432` disponibile per entrambi. Il conflitto emergerebbe soltanto al momento di avviarli insieme.

Per evitare questa situazione, Rift considera occupate anche le porte già assegnate agli altri worktree dello stesso progetto, indipendentemente dal loro stato. Allo stesso tempo, riconosce quelle utilizzate dai container del worktree corrente, così da poter riavviare un ambiente senza assegnargli inutilmente nuove porte.

È uno di quei dettagli che passano inosservati quando tutto funziona, ma che diventano importanti quando si iniziano ad avviare e fermare continuamente diversi ambienti durante la giornata.

## Provalo!

[Rift](https://github.com/LucaPipolo/rift) è open source e distribuito con licenza [MIT](https://opensource.org/license/mit). Funziona su macOS e Linux e richiede [Git](https://git-scm.com/), [Docker](https://www.docker.com/) e un progetto configurato con Docker Compose o Laravel Sail. È compatibile con [Docker Desktop](https://www.docker.com/products/docker-desktop/), [OrbStack](https://orbstack.dev/) e [Colima](https://github.com/abiosoft/colima).

Per utilizzare i domini locali `*.test` bisogna configurare un resolver DNS che li indirizzi a `127.0.0.1`, per esempio attraverso [dnsmasq](https://thekelleys.org.uk/dnsmasq/doc.html). Servono inoltre le porte 80, 443 e 2019 disponibili per il router condiviso.

Il codice, la documentazione e le release sono disponibili su [github.com/LucaPipolo/rift](https://github.com/LucaPipolo/rift). Se lo provi su un tuo progetto e incontri qualche problema, puoi iniziare con `rift doctor` per verificare la configurazione e, se necessario, [aprire una issue su GitHub](https://github.com/LucaPipolo/rift/issues).
