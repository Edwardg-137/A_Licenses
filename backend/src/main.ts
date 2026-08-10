import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('PermisoGT API')
    .setDescription(
      'API REST del sistema de expedientes digitales municipales (MVP L-01 / F08). ' +
        'Autenticación JWT Bearer; la mayoría de endpoints requieren rol. ' +
        'La verificación pública de licencias no exige token.',
    )
    .setVersion('0.1.0')
    .addBearerAuth()
    .addTag('auth', 'Registro, login y refresh')
    .addTag('users', 'Gestión de usuarios (Admin)')
    .addTag('applications', 'Expedientes y flujo')
    .addTag('documents', 'Carga y descarga de documentos')
    .addTag('review', 'Revisión técnica y correcciones')
    .addTag('inspections', 'Alineación y recepción de obra')
    .addTag('payments', 'Tasa municipal y pago')
    .addTag('licenses', 'Emisión y verificación de licencias')
    .addTag('notifications', 'Notificaciones in-app')
    .addTag('reports', 'Métricas del dashboard (Admin)')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
  console.log(`PermisoGT API escuchando en http://localhost:${port}/api`);
  console.log(`Swagger UI: http://localhost:${port}/api/docs`);
}

bootstrap();
