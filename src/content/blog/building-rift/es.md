---
title: "Rift: cómo trabajo con varios agentes de IA en paralelo usando Docker y Git worktrees"
slug: "agentes-ia-en-paralelo-con-docker"
description: >-
  Cada agente de IA con su propio entorno Docker, sus puertos y un dominio
  HTTPS local. Cómo desarrollé Rift con Laravel Zero y cómo lo utilizo junto
  a Orca para trabajar en varias funcionalidades en paralelo.
published: 2026-11-06
tags:
  - ai-agents
  - docker
  - git
  - laravel
  - developer-tools
---

Los [Git worktrees](https://git-scm.com/docs/git-worktree) permiten trabajar con varias ramas de un mismo repositorio sin tener que cambiar constantemente de una a otra. Cada worktree tiene su propio directorio y su propia copia de trabajo, aunque todos comparten el mismo repositorio Git. Es una solución especialmente útil cuando trabajas con varios agentes de IA a la vez, ya que cada uno puede encargarse de una funcionalidad diferente sin interferir con los demás.

La cosa se complica cuando necesitas arrancar las aplicaciones. Tres worktrees implican tres servidores de desarrollo intentando utilizar el mismo puerto `4321`, posiblemente junto a tres bases de datos PostgreSQL que también quieren usar el `5432`. El primero arranca sin problemas, pero los demás se encuentran con los puertos ocupados.

Puedes solucionarlo manualmente, cambiando los puertos y adaptando la configuración de cada entorno, pero resulta poco práctico cuando tienes varios agentes trabajando en paralelo. Cada uno debería poder ejecutar la aplicación para comprobar sus cambios, mientras que yo quiero poder abrir cada versión en el navegador sin tener que reconfigurar Docker constantemente.

Por eso desarrollé [Rift](https://github.com/LucaPipolo/rift), una herramienta CLI open source que gestiona entornos Docker independientes para cada Git worktree y asigna automáticamente puertos y dominios HTTPS locales.

## Un entorno para cada agente

Rift permite ejecutar varias copias de un mismo proyecto al mismo tiempo, cada una con sus propios contenedores, puertos y dirección HTTPS. Por ejemplo, un proyecto con tres worktrees podría tener esta configuración:

| Worktree          | Dirección                     |
| ----------------- | ----------------------------- |
| `myapp/`          | `https://myapp.test`          |
| `myapp-search/`   | `https://search.myapp.test`   |
| `myapp-checkout/` | `https://checkout.myapp.test` |

Puedo mantener las tres aplicaciones en marcha, pasar de una a otra desde el navegador y detener un entorno sin afectar a los demás. Esto viene especialmente bien cuando varios agentes están trabajando en funcionalidades diferentes y quiero revisar los resultados a medida que terminan sus tareas.

Rift aprovecha la configuración existente de [Docker Compose](https://docs.docker.com/compose/) o [Laravel Sail](https://laravel.com/docs/sail) y utiliza [Caddy](https://caddyserver.com/) como reverse proxy compartido para gestionar HTTPS y dirigir las peticiones al contenedor correspondiente. La CLI se instala una sola vez y cada proyecto define sus ajustes mediante un archivo YAML.

## Cómo nació Rift

La primera versión se remonta a agosto, cuando configuré el entorno de desarrollo Docker de esta web. Necesitaba trabajar en varias ramas a la vez y acabé escribiendo cuatro archivos Bash para gestionarlo: `setup.sh`, `up.sh`, `down.sh` y una librería de funciones compartidas. En total, casi seiscientas líneas de código.

El funcionamiento ya era bastante parecido al actual. Cada checkout utilizaba el nombre de su directorio como nombre del proyecto de Docker Compose, de modo que Docker creaba contenedores, redes y volúmenes independientes. Todos los entornos estaban conectados a un único router Caddy, encargado de gestionar los certificados HTTPS y dirigir las peticiones según el dominio. Al arrancar un worktree, los scripts registraban su ruta a través de la API de administración de Caddy y la eliminaban cuando se detenía. Un resolver DNS local hacía que todos los dominios `*.test` apuntaran a `127.0.0.1`, así que no tenía que estar modificando `/etc/hosts` cada vez.

Los scripts funcionaban bien y habían resuelto el problema para esta web, pero estaban demasiado ligados a su configuración. Reutilizarlos en otros proyectos habría significado tener que adaptar el código cada vez.

Decidí convertir aquella solución en una herramienta independiente, que pudiera instalar una sola vez y configurar para cada proyecto mediante un archivo YAML.

Con la versión 1.0 de Rift, las casi seiscientas líneas de Bash que utilizaba en esta web quedaron sustituidas por un archivo `rift.yaml`:

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

Toda la lógica para preparar los entornos, gestionar los contenedores, asignar los puertos y configurar el router está ahora dentro de Rift. El archivo YAML solo contiene los ajustes específicos de cada proyecto.

## Cómo funciona

Rift parte de la configuración Docker que ya tiene el proyecto, sin necesidad de reescribir los servicios ni adoptar una estructura concreta. El comando `rift init` analiza los archivos Compose y las variables de entorno, propone una configuración inicial y genera el archivo `rift.yaml`.

La configuración inicial también requiere un pequeño cambio en Docker Compose para conectar el servicio de la aplicación a la red del router compartido y hacer que el directorio Git común esté disponible dentro del contenedor. Una vez guardados estos cambios en el repositorio, los nuevos worktrees los heredarán automáticamente.

A partir de ahí, crear un entorno para una nueva rama requiere solo tres comandos:

```bash
git worktree add -b search ../myapp-search
cd ../myapp-search
rift setup
```

`rift setup` prepara el archivo `.env`, asigna los puertos disponibles, arranca los contenedores y registra la aplicación en el router. El nuevo worktree estará disponible en `https://search.myapp.test`, mientras que la copia principal seguirá funcionando en `https://myapp.test`.

Para el día a día, basta con unos pocos comandos:

```bash
rift up        # Arranca el worktree actual
rift down      # Lo detiene sin afectar a los demás
rift status    # Muestra las aplicaciones registradas en el router
rift doctor    # Diagnostica posibles problemas de configuración
```

Una de las decisiones que tomé durante el desarrollo fue evitar que Rift modificara los archivos Docker Compose en tiempo de ejecución. Los puertos se gestionan mediante variables de entorno, actualizando sus valores en el `.env` y respetando las demás claves, los comentarios y su orden original. Los puertos que quieras gestionar con Rift deben estar definidos mediante variables en Compose, pero por lo demás el proyecto sigue funcionando como antes. Si quiero arrancar los servicios manualmente con `docker compose up`, puedo seguir haciéndolo.

## Cómo utilizo Rift con Orca

El caso de uso que más me interesa es el desarrollo en paralelo con agentes de IA. Actualmente utilizo [Orca](https://onorca.dev/), un Agent Development Environment (ADE) que permite gestionar varias tareas al mismo tiempo, cada una en su propio Git worktree.

Con Orca puedo asignar una funcionalidad a un agente, dejar que otro corrija un bug y seguir trabajando personalmente en una tercera rama. Cada tarea tiene su propio directorio, por lo que los agentes pueden modificar archivos sin interferir entre ellos. Sin embargo, en proyectos que utilizan Docker sigue existiendo el problema de ejecutar todos esos entornos a la vez. Ahí es donde entra Rift.

Orca permite configurar scripts que se ejecutan automáticamente al crear o archivar un worktree. La integración con Rift solo necesita dos comandos.

En el script de setup:

```bash
cd "$ORCA_WORKTREE_PATH" && rift setup
```

Y en el script de archivado:

```bash
cd "$ORCA_WORKTREE_PATH" && rift down
```

Cuando creo una nueva tarea en Orca, el primer script prepara el entorno Docker de su worktree, asigna los puertos y arranca la aplicación. Cuando archivo la tarea, el segundo detiene los contenedores y elimina su ruta del router, dejando todos los demás entornos en marcha.

En la práctica, puedo crear una tarea, asignársela a un agente y dejar que trabaje en su propia rama. Cuando quiero revisar los cambios, la aplicación ya está disponible en una dirección HTTPS local. Si tengo varios agentes trabajando a la vez, puedo abrir las distintas versiones en el navegador y comparar los resultados sin cambiar de rama ni reiniciar continuamente los servicios.

Me resulta especialmente útil para cambios en la interfaz, nuevas funcionalidades y, en general, cualquier tarea en la que revisar un diff no sea suficiente para valorar el resultado. Puedo comprobar directamente cómo se comporta la aplicación mientras los demás agentes siguen trabajando en sus respectivas tareas.

## Por qué elegí Laravel Zero

Cuando decidí convertir los scripts Bash en una CLI, elegir [Laravel Zero](https://laravel-zero.com/) fue bastante natural. Llevo años trabajando con Laravel, me gusta cómo está estructurado y siempre he valorado mucho su developer experience, así que quería mantener ese mismo enfoque en este proyecto.

Laravel Zero es un framework pensado para desarrollar aplicaciones CLI utilizando muchos de los componentes y convenciones de Laravel. Ofrece una estructura familiar para organizar los comandos, gestionar dependencias y crear interfaces de terminal con prompts interactivos, indicadores de progreso y salidas bien formateadas.

También quería que Rift fuera una herramienta agradable de utilizar, con comandos sencillos, mensajes claros y feedback útil durante las operaciones. Cuando una herramienta arranca varios contenedores, configura un router o modifica variables de entorno, es importante saber qué está haciendo y en qué punto se ha producido un error. Laravel Zero me permitió centrarme en esos detalles utilizando herramientas que ya conocía bien.

Otro motivo importante fue la facilidad para escribir tests. Rift ejecuta constantemente comandos externos, principalmente `docker` y `git`, y se comunica con la API HTTP de Caddy. Laravel ofrece las API `Process`, `Http` y `Sleep`, junto con sus respectivos _fakes_, que permiten simular estas operaciones durante los tests sin tener que ejecutar realmente los procesos ni modificar nada en la máquina.

La suite de tests está escrita con [Pest](https://pestphp.com/) y alcanza un 100 % de code coverage y type coverage, con [Larastan](https://github.com/larastan/larastan) configurado en su nivel máximo. El entorno de desarrollo de Rift también está completamente containerizado, por lo que para trabajar en el proyecto basta con Docker y [GNU Make](https://www.gnu.org/software/make/), sin necesidad de instalar PHP en local.

### Un ejecutable que incluye PHP

Rift está escrito en [PHP](https://www.php.net/), pero no quería obligar a quien lo utilizara a instalar PHP y gestionar sus dependencias. Por eso decidí distribuirlo como un ejecutable independiente que incluye también el runtime.

El proceso de build empaqueta la aplicación en un archivo PHAR y lo concatena con un runtime PHP estático llamado _micro_, proporcionado por [static-php-cli](https://static-php.dev/):

```bash
cat "$micro" "$root/builds/rift.phar" > "$root/builds/rift-$target"
```

El resultado es un único ejecutable para macOS y Linux, disponible tanto para ARM64 como para x86-64. Durante la build, los runtimes descargados se comprueban mediante checksums definidos en el repositorio, para garantizar que se utilizan los archivos previstos.

Para facilitar aún más la instalación, el repositorio también funciona como tap de [Homebrew](https://brew.sh/):

```bash
brew tap lucapipolo/rift https://github.com/LucaPipolo/rift
brew trust lucapipolo/rift
brew install rift
```

Así puedo seguir desarrollando Rift con Laravel, mientras que quien quiera utilizarlo solo tiene que instalar un ejecutable, sin preocuparse por PHP ni Composer.

## Un router compartido para todos los proyectos

Una de las partes más delicadas de implementar fue la gestión del router. Rift utiliza un único contenedor Caddy para servir todos los proyectos y sus respectivos worktrees, así que cada entorno debe poder registrar y eliminar sus propias rutas sin modificar las de los demás.

La API de administración de Caddy dispone del endpoint `POST /load`, que permite cargar una configuración completa, pero sustituye la que ya existe. Utilizarlo mientras hay otros proyectos en ejecución supondría arriesgarse a perder sus rutas.

Por eso Rift solo utiliza ese endpoint al inicializar un router vacío. A partir de ese momento, cada worktree añade y elimina únicamente sus propias rutas mediante operaciones específicas sobre la API. Cuando ejecuto `rift down`, solo se elimina la configuración asociada al entorno actual y los demás proyectos siguen funcionando con normalidad.

HTTPS también se gestiona de forma centralizada mediante la Certificate Authority local de Caddy, en la que solo hay que confiar una vez desde el sistema. A partir de ahí, Rift puede generar certificados para todos los dominios de los proyectos, incluidos los nombres adicionales que utilizan las API o los paneles de administración.

Hay un detalle importante con los certificados wildcard: un certificado para `*.myapp.test` cubre `search.myapp.test`, pero no `api.search.myapp.test`, porque el wildcard solo abarca un nivel de subdominios. Rift lo tiene en cuenta al registrar los hostnames de un worktree y solicita los certificados adicionales que necesita para los dominios que no cubre el wildcard principal.

## Gestionar los puertos sin conflictos

Otro aspecto que requirió cierta atención fue la asignación de puertos. Cuando se crea un worktree, Rift hereda el archivo `.env` de la copia principal, si está disponible, incluidos los puertos configurados para los distintos servicios. El problema es que esos puertos pueden estar ya en uso por otros entornos.

Rift comprueba los puertos definidos en `rift.yaml` y mantiene sus valores actuales cuando están disponibles, buscando otro puerto si encuentra un conflicto. Pero comprobar únicamente qué puertos están ocupados en ese momento no es suficiente: también hay que tener en cuenta los worktrees que están detenidos.

Imaginemos dos worktrees parados, ambos configurados para publicar PostgreSQL en el puerto `5432`. Si Rift solo comprobara los puertos que están escuchando en ese momento, podría considerar que el `5432` está libre para los dos. El conflicto aparecería al intentar arrancarlos simultáneamente.

Para evitarlo, Rift considera reservados también los puertos que ya tienen asignados otros worktrees del mismo proyecto, estén en ejecución o no. Al mismo tiempo, reconoce los puertos utilizados por los contenedores del worktree actual, de modo que puede reiniciar un entorno sin cambiar innecesariamente sus puertos.

Es uno de esos detalles que apenas notas cuando todo funciona, pero que importan bastante cuando pasas el día arrancando y deteniendo distintos entornos de desarrollo.

## ¡Pruébalo!

[Rift](https://github.com/LucaPipolo/rift) es open source y se distribuye bajo licencia [MIT](https://opensource.org/license/mit). Funciona en macOS y Linux y requiere [Git](https://git-scm.com/), [Docker](https://www.docker.com/) y un proyecto configurado con Docker Compose o Laravel Sail. Es compatible con [Docker Desktop](https://www.docker.com/products/docker-desktop/), [OrbStack](https://orbstack.dev/) y [Colima](https://github.com/abiosoft/colima).

Para utilizar dominios locales `*.test`, necesitas configurar un resolver DNS que los dirija a `127.0.0.1`, por ejemplo con [dnsmasq](https://thekelleys.org.uk/dnsmasq/doc.html). También deben estar disponibles los puertos 80, 443 y 2019 para el router compartido.

Puedes encontrar el código, la documentación y las releases en [github.com/LucaPipolo/rift](https://github.com/LucaPipolo/rift). Si lo pruebas en alguno de tus proyectos y encuentras algún problema, empieza ejecutando `rift doctor` para revisar la configuración. Si no consigues resolverlo, puedes [abrir una issue en GitHub](https://github.com/LucaPipolo/rift/issues).
