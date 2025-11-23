import { Controller, Post, Body, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../crypto/crypto.service';

@Controller('messages')
export class MessagesController {
  constructor(
    private messagesService: MessagesService,
    private prisma: PrismaService,
    private cryptoService: CryptoService,
  ) {}

  @Post('send')
  @UseGuards(JwtAuthGuard)
  async send(@Request() req, @Body() body: any) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📨 Envío de mensaje (Zero Knowledge)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👤 Remitente:', req.user.username, '(ID:', req.user.userId, ')');
    console.log('🎯 Destinatario ID:', body.recipientId);
    console.log('📦 Mensaje cifrado (primeros 50 chars):', body.encryptedData?.substring(0, 50) + '...');
    console.log('🔑 Llave cifrada (primeros 50 chars):', body.encryptedKey?.substring(0, 50) + '...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // ✅ Verificar firma digital (Requisito #3)
    if (body.signature) {
      const sender = await this.prisma.user.findUnique({ 
        where: { id: req.user.userId } 
      });

      // ✅ Verificar que el usuario existe
      if (!sender || !sender.publicKey) {
        throw new UnauthorizedException('Usuario no encontrado o sin clave pública');
      }
      
      const isValid = this.cryptoService.verifySignature(
        sender.publicKey,
        body.encryptedData,
        body.signature
      );

      if (!isValid) {
        console.error('❌ Firma digital inválida');
        throw new UnauthorizedException('Firma digital inválida');
      }
      
      console.log('✅ Firma digital verificada correctamente');
    }

    // ✅ Guardar mensaje CIFRADO (Zero Knowledge)
    return this.messagesService.sendMessage(
      req.user.userId,
      body.recipientId,
      body.encryptedData,
      body.encryptedKey,
      body.iv,
      body.signature,
    );
  }
}