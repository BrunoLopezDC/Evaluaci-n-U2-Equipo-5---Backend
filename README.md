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
- encryptedPrivateKey: clave privada cifrada con AES-GCM derivada de la contraseña del usuario
- contacts: array de IDs de contactos
- sentMessages: relación con mensajes enviados
- receivedMessages: relación con mensajes recibidos
- createdAt: fecha de creación
- updatedAt: fecha de última actualización

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
2. La clave pública se almacena en la base de datos en formato PEM
3. La clave privada se cifra con AES-GCM derivada de la contraseña del usuario mediante PBKDF2
4. La clave privada cifrada se almacena en la base de datos
5. Durante el login, se descifra la clave privada usando la contraseña del usuario
6. La clave privada descifrada se guarda temporalmente en localStorage del navegador
7. Se utiliza para firmar acciones críticas y descifrar mensajes recibidos

### Derivación de Claves (PBKDF2)

Para cifrar la clave privada del usuario se implementa derivación de claves segura:

1. Se deriva una clave AES-256 desde la contraseña usando PBKDF2
2. Parámetros: 100,000 iteraciones, SHA-256, salt estático (en producción debe ser único por usuario)
3. La clave derivada cifra la privateKey con AES-256-GCM
4. Se genera un IV único de 96 bits para cada cifrado
5. El resultado cifrado se almacena en la base de datos
6. Solo con la contraseña correcta se puede recuperar la clave privada

## Flujos de Cifrado

### Flujo 1: Registro con Persistencia de Claves

```
[Cliente]
1. Generar par de claves RSA-PSS (2048 bits)
2. Exportar clave pública a formato SPKI
3. Derivar clave AES desde la contraseña (PBKDF2)
4. Cifrar clave privada con AES-GCM
5. Crear sobre digital con: username, password, email, publicKey, encryptedPrivateKey
         ↓
[Servidor]
6. Descifrar sobre digital
7. Hashear contraseña con bcrypt
8. Guardar: username, email, passwordHash, publicKey, encryptedPrivateKey
9. Generar token JWT
```

### Flujo 2: Login con Recuperación de Claves

```
[Cliente]
1. Crear sobre digital con: username, password
         ↓
[Servidor]
2. Descifrar sobre digital
3. Validar usuario y contraseña
4. Recuperar encryptedPrivateKey de la base de datos
5. Enviar: token JWT, userId, username, publicKey, encryptedPrivateKey
         ↓
[Cliente]
6. Derivar clave AES desde la contraseña ingresada (PBKDF2)
7. Descifrar encryptedPrivateKey con AES-GCM
8. Guardar par de claves en localStorage
9. Usuario puede enviar mensajes y agregar contactos
```

### Flujo 3: Envío de Mensajes (Zero Knowledge + Firma)

```
[Cliente - Remitente]
1. Obtener clave pública del destinatario
2. Generar llave AES temporal
3. Cifrar mensaje con AES-256-CBC e IV único
4. Cifrar llave AES con clave pública del destinatario (RSA-OAEP)
5. Firmar mensaje original con clave privada propia (RSA-PSS)
6. Enviar: {recipientId, encryptedData, encryptedKey, iv, signature, originalMessage}
         ↓
[Servidor]
7. Usar clave pública del remitente para verificar firma sobre originalMessage
8. Guardar mensaje cifrado en base de datos (sin originalMessage)
9. NO descifra el contenido
         ↓
[Cliente - Destinatario]
10. Descargar mensaje cifrado del servidor
11. Usar clave privada propia para descifrar encryptedKey
12. Usar llave AES descifrada para descifrar contenido
13. Verificar firma del remitente
```

### Flujo 4: Verificación de Identidad (Firma Digital)

```
[Cliente]
1. Generar challenge: ADD_CONTACT_{username}_{timestamp}
2. Firmar challenge con clave privada (RSA-PSS)
3. Enviar: {challenge, signature}
         ↓
[Servidor]
4. Obtener clave pública del usuario desde base de datos
5. Verificar firma del challenge
6. Si es válida, proceder con la acción
7. Agregar contacto a la lista del usuario
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
- Parámetros (cifrados con sobre digital): username, password, email, publicKey, encryptedPrivateKey
- Respuesta: { token, userId, username, publicKey }

**POST /auth/login**
- Parámetros (cifrados con sobre digital): username, password
- Respuesta: { token, userId, username, publicKey, encryptedPrivateKey }

**GET /auth/public-key**
- Respuesta: clave pública del servidor en formato PEM

### Usuarios

**GET /users/public-key/:username**
- Parámetros: username
- Respuesta: clave pública del usuario en formato PEM (texto plano)

**GET /users/public-key-by-id/:id**
- Parámetros: id (número)
- Respuesta: clave pública del usuario en formato PEM (texto plano)

**POST /users/add-contact/:username**
- Requiere: JWT Bearer token
- Parámetros: challenge, signature
- Respuesta: { message, contactId }

### Mensajes

**POST /messages/send**
- Requiere: JWT Bearer token
- Parámetros: recipientId, encryptedData, encryptedKey, iv, signature, originalMessage
- Respuesta: { message, messageId }

## Seguridad

### Buenas Prácticas Implementadas

- Contraseñas hasheadas con bcrypt y factor de trabajo de 10
- Claves RSA de 2048 bits
- AES-256-CBC para cifrado de mensajes
- AES-256-GCM para cifrado de claves privadas
- PBKDF2 con 100,000 iteraciones para derivación de claves
- IV único generado aleatoriamente para cada operación de cifrado
- Firma digital RSA-PSS con salt length de 32 bytes
- Tokens JWT con expiración configurable
- Validación de firma en acciones críticas
- Modelo Zero Knowledge para almacenamiento de mensajes
- Persistencia segura de claves privadas cifradas
- Verificación de identidad mediante challenge-response

### Arquitectura de Seguridad Multicapa

1. **Capa de Transporte**: Sobre digital (AES + RSA-OAEP)
2. **Capa de Autenticación**: JWT + bcrypt
3. **Capa de Almacenamiento**: AES-256-CBC (mensajes) + AES-256-GCM (claves privadas)
4. **Capa de No Repudio**: Firma digital RSA-PSS

### Limitaciones de Seguridad Actuales

- Salt estático en PBKDF2 (debe ser único por usuario en producción)
- Claves privadas descifradas guardadas en localStorage (temporal)
- No implementado HTTPS en desarrollo
- Sin rate limiting en endpoints
- Sin implementación de refresh tokens
- Sin rotación de claves

## Testing

Verificación de requisitos:

1. **Hash bcrypt en BD**: 
   ```sql
   SELECT "passwordHash" FROM "User" WHERE username = 'testuser';
   -- Debe iniciar con $2b$10$
   ```

2. **Contenido cifrado**:
   ```sql
   SELECT "encryptedContent" FROM "Message" WHERE id = 1;
   -- Debe ser ilegible (Base64)
   ```

3. **Clave privada cifrada**:
   ```sql
   SELECT "encryptedPrivateKey" FROM "User" WHERE username = 'testuser';
   -- Debe ser un JSON con {data, iv}
   ```

4. **Firma digital válida**: 
   - Logs del backend al agregar contacto: "Firma digital válida"

5. **Sobre digital**: 
   - DevTools Network para verificar payload cifrado en tránsito

## Mejoras Futuras

- Implementar salt único por usuario en PBKDF2
- Rotación automática de claves
- Sistema de backup de claves
- Implementación de Perfect Forward Secrecy
- Rate limiting y throttling
- Auditoría de acciones críticas
- Implementación de 2FA
- Refresh tokens

## Contribuidores

- Bruno López
- Mauricio
- Josué
- Abraham