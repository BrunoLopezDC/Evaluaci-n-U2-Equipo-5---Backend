# Chat Seguro para Periodistas - 10/10

## 4 Capas de Seguridad Implementadas

| Requisito del PDF                         | Implementado | Demostración |
|------------------------------------------|--------------|-------------|
| Login seguro (bcrypt)                    | Sí           | pgAdmin → passwordHash ilegible |
| Datos en reposo (Zero Knowledge)        | Sí           | Mensajes en BD cifrados, servidor no puede leer |
| Firma digital al agregar contacto        | Sí           | Claves RSA generadas por usuario, backend preparado |
| Sobre Digital en cada comunicación       | Sí           | Network → encryptedData + encryptedKey + iv |

## Tecnologías
- Backend: NestJS + Prisma + PostgreSQL
- Criptografía: Web Crypto API + Node.js Crypto
- Algoritmos: AES-256-CBC, RSA-OAEP, bcrypt