## Prueba del microservicio de Logs

Actualmente la arquitectura permite enviar eventos desde el **Gateway** hacia el microservicio **Logs-MS** mediante TCP.

### 1. Levantar los servicios

Abrir una terminal para cada servicio:

```bash
cd user-ms
npm run start:dev
```

```bash
cd logs-ms
npm run start:dev
```

```bash
cd gateway
npm run start:dev
```

Puertos utilizados:

* Gateway HTTP: `3000`
* User-MS TCP: `3001`
* Logs-MS TCP: `3002`

### 2. Ejecutar una petición de prueba

Desde una cuarta terminal:

```bash
curl http://localhost:3000
```

El Gateway recibe la petición y emite un evento hacia `Logs-MS` con el patrón:

```ts
{ log: 'create' }
```

El evento contiene datos similares a:

```ts
{
  level: 'info',
  service: 'gateway',
  action: 'GET_HELLO',
  message: 'Prueba de comunicación Gateway -> Logs MS',
  eventTimestamp: new Date().toISOString()
}
```

### 3. Verificar Logs-MS

En la consola de `logs-ms` debería aparecer el log recibido con dos fechas:

```text
eventTimestamp → momento en que el Gateway generó el evento.
receivedAt     → momento en que Logs-MS recibió el evento.
```

Ejemplo:

```ts
{
  level: 'info',
  service: 'gateway',
  action: 'GET_HELLO',
  message: 'Prueba de comunicación Gateway -> Logs MS',
  eventTimestamp: 2026-08-15T19:55:10.120Z,
  receivedAt: 2026-08-15T19:55:10.174Z
}
```

El `CreateLogDto` valida actualmente los datos recibidos mediante `class-validator`.

**Estado actual:** comunicación `Gateway → Logs-MS` funcionando, validación del DTO funcionando y generación de timestamps funcionando. La persistencia de logs en base de datos queda pendiente para una próxima etapa.
