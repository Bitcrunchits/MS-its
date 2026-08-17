# Upload-MS — Guía rápida de prueba

Este README documenta el estado actual del flujo de upload seguro implementado entre **Gateway** y **Upload-MS**.

## Arquitectura actual

```text
Frontend / curl
      |
      | HTTP multipart/form-data
      v
Gateway
      |
      | Multer
      | tamaño <= 10 MB
      | extensión permitida
      | MIME permitido
      | genera UUID
      v
uploads/quarantine/
      |
      | metadata por TCP (lo genera el GATEWAY en upload.controller.ts)
      v
Upload-MS ----> revisa el contenido un poco mas profundo y GENERA ESTADOS.
      |
      | firma / magic bytes
      | estructura PDF con pdf-lib
      |
      +---- REJECTED ----------------> Gateway -> unlink() -> eliminado
      |
      +---- STRUCTURE_VALIDATED -----> Gateway -> rename() -> verified/
```

## Puertos utilizados

```text
Gateway    HTTP   3000
User-MS    TCP    3001
Logs-MS    TCP    3002
Upload-MS  TCP    3003
```

## Dependencias relevantes

En `gateway`:

```bash
npm install multer
npm install --save-dev @types/multer @types/express
```

En `upload-ms`:

```bash
npm install @nestjs/microservices
npm install pdf-lib
```

## Carpetas del Gateway

El Gateway debe tener:

```text
gateway/
└── uploads/
    ├── quarantine/
    └── verified/
```

Si no existen:

```bash
cd gateway
mkdir -p uploads/quarantine
mkdir -p uploads/verified
```

## Levantar los servicios

Abrir terminales separadas.

### Gateway

```bash
cd gateway
npm run start:dev
```

### Upload-MS

```bash
cd upload-ms
npm run start:dev
```

Para probar únicamente el upload no es necesario interactuar directamente con User-MS o Logs-MS, salvo que el Gateway actual dependa de que estén levantados para otras rutas.

---

# Pruebas

## 1. PDF real

Usar un PDF válido, por ejemplo:

```text
archivo.pdf
```

Desde la carpeta donde se encuentra:

```bash
curl -X POST \
  -F "file=@archivo.pdf" \
  http://localhost:3000/upload
```

### Respuesta esperada

Algo similar a:

```json
{
  "uuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "declaredMime": "application/pdf",
  "detectedType": "PDF",
  "signature": "%PDF-",
  "pages": 5,
  "status": "STRUCTURE_VALIDATED"
}
```

### Resultado físico esperado

El archivo primero entra en:

```text
gateway/uploads/quarantine/
```

Luego, al superar firma y estructura, el Gateway lo mueve a:

```text
gateway/uploads/verified/
```

Comprobar desde `gateway`:

```bash
ls -lh uploads/quarantine/
ls -lh uploads/verified/
```

El UUID nuevo debe aparecer en `verified/` y ya no en `quarantine/`.

En la consola del Gateway debe aparecer algo similar a:

```text
Archivo validado y movido a verified:
/.../gateway/uploads/verified/UUID.pdf
```

---

## 2. Archivo TXT normal

Crear:

```bash
echo "archivo de prueba" > prueba.txt
```

Intentar subirlo:

```bash
curl -X POST \
  -F "file=@prueba.txt" \
  http://localhost:3000/upload
```

### Resultado esperado

El Gateway debe rechazarlo antes de escribirlo en cuarentena:

```json
{
  "message": "Formato de archivo no permitido",
  "error": "Bad Request",
  "statusCode": 400
}
```

No debe aparecer ningún UUID nuevo en:

```text
uploads/quarantine/
uploads/verified/
```

---

## 3. Archivo de texto disfrazado de PDF

Crear un archivo que se llame `.pdf` pero cuyo contenido sea texto:

```bash
echo "Esto no es un PDF, podría ser contenido malicioso" > falso.pdf
```

Subirlo:

```bash
curl -X POST \
  -F "file=@falso.pdf;type=application/pdf" \
  http://localhost:3000/upload
```

También puede funcionar sin indicar explícitamente el MIME:

```bash
curl -X POST \
  -F "file=@falso.pdf" \
  http://localhost:3000/upload
```

### Qué debe ocurrir

El Gateway puede aceptar inicialmente:

```text
extensión .pdf              ✓
MIME application/pdf        ✓
```

Pero Upload-MS lee los primeros 5 bytes.

Firma esperada:

```text
%PDF-
```

Firma real:

```text
Esto 
```

### Respuesta esperada

```json
{
  "uuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "declaredMime": "application/pdf",
  "detectedType": "UNKNOWN",
  "signature": "Esto ",
  "status": "REJECTED",
  "reason": "La firma del archivo no corresponde a un PDF"
}
```

### Resultado físico esperado

Gateway debe eliminarlo de cuarentena:

```text
REJECTED
   |
   v
unlink()
   |
   v
ELIMINADO
```

En la consola del Gateway:

```text
Archivo rechazado y eliminado de cuarentena:
/.../gateway/uploads/quarantine/UUID.pdf
```

Comprobar:

```bash
ls -lh uploads/quarantine/
```

El UUID rechazado no debe existir.

---

## 4. PDF con firma correcta pero estructura falsa

Esta prueba demuestra que **magic bytes no son suficientes**.

Crear:

```bash
printf '%%PDF-1.7\nEsto no es realmente un PDF\n' > falso-estructural.pdf
```

Verificar el contenido inicial:

```bash
head falso-estructural.pdf
```

Debe comenzar con:

```text
%PDF-1.7
```

Subir:

```bash
curl -X POST \
  -F "file=@falso-estructural.pdf;type=application/pdf" \
  http://localhost:3000/upload
```

O:

```bash
curl -X POST \
  -F "file=@falso-estructural.pdf" \
  http://localhost:3000/upload
```

### Qué debe ocurrir

Primera capa:

```text
extensión .pdf        ✓
MIME PDF              ✓
firma %PDF-           ✓
```

Segunda capa:

```text
PDFDocument.load()
      |
      v
estructura inválida   ✗
```

### Respuesta esperada

```json
{
  "uuid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "declaredMime": "application/pdf",
  "detectedType": "PDF",
  "signature": "%PDF-",
  "status": "REJECTED",
  "reason": "La estructura interna del PDF no es válida"
}
```

Gateway debe eliminarlo de cuarentena.

---

# Resumen de resultados esperados

| Prueba | Gateway básico | Firma | Estructura | Resultado | Destino |
|---|---|---|---|---|---|
| PDF real | OK | OK | OK | `STRUCTURE_VALIDATED` | `verified/` |
| TXT | REJECT | — | — | HTTP 400 | no se guarda |
| TXT renombrado `.pdf` | OK | FAIL | — | `REJECTED` | eliminado |
| `%PDF-` falso | OK | OK | FAIL | `REJECTED` | eliminado |

---

# Validación implementada en Upload-MS

## Firma PDF

```ts
const signature = fileBuffer
  .subarray(0, 5)
  .toString('ascii');

if (signature !== '%PDF-') {
  return {
    uuid: data.uuid,
    declaredMime: data.mimetype,
    detectedType: 'UNKNOWN',
    signature,
    status: 'REJECTED',
    reason: 'La firma del archivo no corresponde a un PDF',
  };
}
```

## Estructura PDF

```ts
try {
  const pdf = await PDFDocument.load(fileBuffer);

  const pages = pdf.getPageCount();

  return {
    uuid: data.uuid,
    declaredMime: data.mimetype,
    detectedType: 'PDF',
    signature,
    pages,
    status: 'STRUCTURE_VALIDATED',
  };
} catch (error) {
  return {
    uuid: data.uuid,
    declaredMime: data.mimetype,
    detectedType: 'PDF',
    signature,
    status: 'REJECTED',
    reason: 'La estructura interna del PDF no es válida',
  };
}
```

---

# Comportamiento del Gateway según el estado

## REJECTED

```ts
if (validationResult.status === 'REJECTED') {
  await unlink(quarantinePath);
}
```

Resultado:

```text
quarantine -> eliminado
```

## STRUCTURE_VALIDATED

```ts
if (
  validationResult.status === 'STRUCTURE_VALIDATED'
) {
  await rename(
    quarantinePath,
    verifiedPath,
  );
}
```

Resultado:

```text
quarantine -> verified
```

---

# Importante

`STRUCTURE_VALIDATED` significa actualmente:

```text
firma PDF válida
+
estructura PDF interpretable
```

No significa que se haya realizado:

```text
antivirus
análisis de malware
CDR
análisis de JavaScript embebido
```

Para el alcance actual del prototipo, un PDF que supera firma y estructura se mueve a `verified/`.

---

# Próximos pasos previstos

- MongoDB en Upload-MS.
- Registrar UUID, usuario, nombre original, MIME, tamaño, fechas y estado.
- Asociar el upload al usuario autenticado.
- Validación específica de PNG/JPG.
- Validación específica de DOCX/XLSX.
- Endpoint seguro para descargar únicamente archivos aprobados.
- Docker Volume persistente para producción/VPS.
- Integración futura con Logs-MS.
- Antivirus/scanner si se aumenta el nivel de seguridad.
