# Chat Seguro para Periodistas - Backend

Backend de aplicación con implementación de 4 capas de seguridad criptográfica para comunicación segura entre periodistas y fuentes de información.

## Requisitos Implementados

### 1. Login Seguro (Autenticación)
Implementación de autenticación con hashing de contraseñas utilizando bcrypt. Las contraseñas se almacenan hasheadas en la base de datos, nunca en texto plano.

### 2. Datos en Reposo (Almacenamiento Simétrico)
Cifrado de mensajes almacenados en la base de datos utilizando AES-256-CBC. El sistema implementa un modelo Zero Knowledge donde el servidor no puede descifrar los mensajes, solo el destinatario que posee la clave privada correspondiente.

### 3. Autenticidad y No Repudio (Firma Asimétrica)
Verificación de identidad mediante firma digital RSA-PSS. Al realizar acciones críticas como agregar contactos, se valida la firma del usuario para garantizar que la acción proviene realmente de él y no de un impostor.

### 4. Defensa en Profundidad (Comunicación Híbrida)
Implementación de sobre digital que combina criptografía simétrica (AES-256-CBC) y asimétrica (RSA-OAEP). Todos los datos sensibles en tránsito utilizan este flujo de cifrado híbrido, independientemente de HTTPS.

## Arquitectura Técnica

### Stack Tecnológico
- NestJS: Framework backend
- Prisma ORM: Gestión de base de datos
- PostgreSQL: Base de datos relacional
- JWT: Autenticación stateless
- bcrypt: Hashing de contraseñas
- Node.js crypto: Operaciones criptográficas

### Estructura del Proyecto
```
src/
├── auth/
│   ├── auth.service.ts
│   ├── auth.controller.ts
│   ├── jwt.strategy.ts
│   └── jwt-auth.guard.ts
├── crypto/
│   └── crypto.service.ts
├── messages/
│   ├── messages.service.ts
│   ├── messages.controller.ts
│   └── messages.module.ts
├── users/
│   ├── users.service.ts
│   ├── users.controller.ts
│   └── users.module.ts
├── prisma/
│   └── prisma.service.ts
└── main.ts
```

### Modelos de Datos

**User**
- id: identificador único
- username: nombre de usuario único
- email: correo único
- passwordHash: contraseña hasheada con bcrypt
- publicKey: clave pública RSA-PSS en formato PEM
- contacts: array de IDs de contactos
- sentMessages: relación con mensajes enviados
- receivedMessages: relación con mensajes recibidos

**Message**
- id: identificador único
- senderId: ID del remitente
- recipientId: ID del destinatario
- encryptedContent: contenido cifrado con AES-256-CBC
- encryptedKey: llave AES cifrada con RSA-OAEP de la clave pública del destinatario
- iv: vector de inicialización único para cada mensaje
- signature: firma digital RSA-PSS del remitente
- timestamp: marca de tiempo de creación

## Gestión de Claves Criptográficas

### Clave Simétrica (AES-256)

Cada mensaje utiliza una clave AES-256 generada de forma aleatoria:

1. Se genera una nueva clave AES-256 para cada mensaje
2. Se utiliza un Vector de Inicialización (IV) único de 128 bits generado aleatoriamente
3. El contenido del mensaje se cifra con AES-256-CBC usando esta clave e IV
4. La clave AES se cifra con la clave pública RSA-OAEP del destinatario
5. Se envía: contenido_cifrado, clave_cifrada e IV al servidor

El servidor almacena estos tres componentes sin poder descifrar el contenido.

### Clave Asimétrica (RSA-PSS)

Cada usuario genera un par de claves RSA-PSS de 2048 bits:

1. Durante el registro, se genera el par de claves en el navegador del cliente
2. La clave pública se almacena en la base de datos
3. La clave privada se almacena en localStorage del cliente (solo en desarrollo/demostración)
4. Se utiliza para firmar acciones críticas y descifrar mensajes recibidos

### Derivación de Claves

Para operaciones futuras más avanzadas, la arquitectura está diseñada para permitir derivación de claves desde la contraseña del usuario, habilitando un modelo verdadero de Zero Knowledge sin necesidad de almacenar claves privadas en el servidor.

## Flujos de Cifrado

### Flujo 1: Login Seguro (Sobre Digital)

```
[Cliente]
1. Obtener clave pública del servidor
2. Generar llave AES temporal
3. Cifrar credenciales con AES-256-CBC
4. Cifrar llave AES con clave pública del servidor (RSA-OAEP)
5. Enviar: {encryptedData, encryptedKey, iv}
         ↓
[Servidor]
6. Usar clave privada RSA para descifrar encryptedKey
7. Usar llave AES descifrada para descifrar credenciales
8. Validar usuario y contraseña
9. Generar token JWT
```

### Flujo 2: Envío de Mensajes (Zero Knowledge + Firma)

```
[Cliente - Remitente]
1. Obtener clave pública del destinatario
2. Generar llave AES temporal
3. Cifrar mensaje con AES-256-CBC e IV único
4. Cifrar llave AES con clave pública del destinatario (RSA-OAEP)
5. Firmar mensaje con clave privada propia (RSA-PSS)
6. Enviar: {encryptedData, encryptedKey, iv, signature}
         ↓
[Servidor]
7. Usar clave pública del remitente para verificar firma
8. Guardar mensaje cifrado en base de datos
9. NO descifra el contenido
         ↓
[Cliente - Destinatario]
10. Descargar mensaje cifrado del servidor
11. Usar clave privada propia para descifrar encryptedKey
12. Usar llave AES descifrada para descifrar contenido
13. Verificar firma del remitente
```

### Flujo 3: Verificación de Identidad (Firma Digital)

```
[Cliente]
1. Generar challenge: ADD_CONTACT_{username}_{timestamp}
2. Firmar challenge con clave privada (RSA-PSS)
3. Enviar: {challenge, signature}
         ↓
[Servidor]
4. Obtener clave pública del usuario desde JWT
5. Verificar firma del challenge
6. Si es válida, proceder
7. Si el contacto existe, agregarlo
```

## Instalación

Requisitos previos:
- Node.js 20.19+ o 22.12+ (compatible con Prisma 5.x)
- PostgreSQL 12+
- npm o yarn

Pasos de instalación:

```bash
git clone https://github.com/BrunoLopezDC/Evaluaci-n-U2-Equipo-5---Backend.git
cd backend
npm install
npx prisma migrate deploy
npx prisma generate
npm run start:dev
```

## Configuración

Crear archivo .env en la raíz del proyecto:

```
DATABASE_URL="postgresql://usuario:password@localhost:5432/chatdb"
JWT_SECRET=tu_secret_muy_seguro_aqui
JWT_EXPIRATION=1d
```

## Endpoints Principales

### Autenticación

**POST /auth/register**
Parámetros: username, password, email, publicKey (cifrados con sobre digital)
Respuesta: token JWT

**POST /auth/login**
Parámetros: username, password (cifrados con sobre digital)
Respuesta: token JWT, userId

**GET /auth/public-key**
Respuesta: clave pública del servidor

### Usuarios

**GET /users/public-key/:username**
Parámetros: username
Respuesta: clave pública del usuario

**GET /users/public-key-by-id/:id**
Parámetros: id
Respuesta: clave pública del usuario

**POST /users/add-contact/:username**
Parámetros: challenge, signature (verificación de identidad)
Respuesta: confirmación de contacto agregado

### Mensajes

**POST /messages/send**
Parámetros: recipientId, encryptedData, encryptedKey, iv, signature
Respuesta: confirmación de envío

## Seguridad

### Buenas Prácticas Implementadas

- Contraseñas hasheadas con bcrypt y factor de trabajo de 10
- Claves RSA de 2048 bits
- AES-256-CBC para cifrado simétrico
- IV único generado aleatoriamente para cada mensaje
- Firma digital RSA-PSS con salt length de 32 bytes
- Tokens JWT con expiración configurable
- Validación de firma en acciones críticas
- Modelo Zero Knowledge para almacenamiento de mensajes

### Limitaciones de Seguridad Actuales

- Claves privadas almacenadas en localStorage (frontend)
- No implementado HTTPS en desarrollo
- Sin rate limiting en endpoints
- Sin implementación de refresh tokens

## Testing

Verificación de requisitos:

1. Hash bcrypt en BD: Query SQL a tabla User para verificar passwordHash con formato $2b$10$
2. Contenido cifrado: Query SQL a tabla Message para verificar encryptedContent ilegible
3. Firma digital válida: Logs del backend al agregar contacto
4. Sobre digital: DevTools Network para verificar payload cifrado en tránsito

## Contribuidores

Equipo 5

## Licencia

Proyecto educativo para fines de evaluación académica.