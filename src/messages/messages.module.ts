import { Module } from '@nestjs/common';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CryptoService } from '../crypto/crypto.service';

@Module({
  imports: [PrismaModule],
  controllers: [MessagesController],
  providers: [MessagesService, CryptoService],
})
export class MessagesModule {}