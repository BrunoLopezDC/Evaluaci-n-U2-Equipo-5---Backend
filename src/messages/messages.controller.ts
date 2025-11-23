import { Controller, Post, UseGuards, Request, Body } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MessagesService } from './messages.service';

@Controller('messages')
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Post('send')
  @UseGuards(JwtAuthGuard)
  async sendMessage(@Request() req: any, @Body() body: any) {
    const senderId = req.user.sub;
    
    console.log('===========================================');
    console.log('POST /messages/send');
    console.log('Remitente:', req.user.username, '(ID:', senderId, ')');
    console.log('Destinatario ID:', body.recipientId);
    console.log('Mensaje cifrado:', body.encryptedData);
    console.log('Llave cifrada:', body.encryptedKey);
    console.log('Firma:', body.signature ? 'presente' : 'ausente');
    console.log('Mensaje original:', body.originalMessage || 'no enviado');
    console.log('===========================================');

    return this.messagesService.sendMessage(
      senderId,
      body.recipientId,
      body.encryptedData,
      body.encryptedKey,
      body.iv,
      body.signature,
      body.originalMessage,
    );
  }
}