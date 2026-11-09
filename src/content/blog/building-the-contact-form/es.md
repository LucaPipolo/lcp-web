---
title: "Un formulario de contacto sin spam en una web estática: Astro, Vercel y Turnstile"
slug: "formulario-de-contacto-sin-spam"
description: >-
  Cómo he creado el formulario de contacto de esta web con Astro,
  Vercel Functions y Cloudflare Turnstile, manteniendo una CSP estricta
  y gestionando la conservación y eliminación de los datos personales.
published: 2026-11-09
tags:
  - astro
  - vercel
  - security
  - privacy
  - developer-tools
---

Hasta hace unos días, la única forma de contactar conmigo desde esta web era utilizar un enlace `mailto:`. Era una solución sencilla que siempre había cumplido su función, pero tenía un inconveniente: mi dirección de correo aparecía directamente en el HTML, donde cualquier bot dedicado a recopilar direcciones para enviar spam podía encontrarla.

Decidí añadir un formulario de contacto, aunque quería evitar que una funcionalidad tan pequeña complicara la arquitectura de la web. Está desarrollada con [Astro](https://astro.build/), se genera completamente de forma estática y está alojada en [Vercel](https://vercel.com/). Además, utiliza una [Content Security Policy (CSP)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP) bastante estricta, sin `unsafe-inline` ni `unsafe-eval`, y está disponible en tres idiomas. Mi intención era mantener todo eso y añadir únicamente lo necesario para recibir mensajes.

También tenía otros dos requisitos. Por un lado, quería reducir el spam sin obligar a las personas a superar comprobaciones molestas cada vez que me escribieran. Por otro, el formulario iba a recoger nombres, direcciones de correo y mensajes, así que necesitaba decidir cómo tratar esos datos, durante cuánto tiempo conservarlos y cómo eliminarlos cuando dejaran de ser necesarios.

El resultado es el [formulario que encontrarás en la página de contacto](/contacto/). Para desarrollarlo he utilizado Vercel Functions, Cloudflare Turnstile, Brevo y Neon, manteniendo el frontend estático y reservando el código de servidor para las operaciones que realmente lo necesitan.

## Añadir un formulario sin renunciar a una web estática

La primera decisión era dónde ejecutar el código encargado de recibir los mensajes. Astro dispone de un [adaptador oficial para Vercel](https://docs.astro.build/en/guides/integrations-guide/vercel/), pero utilizarlo habría cambiado el proceso de compilación del proyecto. Esta web ya cuenta con una configuración específica: un middleware gestiona el idioma antes de que intervenga la caché y varios encabezados de seguridad, incluida la CSP, están definidos en `vercel.json`. Prefería no modificar una configuración que ya funcionaba, especialmente para una funcionalidad que solo necesitaba unos pocos endpoints.

Por eso mantuve la generación estática de Astro y añadí directamente varias [Vercel Functions](https://vercel.com/docs/functions). Las funciones están en el directorio `api/` y Vercel las despliega de manera independiente del resto de la web. En mi caso son tres: `contact.ts` recibe los mensajes, `cleanup.ts` elimina los datos caducados y `notify.ts` permite enviar comunicaciones cuando hay cambios relevantes en la política de privacidad.

La función de contacto utiliza las API web estándar, con una `Request` de entrada y una `Response` de salida. No necesité introducir un framework de backend ni cambiar la forma en que Astro genera las páginas.

También compartí las reglas de validación entre el navegador y el servidor. Las comprobaciones de longitud de los campos, formato del correo electrónico y número máximo de enlaces están definidas en un único módulo TypeScript que utilizan ambos. Así puedo modificar una regla sin correr el riesgo de que el navegador acepte un mensaje que el servidor después rechace.

Para la interactividad elegí [Alpine.js](https://alpinejs.dev/) con su [versión compatible con CSP](https://alpinejs.dev/advanced/csp). Esta compilación evita evaluar expresiones JavaScript directamente en los atributos HTML, así que utilizo métodos del componente en lugar de expresiones inline. Supone alguna pequeña limitación, pero mantiene la lógica fuera del marcado y permite respetar la CSP sin recurrir a `unsafe-eval`.

El formulario solo pide nombre, correo electrónico, mensaje y motivo de contacto. Este último permite elegir entre una oportunidad laboral, un proyecto, una colaboración u otro asunto. Según la opción seleccionada, cambia el texto de ejemplo del campo de mensaje para sugerir qué información puede resultar útil. También he cuidado la validación: los errores aparecen una vez que la persona ha empezado a rellenar el campo y, si intenta enviar el formulario con datos incorrectos, el foco pasa al primero que necesita corregirse. Cada error está asociado a su campo mediante `aria-describedby` para que los lectores de pantalla puedan anunciarlo correctamente.

Así he conseguido un formulario sencillo que encaja con el resto de la web sin necesidad de renderizado en el servidor. Y para quien prefiera hablar en lugar de escribir, también he incluido un enlace a [Notion Calendar](https://www.notion.com/product/calendar) para reservar una llamada.

## Reducir el spam sin complicar el formulario

Cualquier formulario público acabará recibiendo spam tarde o temprano. Mi objetivo era reducirlo al máximo, pero sin recurrir a CAPTCHA intrusivos ni añadir pasos innecesarios para quienes simplemente quieren contactar conmigo.

Opté por combinar varias comprobaciones, empezando por las más sencillas y menos costosas. El formulario incluye un campo oculto, conocido como _honeypot_, que una persona normalmente no ve ni rellena, pero que algunos bots completan automáticamente. También registro el tiempo transcurrido desde que se abre la página: si un mensaje se envía en menos de tres segundos, se considera sospechoso. Ninguno de estos mecanismos es infalible, pero ambos permiten descartar parte del tráfico automatizado sin consultar servicios externos.

La protección principal la proporciona [Cloudflare Turnstile](https://www.cloudflare.com/application-services/products/turnstile/), configurado en modo _managed_ con `appearance: "interaction-only"`. En la mayoría de los casos, la verificación se realiza sin intervención del usuario. El widget solo aparece cuando Cloudflare considera necesaria alguna comprobación adicional.

El script de Turnstile se carga exclusivamente en la página de contacto. El navegador genera un token que se envía junto con el mensaje y que la función verifica mediante la API `siteverify` de Cloudflare. Cada token solo puede utilizarse una vez, por lo que reinicio el widget después de cada intento de envío. También he añadido un tiempo de espera máximo para los casos en los que una extensión del navegador bloquea el script. En lugar de dejar el formulario esperando indefinidamente, muestro un mensaje que explica lo ocurrido.

Uno de los requisitos fundamentales era mantener la CSP existente. Para integrar Turnstile solo necesité añadir dos permisos, ambos limitados al dominio de Cloudflare:

```text
script-src 'self' https://challenges.cloudflare.com
frame-src https://challenges.cloudflare.com
```

La directiva `form-action` sigue configurada como `'none'`, ya que el formulario no utiliza el envío HTML tradicional: los datos se transmiten a la función mediante `fetch`.

A estos controles se suma una regla de limitación de peticiones, o _rate limiting_, en el [firewall de Vercel](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting). Esta regla bloquea las direcciones IP que realizan más de cinco peticiones en diez minutos. El firewall actúa antes de que la petición llegue a la función, así que las solicitudes bloqueadas ni siquiera ejecutan el código del servidor.

En conjunto, las comprobaciones más sencillas filtran parte de las solicitudes automatizadas, Turnstile se ocupa de los casos más complejos y el firewall limita los envíos repetidos. Además, cuando los primeros controles detectan un envío sospechoso, la función devuelve una respuesta aparentemente correcta para no dar pistas a los bots sobre cómo evitar la protección.

Con esta combinación, el formulario está protegido y la mayoría de las personas pueden utilizarlo sin notar que hay varias verificaciones funcionando por detrás.

## Recibir los mensajes con Brevo

Una vez validado el mensaje, necesitaba enviarlo a mi correo. Elegí [Brevo](https://www.brevo.com/), un servicio europeo que también me gustaría utilizar para una futura newsletter. La integración llama directamente a su API HTTP, sin añadir un SDK para una única petición.

Cada mensaje me llega como un correo de texto plano. El remitente es una dirección de mi dominio, autenticada mediante DKIM y protegida por una política DMARC, mientras que el campo `Reply-To` contiene el correo de la persona que ha escrito. De este modo puedo responder directamente desde mi bandeja de entrada, sin tener que copiar direcciones manualmente.

Preferí no enviar correos automáticos de confirmación. Un formulario público que envía mensajes a direcciones introducidas libremente puede terminar utilizándose para mandar correos no deseados a terceros. No quería abrir esa posibilidad solo para confirmar que un mensaje se había recibido. La confirmación aparece directamente en la página cuando el envío termina correctamente.

Tampoco añado a los contactos de Brevo las direcciones recogidas mediante el formulario. Quien me escribe está solicitando una respuesta, y su correo se utiliza exclusivamente para esa finalidad. Si más adelante incorporo una newsletter, la suscripción tendrá su propio proceso.

## Conservar los datos y respetar la privacidad

Llegados a este punto, el formulario ya podía cumplir su función: recibir una solicitud, validarla y enviarme un correo. Sin embargo, también quería resolver qué ocurre con los datos después del envío, para evitar que permanezcan indefinidamente en una bandeja de entrada o una base de datos.

La primera decisión tenía que ver con la base jurídica del tratamiento. El formulario no utiliza el consentimiento para leer los mensajes y responderlos, porque estas actividades se basan en el interés legítimo previsto en el [artículo 6.1.f) del RGPD](https://eur-lex.europa.eu/legal-content/ES/TXT/HTML/?uri=CELEX:02016R0679-20160504). Cuando la consulta está relacionada con un posible encargo profesional, también pueden resultar aplicables las medidas precontractuales del artículo 6.1.b), siempre que se cumplan las condiciones correspondientes.

Por eso evité la típica casilla «Consiento el tratamiento de mis datos». En su lugar, muestro junto al formulario información resumida sobre privacidad, con un enlace a la política completa, y una casilla sin marcar por defecto que permite confirmar que se ha leído esa información.

También quería poder acreditar qué información había mostrado a cada persona en el momento de enviar el formulario. Para ello guardo, junto con cada mensaje, un registro que contiene el texto exacto de la información facilitada, su versión, la fecha y hora del envío, la página de origen y algunos datos técnicos. Para diseñar esta parte me sirvió como referencia un [artículo de AyudaWP](https://ayudawp.com/registro-consentimiento-cookies-formularios-pedidos/) sobre el registro de consentimientos e información de privacidad.

Hay un detalle importante en la implementación: el servidor obtiene el texto directamente de los archivos YAML con los que se generan las páginas. No acepta una copia enviada desde el navegador, porque un cliente modificado podría transmitir un texto distinto del que realmente se publicó. Además, el registro incluye un hash SHA-256 de su contenido para poder detectar posibles modificaciones posteriores.

En cuanto a la dirección IP, decidí conservar únicamente un hash HMAC-SHA-256 calculado mediante una clave secreta almacenada por separado. Esto permite comparar registros asociados a una misma IP sin guardar la dirección original. Aun así, sigue siendo un dato personal seudonimizado, por lo que se trata y conserva como tal.

### Dos bases de datos con distintos plazos de conservación

Para almacenar la información he utilizado [Neon](https://neon.tech/), con dos bases de datos independientes alojadas en Fráncfort, Alemania. La primera guarda los mensajes y la segunda conserva los registros de la información sobre privacidad mostrada a los usuarios. Cada una tiene sus propias credenciales y un identificador común permite relacionar cada mensaje con su registro.

La separación facilita la gestión porque ambos tipos de datos tienen finalidades y plazos de conservación distintos. He establecido **12 meses para los mensajes**, un periodo que considero suficiente para atender una consulta y continuar la conversación si alguien vuelve a escribirme más adelante. Los registros de privacidad se conservan durante **3 años**, para poder acreditar el cumplimiento de las obligaciones de transparencia incluso después de eliminar el mensaje. Es un plazo que he elegido teniendo en cuenta también la normativa española de protección de datos, no una duración que el RGPD imponga para cualquier tratamiento.

La siguiente cuestión era asegurarme de que los datos se eliminaran realmente cuando terminara su plazo de conservación. Para ello creé `api/cleanup.ts`, una función de Vercel que se ejecuta todas las noches a las 03:00 UTC mediante un [Cron Job](https://vercel.com/docs/cron-jobs):

```json
"crons": [{ "path": "/api/cleanup/", "schedule": "0 3 * * *" }]
```

La función ejecuta dos consultas `DELETE`, una por base de datos, aplicando el plazo correspondiente a cada una. El endpoint está protegido con `CRON_SECRET`, que Vercel envía en la cabecera `Authorization` de las peticiones programadas. Cualquier solicitud que no incluya el secreto correcto se rechaza.

También podría haber ejecutado la limpieza cada vez que llegara un nuevo mensaje, evitando el cron. El inconveniente es que, si el formulario no recibiera ninguna consulta durante meses, los datos caducados seguirían almacenados. Con una tarea programada, la eliminación no depende de la actividad de la web.

### Evitar que se pierdan los mensajes

Quedaba otra situación por resolver: ¿qué ocurre si Brevo no consigue enviar el correo o Neon deja de estar disponible temporalmente?

La función inicia el almacenamiento y el envío al mismo tiempo, utilizando `Promise.allSettled`:

```ts
const [kept, delivered] = await Promise.allSettled([
  keep(submission, request),
  deliver(submission),
])

if (kept.status === "rejected" && delivered.status === "rejected") {
  return json({ error: "generic" }, 502)
}
```

Considero que la operación se ha completado si al menos una de las dos tareas termina correctamente. Si el mensaje queda guardado en la base de datos, puedo recuperarlo aunque falle el envío del correo. Si llega el email pero la base de datos no responde, tampoco he perdido su contenido. En cualquier caso, los errores quedan registrados en los logs de Vercel.

Esto evita además mostrar un mensaje de error cuando la consulta ya ha llegado por alguno de los dos canales, algo que podría llevar a la persona a repetir el envío y generar duplicados.

## Avisar a los usuarios cuando cambia la política de privacidad

Mientras actualizaba la política de privacidad para documentar el nuevo formulario, me surgió otra pregunta: ¿qué pasará cuando tenga que modificarla de nuevo?

Las personas que me escriben reciben información concreta sobre cómo se tratan sus datos, y conservo un registro de la versión que han leído. Si en el futuro cambiara el responsable del tratamiento, añadiera una finalidad nueva o modificara de forma significativa la gestión de los datos ya recogidos, podría ser necesario informarles antes de que esos cambios entren en vigor.

Las [directrices europeas sobre transparencia](https://ec.europa.eu/newsroom/article29/items/622227) distinguen entre cambios meramente formales y modificaciones sustanciales. Corregir una errata no exige necesariamente avisar a cada persona, pero un cambio que afecte de manera relevante a sus derechos o expectativas sí puede requerir una comunicación específica.

Por eso preparé un pequeño sistema para enviar avisos cuando sea necesario, en lugar de mandar automáticamente un correo cada vez que modifique una frase de la política.

Cada comunicación se define en un archivo YAML con el asunto y el texto del mensaje en los tres idiomas de la web. Después, un script permite consultar el número de destinatarios, realizar una prueba y enviar finalmente el aviso:

```sh
bun run notify notices/2027-01-nuovo-hosting.yaml
bun run notify notices/2027-01-nuovo-hosting.yaml --test
bun run notify notices/2027-01-nuovo-hosting.yaml --send
```

El saludo, la explicación de por qué se recibe el correo, el enlace a la política actualizada y las indicaciones para ejercer los derechos se añaden automáticamente. Cada persona recibe un mensaje individual en el idioma que utilizó al rellenar el formulario, sin que su dirección sea visible para los demás destinatarios.

El script se ejecuta en mi ordenador, pero el envío lo gestiona `api/notify.ts` en Vercel. Así, las credenciales de Brevo y de las bases de datos permanecen en las variables de entorno del servidor. El endpoint está protegido por un secreto específico y utiliza una clave de idempotencia para reducir el riesgo de enviar el mismo aviso dos veces cuando hay que repetir una petición tras un error.

También queda registrada la ejecución de cada comunicación: cuándo se realizó el envío, a qué versión de la política de privacidad se refería y cuántos correos se enviaron. Ese registro no almacena las direcciones de los destinatarios.

Probablemente no sea una funcionalidad que utilice a menudo, pero prefiero tenerla preparada a tener que reconstruir manualmente la lista de personas afectadas cuando llegue el momento.

## El resultado

El formulario de contacto ya funciona sin haber tenido que modificar la arquitectura estática de la web. Astro sigue generando las páginas y las Vercel Functions se ocupan únicamente de las operaciones que necesitan ejecutarse en el servidor: recibir mensajes, almacenarlos, eliminarlos cuando caducan y enviar posibles comunicaciones sobre privacidad.

Para reducir el spam he combinado varias comprobaciones, Cloudflare Turnstile y el firewall de Vercel. La CSP sigue siendo estricta, con las excepciones mínimas necesarias para el widget de verificación. Los mensajes se envían mediante Brevo y se almacenan en Neon, por separado de los registros que documentan la información sobre privacidad mostrada a los usuarios.

Lo que más me interesaba era poder gestionar todo el ciclo de vida de los datos, desde su recogida hasta su eliminación, sin depender de tareas manuales. Ahora el formulario puede conservar la información necesaria, aplicar los plazos de conservación establecidos y comunicar cambios relevantes si en algún momento hace falta.

Todavía me queda una pequeña mejora pendiente: eliminar la dirección de correo que aparece directamente en el HTML de la página de inicio y generarla mediante JavaScript en el navegador para dificultar su recogida automatizada.

Más adelante también me gustaría añadir una newsletter. Podré reutilizar parte de esta infraestructura, especialmente Brevo, Turnstile y el sistema de registros, aunque en ese caso la suscripción requerirá un consentimiento específico y una doble confirmación. Las direcciones recogidas a través del formulario de contacto seguirán completamente separadas.

Mientras tanto, ya puedes utilizar el nuevo formulario desde la [página de contacto](/contacto/).
