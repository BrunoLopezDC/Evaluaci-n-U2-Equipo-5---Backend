import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // HABILITAR CORS COMPLETO (permite OPTIONS y POST desde localhost:5173)
  app.enableCors({
    origin: 'http://localhost:5173',  // Solo permite tu frontend (seguridad)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',  // Incluye OPTIONS explícitamente
    credentials: true,  // Para cookies/tokens si los usas
    allowedHeaders: 'Content-Type, Authorization',  // Headers comunes
  });

  // Log para debug (opcional, quítalo después)
  console.log('CORS habilitado para http://localhost:5173');

  await app.listen(3000);
  console.log('Backend corriendo en http://localhost:3000');
}
bootstrap();