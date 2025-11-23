import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../crypto/crypto.service';

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private cryptoService: CryptoService,
  ) {}

  async sendMessage(
    senderId: number,
    recipientId: number,
    encryptedContent: string,
    encryptedKey: string,
    iv: string,
    signature?: string,
    originalMessage?: string,
  ) {
    if (!senderId || !recipientId || !encryptedContent || !encryptedKey || !iv) {
      throw new BadRequestException('Faltan parámetros requeridos');
    }

    console.log('Remitente ID:', senderId);
    console.log('Destinatario ID:', recipientId);
    console.log('Mensaje cifrado:', encryptedContent);
    console.log('Llave cifrada:', encryptedKey);
    console.log('IV:', iv);

    const sender = await this.prisma.user.findUnique({
      where: { id: senderId },
    });

    if (!sender) {
      throw new BadRequestException('Remitente no encontrado');
    }

    const recipient = await this.prisma.user.findUnique({
      where: { id: recipientId },
    });

    if (!recipient) {
      throw new BadRequestException('Destinatario no encontrado');
    }

    if (signature && signature.trim() && originalMessage) {
      try {
        console.log('Verificando firma digital...');
        console.log('Mensaje original:', originalMessage);
        console.log('Clave pública del remitente:', sender.publicKey);
        
        const isSignatureValid = this.cryptoService.verifySignature(
          sender.publicKey,
          originalMessage,
          signature
        );

        if (!isSignatureValid) {
          console.log('Error: Firma digital inválida');
          throw new BadRequestException('Firma digital inválida');
        }
        console.log('Firma digital válida');
      } catch (error) {
        console.log('Error verificando firma:', error.message);
        throw new BadRequestException('Error al verificar firma digital: ' + error.message);
      }
    } else {
      console.log('Sin firma digital o mensaje original');
    }

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

    console.log('Mensaje guardado cifrado en base de datos');
    console.log('Message ID:', message.id);

    return {
      message: 'Mensaje enviado y almacenado cifrado',
      messageId: message.id,
    };
  }
}