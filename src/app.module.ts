import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MessagesModule } from './messages/messages.module';
import { PrismaModule } from './prisma/prisma.module';
import { CryptoService } from './crypto/crypto.service';

@Module({
  imports: [AuthModule, UsersModule, MessagesModule, PrismaModule],
  controllers: [AppController],
  providers: [AppService, CryptoService],
})
export class AppModule {}