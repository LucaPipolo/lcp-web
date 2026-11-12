---
title: "Cómo trabajo con agentes de IA: modelos, sandboxes y privacidad"
slug: "como-trabajo-con-agentes-de-ia"
metaTitle: "Cómo trabajo con la IA: modelos, sandboxes y privacidad"
metaDescription: >-
  Cómo organizo el trabajo con varios agentes de IA: reglas compartidas,
  harnesses, modelos, Docker Sandboxes, desarrollo en paralelo y privacidad.
description: >-
  Mi entorno de desarrollo con Claude Code, OpenCode y modelos locales:
  cómo organizo las reglas, elijo los modelos, aíslo los agentes
  y protejo los datos personales cuando trabajo con servicios en la nube.
published: 2026-11-12
tags:
  - ai-agents
  - docker
  - privacy
  - developer-tools
related:
  - building-rift
---

Utilizo agentes de IA prácticamente a diario, tanto en proyectos personales como en trabajos para clientes. A menudo tengo varios funcionando a la vez, cada uno ocupado en una tarea diferente. Durante los últimos meses he probado distintos harnesses, modelos y configuraciones hasta dar con un entorno de desarrollo que ahora utilizo de forma bastante habitual.

Al principio trabajaba con un solo agente. Le encargaba una tarea, revisaba los cambios y pasaba a la siguiente. A medida que empecé a repartir el trabajo entre varios agentes y a utilizar diferentes modelos según la dificultad, aparecieron nuevos problemas: cómo conseguir que todos siguieran las mismas convenciones, evitar conflictos al modificar archivos, controlar qué podían ejecutar y proteger la información que no debía salir de mi ordenador.

Mi papel sigue siendo el mismo. Defino los objetivos, evalúo las soluciones y compruebo los resultados. Los agentes pueden analizar código, proponer enfoques, implementarlos y ejecutar pruebas, pero reviso los cambios antes de integrarlos y asumo la responsabilidad de lo que acaba en producción.

En este artículo explico cómo he organizado mi entorno, qué herramientas utilizo y por qué he tomado determinadas decisiones. También aplico este enfoque a la escritura. En la página de [contenidos y asistencia con IA](/contenido-ia/) explico cómo utilizo estas herramientas para preparar y revisar los artículos de esta web, incluido el que estás leyendo.

## Compartir las mismas reglas entre agentes

Uno de los primeros problemas que tuve fue encontrarme repitiendo las mismas instrucciones una y otra vez. Cada nueva sesión empezaba con una explicación sobre la estructura del proyecto, las convenciones de código, dónde ejecutar los comandos o cómo preparar los commits. Además, cuando cambiaba de agente, las decisiones tomadas durante la sesión anterior no siempre estaban disponibles.

Para resolverlo, empecé a guardar esas instrucciones en el propio repositorio. Utilizo `AGENTS.md` como referencia principal para las convenciones del proyecto. Para [Claude Code](https://claude.com/product/claude-code), que busca un archivo llamado `CLAUDE.md`, creo uno que contiene únicamente esta línea:

```markdown
@AGENTS.md
```

Claude Code importa el contenido del archivo indicado, así que puedo mantener las reglas en un único lugar y compartirlas entre diferentes harnesses. Las preferencias que aplico a todos mis proyectos están en `~/.claude/CLAUDE.md`, que [OpenCode](https://opencode.ai/) también puede utilizar cuando no encuentra una configuración global propia.

Cuando un proyecto crece, sin embargo, reunir todas las instrucciones en un solo archivo deja de resultar práctico. Prefiero separarlas por temas, como arquitectura, entorno de desarrollo, convenciones de Git y documentación, y cargar las más específicas solamente cuando tienen relación con la tarea. Si un agente está editando un artículo, no necesita leer todas las convenciones de TypeScript. Lo mismo ocurre con un agente que trabaja en el backend y no tiene por qué conocer las normas editoriales de la web.

Intento que las instrucciones sean concretas y respondan a necesidades reales. En este repositorio, por ejemplo, explican que los comandos de desarrollo deben ejecutarse dentro de Docker, qué dirección local utilizar para comprobar los cambios y por qué el código y los contenidos deben ir en commits separados. Muchas de estas reglas surgieron después de corregir varias veces el mismo error. Cuando detecto que una instrucción se repite, prefiero documentarla para que forme parte del proyecto.

### Skills y servidores MCP

Las reglas establecen cómo trabajar en el proyecto, mientras que las tareas recurrentes las organizo mediante skills. Tengo algunas para preparar commits siguiendo las convenciones del repositorio, abrir pull requests, gestionar los comentarios de una revisión y actualizar dependencias una por una.

Guardo las skills personales en `~/.claude/skills/` y las enlazo también desde la configuración de OpenCode. Así puedo mantener una sola implementación y utilizarla con ambos harnesses. Hay tareas que prefiero lanzar manualmente, como actualizar las dependencias. En esos casos añado `disable-model-invocation: true` al frontmatter para impedir que el agente invoque la skill por iniciativa propia.

También utilizo servidores [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) para dar a los agentes acceso a documentación y servicios externos. Para consultar documentación recurro a [Context7](https://context7.com/) o a los servidores oficiales de cada framework, cuando existen. Es especialmente útil con bibliotecas que cambian con frecuencia, porque el agente puede consultar la documentación actual en lugar de depender de lo que aprendió durante su entrenamiento. Otras integraciones me permiten consultar despliegues, logs y errores de las aplicaciones en producción.

La configuración MCP forma parte del repositorio, de modo que todos los worktrees pueden disponer de las mismas integraciones. Es una de las pocas configuraciones que todavía tengo que mantener por separado para cada harness, ya que sus formatos no son exactamente iguales.

## Dos harnesses y varios modelos

Tener las convenciones del proyecto en un lugar compartido me permite cambiar de harness sin empezar de cero cada vez. Actualmente trabajo sobre todo con Claude Code, desarrollado por [Anthropic](https://www.anthropic.com/), y OpenCode. Elijo uno u otro en función de la tarea.

Suelo recurrir a Claude Code para trabajos especialmente complejos, como refactorizaciones amplias, decisiones de arquitectura o errores difíciles de localizar. Normalmente utilizo Sonnet como modelo principal y Opus como _advisor_, para obtener una segunda opinión antes de decidir cómo abordar un problema o dar un trabajo por terminado. Así puedo reservar un modelo más potente para los momentos en los que realmente aporta valor, en lugar de utilizarlo para cada operación.

OpenCode es el harness con el que trabajo más a menudo. Su principal ventaja para mí es la flexibilidad: puedo elegir entre modelos de Anthropic, [OpenAI](https://openai.com/), [DeepSeek](https://www.deepseek.com/) y [Moonshot AI](https://www.moonshot.ai/), la empresa detrás de Kimi, además de modelos ejecutados en mi propio ordenador.

He configurado seis agentes con funciones y niveles de capacidad diferentes:

| Agente      | Función                                           | Modelo actual       |
| ----------- | ------------------------------------------------- | ------------------- |
| `build`     | Cambios cotidianos                                | DeepSeek V4.1 Flash |
| `build-pro` | Cambios más complejos                             | Kimi K3.1 Pro       |
| `build-max` | Trabajos especialmente exigentes                  | Claude Sonnet 5.5   |
| `plan`      | Análisis y planificación, en modo de solo lectura | GPT-6.1 Sol         |
| `plan-max`  | Segunda opinión sobre el plan                     | Claude Opus 5.5     |
| `local`     | Tareas locales y datos confidenciales             | Qwen 3.5 9B         |

Los nombres describen lo que hace cada agente y el nivel de capacidad que espero de él, independientemente del modelo que tenga configurado. `build` puede modificar el código, mientras que `plan` analiza el problema y prepara un plan sin tocar los archivos. Los sufijos `-pro` y `-max` identifican los niveles superiores, a los que recurro cuando una tarea necesita un modelo más capaz.

Esta organización me permite cambiar los modelos sin modificar mi forma de trabajar. Si dentro de unos meses encuentro una alternativa mejor para `build-pro`, bastará con actualizar su configuración.

Cada agente se define mediante un archivo Markdown, con el modelo en el frontmatter y las instrucciones en el contenido. Por ejemplo:

```markdown
---
description: Stronger build agent for harder multi-file changes.
mode: primary
model: opencode-go/kimi-k3.1-pro
---

You are the escalation build agent. You are used when the default build agent
struggled or when a change spans several files.
```

### Cómo decido qué modelo utilizar

Durante un tiempo valoré la posibilidad de añadir un router automático que analizara cada petición y eligiera el modelo más apropiado. Al final descarté la idea, principalmente porque utilizo una combinación de suscripciones y claves API. Los routers que estuve evaluando trabajan sobre todo con APIs, mientras que algunos de mis modelos solo están disponibles mediante la autenticación de sus respectivas suscripciones. Habría podido automatizar la selección, pero únicamente entre una parte de los modelos que utilizo.

Por ahora prefiero elegirlos manualmente siguiendo un criterio sencillo: empiezo con el modelo más económico que considero capaz de resolver la tarea y paso al siguiente cuando hace falta. Para cambios habituales utilizo `build`; si necesito algo más potente, paso a `build-pro`, después a `build-max` y, para los problemas más difíciles, a Claude Code.

También procuro separar la planificación de la ejecución. Preparar un buen plan puede justificar utilizar un modelo más avanzado, pero una vez que las decisiones están tomadas, buena parte de la implementación puede realizarla un modelo más económico. Esto resulta especialmente útil en desarrollo, donde una tarea puede implicar decenas de llamadas a herramientas, lecturas de archivos, cambios y pruebas.

No siempre acierto a la primera. Hay problemas que un modelo económico tarda demasiado en resolver, mientras que otro más potente encuentra la solución enseguida. Por eso tengo en cuenta tanto el precio de las peticiones como el tiempo que pierdo repitiendo intentos o corrigiendo resultados.

### Un modelo local para tareas más sencillas

Además de los modelos en la nube, utilizo uno local. Me resulta especialmente útil cuando trabajo con documentos confidenciales o con tareas que no requieren un razonamiento demasiado complejo.

Mi ordenador es un MacBook Pro con un M3 Pro y 18 GB de memoria unificada. Entre el sistema y las demás aplicaciones, puedo dedicar unos 10 o 12 GB al modelo. Con esas limitaciones he elegido [Qwen](https://qwen.ai/) 3.5 9B, que ejecuto mediante [Ollama](https://ollama.com/).

Las primeras pruebas fueron bastante decepcionantes. Incluso con preguntas sencillas, el modelo tardaba mucho en responder y se perdía en razonamientos interminables. Después de probar varias configuraciones, comprobé que los principales problemas eran el modo _thinking_ y una ventana de contexto demasiado pequeña para utilizarlo como agente.

Creé una variante del modelo con 32K tokens de contexto:

```bash
printf 'FROM qwen3.5:9b\nPARAMETER num_ctx 32768\n' > Modelfile
ollama create qwen3.5-32k -f Modelfile
```

También desactivé el razonamiento explícito en la configuración de OpenCode mediante `reasoning_effort: "none"`. En mi caso, estos ajustes mejoraron bastante el rendimiento, sobre todo en tareas breves.

Con el tiempo he aprendido a elegir mejor qué trabajos encargarle. No confío demasiado en un modelo de este tamaño cuando necesito información actualizada o un análisis complejo. Durante mis pruebas, por ejemplo, inventaba fechas o hechos que desconocía. En cambio, funciona bastante mejor cuando le proporciono el material necesario y le pido que trabaje sobre él.

Por eso lo utilizo principalmente para reescribir, traducir y resumir textos, además de realizar pequeños cambios de código bien delimitados. Cuando se trata de documentos confidenciales, tiene otra ventaja: puedo procesarlos sin enviar su contenido a un servicio externo.

Tengo pendiente probar [llama.cpp](https://github.com/ggml-org/llama.cpp) como alternativa a Ollama, para comprobar si consigo mejorar la velocidad y la fiabilidad de las llamadas a herramientas.

## Aislar los agentes del ordenador

Una vez elegido el harness y el modelo, queda decidir dónde ejecutarlo. Para mí es una parte importante de la configuración, porque un agente con acceso al terminal podría leer archivos de otros proyectos, credenciales, claves SSH o documentos personales que no tienen ninguna relación con su tarea.

Los harnesses incluyen sistemas de permisos, pero aprobar manualmente cada comando se vuelve poco práctico cuando tienes varios agentes trabajando a la vez. Por eso decidí utilizar [Docker Sandboxes](https://docs.docker.com/ai/sandboxes/) para aislar sus entornos de ejecución.

Cada sandbox funciona como una pequeña máquina virtual con su propio entorno Docker y acceso limitado al directorio del proyecto. El agente puede ejecutar comandos y trabajar con los archivos compartidos, pero no obtiene acceso automático al resto de mi ordenador.

Cuando terminé de configurar la primera sandbox hice una prueba sencilla: pedí a Claude Code que listara el contenido de mi directorio personal y leyera `~/.ssh`. No pudo acceder a esos archivos del Mac, que era precisamente lo que quería comprobar.

Para no tener que recordar los nombres y las opciones de cada sandbox, creé dos funciones de shell llamadas `claude-box` y `opencode-box`. Desde el directorio de un proyecto, crean la sandbox si todavía no existe o vuelven a abrirla si ya está disponible.

Por ejemplo, esta es la función que utilizo para OpenCode:

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

Así, para un proyecto llamado `myapp` tengo dos entornos independientes: `myapp-claude` y `myapp-opencode`.

También he limitado la memoria de cada sandbox a 4 GB. Con los recursos de mi Mac es un compromiso necesario, especialmente cuando estoy ejecutando un modelo local al mismo tiempo. Sin ese límite, varios entornos virtuales podrían consumir demasiada memoria y ralentizar el resto del sistema.

Configurar Claude Code fue relativamente sencillo: bastó con autenticar mi cuenta dentro de la sandbox. Con OpenCode tuve que hacer algunos ajustes adicionales, porque la imagen disponible incluía una versión anterior y no tenía acceso a la configuración de mi Mac. Preparé una imagen personalizada con la versión que utilizo y mis agentes.

También tuve que resolver un conflicto entre mi configuración y la que genera automáticamente la sandbox para su gateway MCP. Finalmente moví mis ajustes a una ruta independiente y los cargué mediante la variable `OPENCODE_CONFIG`, de forma que pudieran convivir con la configuración predeterminada.

Con esos cambios conseguí utilizar ambos harnesses en entornos aislados, manteniendo las configuraciones con las que trabajo normalmente.

## Varios agentes en paralelo con Git worktrees y Rift

Las sandbox permiten controlar a qué recursos del ordenador puede acceder cada agente, pero queda otra cuestión: cómo hacer que varios trabajen en el mismo proyecto sin sobrescribir los cambios de los demás.

Para eso utilizo un [Git worktree](https://git-scm.com/docs/git-worktree) por funcionalidad. Cada agente dispone de su propio directorio y su propia rama, por lo que puede modificar archivos, ejecutar pruebas y preparar commits sin intervenir directamente en el trabajo de otros agentes.

Organizo las tareas con [Orca](https://www.onorca.dev/) y gestiono los entornos de desarrollo con [Rift](https://github.com/LucaPipolo/rift), una herramienta CLI que he desarrollado para asignar a cada worktree sus propios contenedores, puertos y dominio HTTPS local. He explicado su funcionamiento con más detalle en [otro artículo](/blog/agentes-ia-en-paralelo-con-docker/).

Cuando creo una tarea, Orca prepara el worktree y ejecuta `rift setup` y `rift up` en mi Mac. El entorno de desarrollo queda listo para utilizarse y solo tengo que abrir el terminal de ese worktree para lanzar `claude-box` u `opencode-box`. El agente trabaja dentro de su sandbox, mientras Rift mantiene en funcionamiento los servicios necesarios para probar la aplicación.

Mantengo Rift fuera de las sandbox de forma deliberada. Cada sandbox tiene su propio entorno Docker, aislado de los contenedores y del router [Caddy](https://caddyserver.com/) que están funcionando en el Mac. Si ejecutara también toda la aplicación dentro de cada sandbox, estaría duplicando servicios y consumiendo memoria sin obtener una ventaja real.

En cambio, la sandbox trabaja directamente sobre los archivos compartidos del worktree. Los contenedores gestionados por Rift detectan los cambios, así que puedo abrir el dominio local correspondiente y comprobar el resultado en el navegador.

Con esta configuración puedo desarrollar varias funcionalidades a la vez, cada una con su propia rama, entorno y agente. Cuando una está terminada, reviso los cambios y los integro mediante el proceso habitual de pull request.

## Proteger los datos cuando utilizo modelos en la nube

Las sandbox ayudan a proteger mi ordenador limitando los archivos a los que puede acceder un agente. Pero hay otra cuestión igual de importante: un agente autorizado a leer un documento puede incluir su contenido en una petición al modelo. Si ese modelo funciona en la nube, la información sale de mi ordenador.

Trabajo entre Italia y España, y en ocasiones manejo documentos que contienen datos personales en ambos idiomas: nombres, códigos fiscales italianos, números de IVA, NIF, NIE, IBAN y otros identificadores. Para estos casos he añadido varias protecciones, que utilizo según la información y el trabajo que tenga que hacer.

En los proyectos de software me preocupan especialmente los secretos, como las claves API y los archivos `.env`. Intento mantenerlos fuera del alcance de los agentes mediante las reglas del proyecto, la configuración de permisos y el aislamiento de los entornos.

Para las peticiones realizadas a modelos mediante API, he preparado un gateway local basado en [LiteLLM](https://docs.litellm.ai/) y [Microsoft Presidio](https://microsoft.github.io/presidio/). Se ejecuta en Docker, en mi Mac, y analiza las solicitudes antes de enviarlas al proveedor. Su función es identificar y enmascarar datos personales, incluidos algunos identificadores italianos y españoles, y restaurar los valores originales cuando llega la respuesta.

Cuando trabajo con documentos también utilizo [rizzo-pii](https://github.com/Rizzo-AI-Academy/rizzo-pii). Esta herramienta permite anonimizar un texto localmente, enviarlo a un modelo y recuperar después los valores originales. Está orientada principalmente al italiano, pero también la utilizo con documentos en español.

### Los límites de estas protecciones

Hay que tener presente que ninguna de estas medidas garantiza por sí sola que todos los datos personales queden protegidos.

El gateway solo puede analizar el tráfico que pasa por él. Algunos de los modelos que utilizo a través de suscripciones y autenticación directa, como determinadas configuraciones de Claude Code y OpenCode, se conectan directamente a sus proveedores y no pasan por LiteLLM.

Además, el reconocimiento automático de datos personales no siempre acierta. Presidio puede identificar correctamente un correo electrónico o un código fiscal, pero también puede confundir el nombre de una variable con el de una persona o pasar por alto información escrita de una forma inesperada. Este problema resulta especialmente visible al trabajar con código, donde el enmascaramiento puede alterar elementos que el modelo necesita para completar su tarea.

Por eso la sensibilidad de los datos influye directamente en qué agente elijo:

| Tipo de trabajo                                | Cómo lo gestiono                                                           |
| ---------------------------------------------- | -------------------------------------------------------------------------- |
| Código sin datos personales                    | Elijo el agente según la dificultad                                        |
| Documentos con datos personales                | Anonimizo el contenido localmente antes de utilizar un modelo en la nube   |
| Proyectos que pueden contener datos personales | Utilizo `build`, `build-pro` o `local`, según las protecciones disponibles |
| Información que no debe salir del ordenador    | Utilizo exclusivamente `local`                                             |

Cuando utilizo `build` o `build-pro` a través del gateway, también compruebo que las solicitudes estén pasando realmente por el sistema de enmascaramiento y que los datos sensibles se hayan detectado correctamente.

Si una información no puede compartirse con un proveedor externo, prefiero mantenerla fuera de los servicios cloud en lugar de depender únicamente de la anonimización automática.

## Cambiar de harness sin perder el contexto

Trabajar con varios harnesses me permite elegir la herramienta más adecuada en cada momento, pero también genera un problema práctico: qué hacer con el contexto acumulado cuando tengo que pasar de OpenCode a Claude Code, o viceversa.

A veces empiezo una tarea con un modelo económico y descubro que necesito uno más capaz. Otras veces simplemente quiero continuar el trabajo en otro harness. Explicar otra vez todo lo que se ha hecho consume tiempo y es fácil olvidar alguna decisión importante.

Para evitarlo, he creado una skill compartida que prepara un pequeño documento de traspaso.

Cuando escribo `handoff`, el agente genera `.ai/HANDOFF.md` con el objetivo de la tarea, los cambios realizados, las decisiones tomadas, los problemas pendientes y los siguientes pasos. También incluye las rutas de los archivos que conviene leer para retomar el trabajo.

Después, en el otro harness, escribo `resume`. El agente lee el documento, reconstruye el contexto y me presenta un resumen antes de continuar.

Este archivo también sigue una regla de privacidad: no debe incluir datos personales. Si necesita hacer referencia a información sensible, utiliza rutas de archivos o marcadores como `[CLIENTE_1]`. Es importante porque el documento podría terminar siendo leído por un harness que no pasa por mi gateway de anonimización.

Es un mecanismo bastante sencillo, pero me permite cambiar de herramienta sin reconstruir manualmente el historial de cada tarea.

## Revisar y registrar el trabajo

Las reglas compartidas y los entornos aislados me permiten trabajar con varios agentes, pero sigo necesitando un proceso para comprobar sus resultados. Antes de integrar una funcionalidad reviso el diff, compruebo los tests y verifico que los cambios respondan a lo que había pedido. También utilizo [ChatGPT Codex](https://chatgpt.com/codex) para revisar las pull requests y contar con otra valoración antes de hacer el merge.

Para dejar constancia del trabajo realizado con IA, los commits creados con ayuda de un agente incluyen un trailer `Co-Authored-By` y una línea `Model:` que identifica el modelo utilizado. Además, he añadido un tipo de commit específico, `ai`, para los cambios relacionados con instrucciones, skills y configuración de agentes.

Me interesa conservar esa información por transparencia y porque quiero entender mejor cómo funcionan mis propios flujos de trabajo. Saber qué modelo participó en un cambio me ayuda a comparar resultados y valorar cuándo merece la pena recurrir a uno más caro. En el futuro también me gustaría registrar el consumo de tokens por commit, cuando pueda obtener esos datos de forma fiable.

El repositorio acaba siendo el lugar donde quedan recogidos los cambios, las comprobaciones y las decisiones finales. Puedo sustituir un modelo, cambiar de harness o modificar el entorno de ejecución sin perder la trazabilidad del trabajo.

## Un entorno que sigue evolucionando

Esta configuración es el resultado de varios meses de pruebas y ajustes. Algunas decisiones surgieron desde el principio y otras llegaron después de encontrar problemas concretos: agentes que no seguían las convenciones, entornos que intentaban utilizar los mismos puertos, modelos locales demasiado lentos o configuraciones que permitían acceder a más archivos de los necesarios.

Ahora puedo trabajar con varios agentes en paralelo, cada uno en su entorno, siguiendo las mismas reglas. Puedo elegir modelos distintos según la dificultad, recurrir a uno local cuando los datos deben quedarse en mi ordenador y cambiar de harness sin perder el contexto. Después sigo revisando el código y las pruebas antes de integrar cualquier cambio.

Todavía hay bastante margen de mejora. Quiero medir mejor el coste real de utilizar cada modelo, seguir afinando la protección de los datos personales y evaluar alternativas para ejecutar modelos locales con mayor eficiencia. También sé que tendré que revisar la configuración a menudo, porque los modelos y las herramientas cambian con rapidez.

Lo que más valoro es haber conseguido un proceso que puedo reutilizar en proyectos distintos. Cuando empiezo una tarea ya tengo preparadas las convenciones, los entornos y la forma de repartir el trabajo. Eso me permite dedicar más tiempo a entender el problema, tomar decisiones y comprobar que el resultado es el que necesito.
