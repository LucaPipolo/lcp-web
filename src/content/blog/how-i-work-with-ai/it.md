---
title: "Come lavoro con gli agenti AI: modelli, sandbox e privacy"
slug: "come-lavoro-con-gli-agenti-ai"
metaTitle: "Come lavoro con gli agenti AI: modelli, sandbox e privacy"
metaDescription: >-
  Come organizzo il lavoro con più agenti AI: regole condivise,
  harness, modelli, Docker Sandboxes, sviluppo parallelo e privacy.
description: >-
  Come utilizzo Claude Code, OpenCode e modelli locali per lavorare
  con più agenti AI, mantenendo regole condivise, ambienti isolati
  e un maggiore controllo sui dati personali.
published: 2026-11-12
tags:
  - ai-agents
  - docker
  - privacy
  - developer-tools
related:
  - building-rift
---

Uso agenti AI praticamente ogni giorno, sia nei progetti personali sia nel lavoro per i clienti. Spesso ne utilizzo più
di uno contemporaneamente, affidando a ciascuno un compito diverso. Negli ultimi mesi ho sperimentato diversi harness,
modelli e configurazioni, fino ad arrivare a un ambiente di sviluppo che oggi utilizzo con una certa continuità.

All'inizio lavoravo soprattutto con un agente alla volta. Gli assegnavo un compito, verificavo le modifiche e passavo a
quello successivo. Con il tempo, però, ho iniziato a distribuire il lavoro tra più agenti e a utilizzare modelli diversi
a seconda della difficoltà. Questo mi ha costretto ad affrontare alcune questioni pratiche: come condividere le regole
di un progetto, evitare che gli agenti modifichino gli stessi file, controllare ciò che possono eseguire e proteggere le
informazioni che non devono lasciare il mio computer.

Il mio ruolo è rimasto lo stesso: definisco gli obiettivi, valuto le soluzioni e verifico il risultato. Gli agenti
possono analizzare il codice, proporre approcci, implementarli ed eseguire test, ma leggo le modifiche prima di
integrarle e mi assumo la responsabilità di ciò che finisce in produzione.

In questo articolo racconto come ho organizzato il mio ambiente, quali strumenti utilizzo e perché ho fatto determinate
scelte. Lo stesso approccio si estende anche ai contenuti: nella pagina [Contenuti e assistenza IA](/it/contenuti-ia/)
spiego come utilizzo questi strumenti per scrivere e revisionare gli articoli di questo sito, compreso quello che stai
leggendo.

## Dare agli agenti le stesse regole

Uno dei primi problemi che ho incontrato è stato dover ripetere continuamente le stesse istruzioni. Ogni nuova sessione
richiedeva di spiegare come era organizzato il progetto, quali convenzioni seguire, dove eseguire i comandi e come
preparare i commit. Inoltre, le indicazioni fornite durante una conversazione non erano necessariamente disponibili
quando riprendevo il lavoro con un altro agente.

Ho iniziato quindi a scrivere queste informazioni direttamente nel repository. Utilizzo `AGENTS.md` come riferimento
principale per le regole del progetto, mentre per [Claude Code](https://claude.com/product/claude-code), che cerca
`CLAUDE.md`, creo un file che contiene soltanto:

```markdown
@AGENTS.md
```

Claude Code importa il contenuto del file indicato e posso così mantenere un'unica versione delle regole, condivisa tra
i diversi harness. Le preferenze che valgono per tutti i progetti si trovano invece in `~/.claude/CLAUDE.md`, che
anche [OpenCode](https://opencode.ai/) può utilizzare quando non trova una propria configurazione globale.

Nei progetti più grandi, però, un unico documento rischia di diventare troppo lungo. Preferisco allora separare le
istruzioni per argomento, ad esempio architettura, ambiente di sviluppo, convenzioni Git e documentazione, caricando
quelle specifiche soltanto quando sono pertinenti al lavoro. Un agente che sta modificando un articolo non ha bisogno di
leggere tutte le convenzioni TypeScript, così come uno che lavora sul backend non deve necessariamente conoscere le
regole editoriali del sito.

Cerco soprattutto di mantenere le istruzioni concrete. Nel repository di questo sito, per esempio, è specificato che i
comandi di sviluppo vanno eseguiti nei container Docker, quale URL locale utilizzare per verificare le modifiche e
perché codice e contenuti devono finire in commit separati. Molte di queste regole sono nate da errori reali: quando mi
trovo a correggere più volte lo stesso comportamento, preferisco documentarlo anziché continuare a ripetere la
correzione.

### Skill e server MCP

Le istruzioni descrivono come lavorare nel progetto, mentre le operazioni ricorrenti sono raccolte in skill. Ne utilizzo
alcune per creare commit secondo le convenzioni del repository, aprire pull request, gestire i commenti delle review e
aggiornare le dipendenze una alla volta.

Le skill personali si trovano in `~/.claude/skills/` e sono collegate anche alla configurazione di OpenCode. Posso così
mantenere una sola implementazione e utilizzarla con entrambi gli harness. Alcune operazioni, come l'aggiornamento delle
dipendenze, preferisco però avviarle personalmente: in questi casi utilizzo `disable-model-invocation: true` nel
frontmatter della skill, in modo che l'agente non possa richiamarla autonomamente.

I server [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) completano questa configurazione, permettendo
agli agenti di consultare documentazione e servizi esterni. Per la documentazione
utilizzo [Context7](https://context7.com/) o i server ufficiali dei framework, quando disponibili, così da non dipendere
esclusivamente dalle conoscenze del modello, che potrebbero essere superate. Altri server permettono di consultare
deployment, log ed errori delle applicazioni in produzione.

Versiono le configurazioni MCP nel repository perché ogni worktree deve poter utilizzare le stesse integrazioni. È una
delle poche parti che devo ancora mantenere separatamente per ogni harness, dato che gli strumenti adottano formati di
configurazione differenti.

## Due harness e diversi modelli

Le regole condivise mi permettono di utilizzare harness diversi senza dover ridefinire ogni volta il modo di lavorare.
Attualmente utilizzo soprattutto Claude Code, sviluppato da [Anthropic](https://www.anthropic.com/), e OpenCode,
scegliendo di volta in volta quello più adatto al compito.

Claude Code è il mio riferimento per i lavori più impegnativi, come refactoring estesi, decisioni architetturali o bug
difficili da individuare. Di solito utilizzo Sonnet come modello principale e Opus come _advisor_, per ottenere un
secondo parere prima di scegliere un approccio o considerare concluso un lavoro. In questo modo posso sfruttare un
modello più capace nei momenti in cui il suo contributo è utile, senza utilizzarlo necessariamente per ogni operazione.

OpenCode è invece l'harness che utilizzo più spesso durante la giornata. La ragione principale è la flessibilità: posso
scegliere tra modelli di Anthropic, [OpenAI](https://openai.com/), [DeepSeek](https://www.deepseek.com/)
e [Moonshot AI](https://www.moonshot.ai/), che sviluppa Kimi, oltre a quelli eseguiti localmente.

Per rendere più semplice la scelta, ho configurato sei agenti con responsabilità e livelli di capacità differenti:

| Agente      | Ruolo                                     | Modello attuale     |
| ----------- | ----------------------------------------- | ------------------- |
| `build`     | Modifiche quotidiane                      | DeepSeek V4.1 Flash |
| `build-pro` | Modifiche più complesse                   | Kimi K3.1 Pro       |
| `build-max` | Lavori particolarmente impegnativi        | Claude Sonnet 5.5   |
| `plan`      | Analisi e pianificazione, in sola lettura | GPT-6.1 Sol         |
| `plan-max`  | Secondo parere sulla pianificazione       | Claude Opus 5.5     |
| `local`     | Attività locali e dati riservati          | Qwen 3.5 9B         |

I nomi descrivono il ruolo dell'agente e il livello di capacità, senza dipendere dal modello utilizzato. `build` può
modificare il codice, mentre `plan` analizza il problema e prepara un piano senza intervenire sui file. I suffissi
`-pro` e `-max` identificano livelli successivi, da utilizzare quando un compito richiede modelli più capaci.

Questa separazione mi permette di cambiare modello senza modificare il mio flusso di lavoro. Se tra qualche mese troverò
un'alternativa migliore per `build-pro`, potrò aggiornare la configurazione mantenendo lo stesso agente.

Ogni agente è definito in un file Markdown, con il modello dichiarato nel frontmatter e le istruzioni nel corpo. Per
esempio:

```markdown
---
description: Stronger build agent for harder multi-file changes.
mode: primary
model: opencode-go/kimi-k3.1-pro
---

You are the escalation build agent. You are used when the default build agent
struggled or when a change spans several files.
```

### Come scelgo il modello

Avevo valutato la possibilità di introdurre un router automatico, capace di analizzare ogni richiesta e selezionare il
modello più adatto. Alla fine ho preferito mantenere la scelta manuale, soprattutto perché utilizzo una combinazione di
abbonamenti e chiavi API. I router che ho valutato lavorano principalmente attraverso API, mentre alcuni modelli sono
accessibili tramite autenticazione legata all'abbonamento. Avrei quindi potuto automatizzare la scelta soltanto su una
parte dei modelli disponibili.

Ho adottato invece un criterio abbastanza semplice: parto dal modello meno costoso che ritengo adatto al compito e passo
a quello successivo se necessario. Per le modifiche quotidiane utilizzo `build`; se il problema richiede più capacità
passo a `build-pro`, poi a `build-max`, fino a Claude Code per i lavori più difficili.

Cerco anche di distinguere la pianificazione dall'esecuzione. Una buona analisi iniziale può richiedere un modello più
capace, ma una volta definito cosa fare, molte modifiche possono essere affidate a un modello più economico. Questa
distinzione è particolarmente utile nello sviluppo, dove l'esecuzione può comportare decine di chiamate a strumenti,
letture di file, modifiche e test.

Naturalmente non sempre la scelta iniziale è quella giusta. A volte un modello economico impiega troppo tempo a
risolvere un problema che uno più capace affronta rapidamente. Per questo considero anche il tempo perso nei tentativi e
nelle correzioni, oltre al costo delle singole richieste.

### Un modello locale per le attività più semplici

Accanto ai modelli cloud utilizzo anche un modello locale. Mi interessa soprattutto per lavorare su documenti riservati
e per attività che non richiedono particolari capacità di ragionamento.

Il mio computer è un MacBook Pro con M3 Pro e 18 GB di memoria unificata. Considerando quella utilizzata dal sistema e
dagli altri programmi, posso dedicare realisticamente circa 10-12 GB a un modello. Ho quindi
scelto [Qwen](https://qwen.ai/) 3.5 9B, eseguito tramite [Ollama](https://ollama.com/).

Le prime prove non sono andate particolarmente bene. Anche con richieste semplici, il modello impiegava molto tempo a
rispondere e spesso produceva lunghi ragionamenti senza arrivare a una conclusione utile. Ho scoperto che il problema
dipendeva soprattutto dalla modalità _thinking_ e dalla dimensione della finestra di contesto.

Ho creato quindi una variante del modello con una finestra di contesto da 32K token:

```bash
printf 'FROM qwen3.5:9b\nPARAMETER num_ctx 32768\n' > Modelfile
ollama create qwen3.5-32k -f Modelfile
```

Nella configurazione di OpenCode ho disattivato anche il ragionamento esplicito, utilizzando `reasoning_effort: "none"`.
Nel mio caso, queste modifiche hanno migliorato sensibilmente l'esperienza, soprattutto nei compiti più brevi.

Con il tempo ho imparato anche a scegliere meglio cosa affidargli. Un modello di queste dimensioni non è particolarmente
affidabile quando deve rispondere a domande che richiedono conoscenze aggiornate o un ragionamento complesso. Durante i
test, per esempio, tendeva a inventare informazioni su date e fatti che non conosceva. Si comporta invece molto meglio
quando gli fornisco tutto il materiale necessario e gli chiedo di lavorarci sopra.

Lo utilizzo quindi per riscrivere, tradurre e riassumere testi, oltre che per piccole modifiche al codice con un ambito
ben definito. Per i documenti riservati ha un vantaggio importante: il contenuto rimane sul mio computer, senza essere
inviato a un servizio esterno.

Vorrei provare anche [llama.cpp](https://github.com/ggml-org/llama.cpp) al posto di Ollama, per capire se riesco a
migliorare ulteriormente le prestazioni e l'affidabilità delle chiamate agli strumenti.

## Isolare gli agenti dal computer

Una volta scelto l'harness e il modello, rimane da decidere dove farlo lavorare. È un aspetto a cui presto molta
attenzione, perché un agente che può eseguire comandi nel terminale potrebbe leggere file di configurazione,
credenziali, chiavi SSH o documenti che non hanno nulla a che vedere con il progetto su cui sta lavorando.

Gli harness prevedono meccanismi di autorizzazione, ma quando utilizzo più agenti contemporaneamente non voglio dover
approvare manualmente ogni comando. Ho preferito quindi isolare gli ambienti di esecuzione
attraverso [Docker Sandboxes](https://docs.docker.com/ai/sandboxes/).

Ogni sandbox è una macchina virtuale isolata, con un proprio ambiente Docker e accesso limitato alla directory del
progetto. L'agente può eseguire comandi e lavorare sui file condivisi, ma non ha automaticamente accesso al resto del
computer.

Dopo aver configurato la prima sandbox, ho fatto una prova piuttosto diretta: ho chiesto a Claude Code di elencare il
contenuto della mia home e leggere `~/.ssh`. Non riusciva ad accedere ai file del Mac, che era esattamente il
comportamento che volevo ottenere.

Per avviare rapidamente gli ambienti ho creato due funzioni nella configurazione della shell, `claude-box` e
`opencode-box`. Quando mi trovo nella directory di un progetto, il comando crea la sandbox se non esiste oppure riapre
quella già disponibile.

Per esempio, la funzione che utilizzo con OpenCode è questa:

```bash
opencode-box() {
  local name="$(_sbx_project_name)-opencode"
  if _sbx_exists "$name"; then
    sbx run "$name"
  else
    sbx run --name="$name" --template "$SBX_OPENCODE_TEMPLATE" --memory "$SBX_MEMORY" opencode .
  fi
}
```

Per un progetto chiamato `myapp`, ottengo quindi due ambienti distinti, `myapp-claude` e `myapp-opencode`.

Ho limitato la memoria di ciascuna sandbox a 4 GB. Sul mio Mac è un compromesso necessario: lasciando troppa memoria
agli ambienti virtuali, soprattutto quando utilizzo anche un modello locale, rischio di rallentare tutto il sistema.

Con Claude Code è bastato autenticare l'account dentro la sandbox per iniziare a lavorare. OpenCode ha richiesto qualche
intervento in più, perché l'immagine disponibile includeva una versione precedente a quella che utilizzo e non aveva
accesso alla configurazione presente sul Mac. Ho preparato quindi un'immagine personalizzata con la versione corretta e
i miei agenti.

Ho dovuto anche far convivere la mia configurazione con quella che la sandbox genera automaticamente per il proprio
gateway MCP. La soluzione è stata spostare le impostazioni personali in un percorso separato e indicarlo attraverso
`OPENCODE_CONFIG`, che OpenCode carica insieme alla configurazione predefinita.

Una volta sistemato questo punto, entrambi gli harness hanno potuto lavorare negli ambienti isolati con le
configurazioni che utilizzo normalmente.

## Più agenti in parallelo con Git worktree e Rift

Le sandbox limitano l'accesso degli agenti al computer, ma non risolvono da sole un altro problema: come permettere a
più agenti di lavorare sullo stesso progetto senza modificare contemporaneamente gli stessi file.

Per questo utilizzo un [Git worktree](https://git-scm.com/docs/git-worktree) per ogni funzionalità. Ogni agente lavora
su una directory e un branch separati, così può modificare file, eseguire test e preparare commit senza interferire
direttamente con il lavoro degli altri.

Per organizzare le attività utilizzo [Orca](https://www.onorca.dev/), mentre gli ambienti di sviluppo sono gestiti
da [Rift](https://github.com/LucaPipolo/rift), uno strumento CLI che ho sviluppato per assegnare a ogni worktree i
propri container, le proprie porte e un dominio HTTPS locale. Ho spiegato nel dettaglio come funziona in
un [articolo dedicato](/it/blog/agenti-ai-in-parallelo-con-docker/).

Quando creo una nuova attività, Orca prepara il worktree ed esegue `rift setup` e `rift up` sul Mac. A quel punto
l'ambiente è già in esecuzione e posso aprire il terminale della nuova directory per avviare `claude-box` oppure
`opencode-box`. L'agente lavora nella propria sandbox, mentre Rift gestisce i servizi necessari a eseguire e verificare
l'applicazione.

Tengo volutamente Rift fuori dalle sandbox. Ogni sandbox possiede già un ambiente Docker separato, che non vede i
container né il router [Caddy](https://caddyserver.com/) in esecuzione sul Mac. Avviare un'altra copia dell'intera
applicazione al suo interno significherebbe duplicare servizi e consumare risorse senza particolari vantaggi.

L'agente modifica direttamente i file condivisi del worktree, quindi i container gestiti da Rift vedono subito i
cambiamenti. Posso aprire il relativo dominio locale nel browser, verificare il risultato e continuare a lavorare
normalmente.

Questo mi permette di seguire più attività contemporaneamente, ciascuna con il proprio branch, il proprio ambiente di
sviluppo e un agente dedicato. Quando una funzionalità è pronta, posso rivedere le modifiche e integrarle attraverso il
normale processo di pull request.

## Proteggere i dati quando utilizzo modelli cloud

Le sandbox proteggono il mio computer limitando ciò a cui gli agenti possono accedere. Rimane però un altro aspetto da
considerare: un agente autorizzato a leggere un file può includerne il contenuto nelle richieste inviate al modello. Se
utilizzo un servizio cloud, quelle informazioni lasciano il mio computer.

Lavorando tra Italia e Spagna, mi capita di gestire documenti con dati personali in entrambe le lingue: nomi, codici
fiscali, partite IVA, NIF, NIE, IBAN e altre informazioni identificative. Ho quindi aggiunto alcune protezioni,
scegliendo strumenti diversi a seconda dei dati e del tipo di lavoro.

Nei progetti software, la prima preoccupazione riguarda credenziali e segreti, come chiavi API e file `.env`. Cerco di
mantenerli fuori dal contesto degli agenti attraverso le regole del progetto e l'isolamento degli ambienti, limitando
l'accesso dove possibile.

Per il traffico verso i modelli che utilizzo tramite API, ho configurato un gateway locale basato
su [LiteLLM](https://docs.litellm.ai/) e [Microsoft Presidio](https://microsoft.github.io/presidio/). Il gateway gira in
Docker sul mio Mac e analizza le richieste prima che vengano inviate al provider, cercando di riconoscere e mascherare
informazioni personali, compresi alcuni identificativi italiani e spagnoli. Quando riceve la risposta, prova a
ripristinare i valori originali nei punti corrispondenti.

Per i documenti utilizzo anche [rizzo-pii](https://github.com/Rizzo-AI-Academy/rizzo-pii), che permette di anonimizzare
localmente un testo, inviarne la versione modificata a un modello e ripristinare successivamente le informazioni
originali. È pensato soprattutto per l'italiano, ma lo utilizzo anche con documenti in spagnolo.

### I limiti delle protezioni automatiche

Questi strumenti sono utili, ma non considero il risultato automaticamente sicuro.

Il gateway può controllare soltanto il traffico che lo attraversa. I modelli utilizzati tramite abbonamento e
autenticazione diretta, come alcune configurazioni di Claude Code e OpenCode, comunicano invece con i rispettivi
provider senza passare da LiteLLM.

Anche il riconoscimento dei dati personali ha dei limiti. Presidio può individuare correttamente un codice fiscale o un
indirizzo email, ma non sempre riesce a distinguere un nome proprio da una variabile oppure a riconoscere informazioni
identificative scritte in modo insolito. Nel codice sorgente, in particolare, il mascheramento può produrre falsi
positivi e alterare informazioni necessarie al modello.

Per questo scelgo l'agente anche in base alla sensibilità dei dati con cui dovrà lavorare, seguendo alcune regole:

| Tipo di lavoro                                   | Come lo gestisco                                                           |
| ------------------------------------------------ | -------------------------------------------------------------------------- |
| Codice senza dati personali                      | Scelgo l'agente in base alla difficoltà                                    |
| Documenti con dati personali                     | Anonimizzo il contenuto in locale prima di utilizzare un modello cloud     |
| Progetti che possono contenere dati personali    | Utilizzo `build`, `build-pro` o `local`, secondo le protezioni disponibili |
| Informazioni che non devono lasciare il computer | Utilizzo esclusivamente `local`                                            |

Quando utilizzo `build` o `build-pro` con il gateway, devo comunque verificare che il traffico passi davvero attraverso
il sistema di mascheramento e che le informazioni sensibili siano state riconosciute correttamente.

Se un dato non può essere condiviso con un fornitore esterno, preferisco evitare del tutto la trasmissione anziché
affidarmi soltanto all'anonimizzazione automatica.

## Passare da un harness all'altro senza perdere il contesto

Utilizzare modelli e harness diversi mi permette di scegliere lo strumento più adatto, ma introduce un problema pratico:
come continuare un lavoro quando devo passare da OpenCode a Claude Code, o viceversa?

Capita di iniziare un'attività con un modello economico e rendersi conto che serve uno più capace. Altre volte voglio
semplicemente cambiare harness, mantenendo le decisioni prese durante la sessione precedente. Ricostruire tutto
manualmente richiede tempo e rischia di far perdere informazioni importanti.

Per questo ho creato una skill condivisa tra i due harness, che utilizzo per preparare un passaggio di consegne.

Quando scrivo `handoff`, l'agente crea un file `.ai/HANDOFF.md` contenente l'obiettivo dell'attività, il lavoro già
svolto, le decisioni prese, i problemi ancora aperti e i prossimi passi. Aggiunge anche i percorsi dei file da
consultare per riprendere il lavoro.

Nell'altro harness mi basta scrivere `resume`: l'agente legge il file, ricostruisce la situazione e mi presenta un
riepilogo prima di continuare.

Ho previsto anche una regola specifica per la privacy: il file di handoff non deve contenere dati personali, ma soltanto
riferimenti ai file o segnaposto come `[CLIENTE_1]`. È importante perché quel documento potrebbe essere letto
successivamente da un harness che non utilizza il gateway di anonimizzazione.

È un meccanismo semplice, ma mi evita di ricostruire il contesto da zero ogni volta che un'attività deve passare da un
agente all'altro.

## Verificare e tracciare il lavoro

Avere agenti isolati e regole condivise rende più semplice lavorare in parallelo, ma il controllo delle modifiche resta
una parte essenziale del processo. Prima di integrare una funzionalità, verifico ciò che è stato modificato, controllo i
test e rileggo il diff. Utilizzo anche [ChatGPT Codex](https://chatgpt.com/codex) per le review delle pull request, così
da avere un'ulteriore verifica prima del merge.

Per mantenere una traccia del lavoro svolto con l'AI, nei commit creati con l'assistenza di un agente aggiungo un
trailer `Co-Authored-By` e una riga `Model:` che identifica il modello utilizzato. Ho previsto anche un tipo di commit
dedicato, `ai`, per le modifiche alle istruzioni, alle skill o alla configurazione degli agenti.

Mi interessa conservare queste informazioni sia per trasparenza sia per poter analizzare nel tempo come utilizzo i
diversi strumenti. Sapere quale modello ha contribuito a una modifica permette di confrontare i risultati e valutare
quando vale la pena utilizzare un modello più costoso. Vorrei arrivare a registrare anche il consumo di token per
commit, ma aspetto che gli strumenti mettano a disposizione dati abbastanza affidabili.

Il repository rimane quindi il punto in cui convergono il lavoro degli agenti, le verifiche e le decisioni finali. Posso
cambiare harness, modello o ambiente di esecuzione senza perdere la cronologia delle modifiche e senza dover ricostruire
come è stato svolto un determinato lavoro.

## Un ambiente che continua a evolvere

Questo setup è il risultato di diversi mesi di prove e aggiustamenti. Alcune decisioni sono arrivate subito, altre dopo
aver incontrato problemi concreti: agenti che ignoravano le convenzioni, ambienti che utilizzavano le stesse porte,
modelli locali troppo lenti o configurazioni che lasciavano accessibili più file del necessario.

Oggi riesco a gestire più agenti in parallelo, con ambienti separati e regole condivise. Posso scegliere modelli diversi
in base al lavoro, utilizzare un modello locale quando i dati devono restare sul mio computer e passare da un harness
all'altro senza perdere il contesto. Le modifiche vengono comunque verificate prima di essere integrate, seguendo le
stesse convenzioni che utilizzerei lavorando senza agenti.

Ci sono ancora diversi aspetti che vorrei migliorare, dalla raccolta delle informazioni sui costi dei modelli alla
protezione dei dati personali, fino alle prestazioni dei modelli locali. Anche la configurazione continuerà
inevitabilmente a cambiare, perché strumenti e modelli evolvono rapidamente.

La cosa più utile, per me, è aver costruito un processo che posso riutilizzare in progetti diversi. Quando inizio un
nuovo lavoro, ho già un ambiente, delle convenzioni e un modo per distribuire i compiti. Posso quindi concentrarmi sul
problema da risolvere, scegliere gli agenti più adatti e dedicare il mio tempo a valutare le soluzioni e verificare i
risultati.
