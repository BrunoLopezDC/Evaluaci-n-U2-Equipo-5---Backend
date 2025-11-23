import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  async sendMessage(
    senderId: number,
    recipientId: number,
    encryptedContent: string,
    encryptedKey: string,
    iv: string,
    signature?: string,
  ) {
    const message = await this.prisma.message.create({
      data: {
        senderId,
        recipientId,
        encryptedContent,
        encryptedKey,
        iv, 
        signature: signature || '',
      },
    });

    console.log('💾 Mensaje guardado CIFRADO en BD (Zero Knowledge)');
    console.log('📝 Message ID:', message.id);
    
    return { 
      message: 'Mensaje enviado y almacenado cifrado', 
      messageId: message.id 
    };
  }
}