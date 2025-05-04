import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable validation pipe
  app.useGlobalPipes(new ValidationPipe());

  // Configure Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Naira Raid API')
    .setDescription('The Naira Raid game API documentation')
    .setVersion('1.0')
    .addTag('player-progress', 'Player progression system')
    .addTag('inventory', 'Inventory management')
    .addTag('daily-missions', 'Daily missions system')
    .addTag('battle-royale', 'Battle Royale mode and multiplayer')
    .build();

  // CORS with credentials support
  app.enableCors({
      origin: [
        'http://localhost:5500', 
        'http://127.0.0.1:5500', 
        'https://rabbitholegames.africa',
        'https://www.rabbitholegames.africa',
        // Add your frontend domain with both www and non-www versions
        process.env.FRONTEND_URL || 'http://localhost:3000'
      ],
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      // credentials: true,
      allowedHeaders: 'Origin,X-Requested-With,Content-Type,Accept,Authorization',
      exposedHeaders: 'Content-Disposition',
  });

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
}
bootstrap();
