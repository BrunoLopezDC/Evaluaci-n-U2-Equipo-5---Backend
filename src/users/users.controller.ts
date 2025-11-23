import { Controller, Get, Post, Param, UseGuards, Request, Body, BadRequestException, Header, Res } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';
import { CryptoService } from '../crypto/crypto.service';

@Controller('users')
export class UsersController {
  constructor(
    private usersService: UsersService,
    private cryptoService: CryptoService,
  ) {}

  @Get('public-key/:username')
  @Header('Content-Type', 'text/plain')
  async getPublicKey(@Param('username') username: string, @Res() res: Response) {
    const publicKey = await this.usersService.getPublicKey(username);
    return res.send(publicKey);
  }

  @Get('public-key-by-id/:id')
  @Header('Content-Type', 'text/plain')
  async getPublicKeyById(@Param('id') id: string, @Res() res: Response) {
    const publicKey = await this.usersService.getUserPublicKey(Number(id));
    return res.send(publicKey);
  }

  @Post('add-contact/:username')
  @UseGuards(JwtAuthGuard)
  async addContact(
    @Request() req: any,
    @Param('username') contactUsername: string,
    @Body() body: any,
  ) {
    const userId = req.user?.sub;
    console.log('===========================================');
    console.log('Request recibido en /add-contact');
    console.log('===========================================');
    console.log('Usuario autenticado (del JWT):', JSON.stringify(req.user));
    console.log('Usuario a agregar:', contactUsername);
    console.log('Body recibido:', body);

    if (!userId) {
      throw new BadRequestException('Usuario no autenticado');
    }

    let payload = body;
    if (body && body.encryptedData && body.encryptedKey && body.iv) {
      try {
        payload = await this.cryptoService.openEnvelope(body);
        console.log('Sobre digital desempaquetado:', payload);
      } catch (e) {
        console.error('Error desempaquetando sobre digital:', e);
        throw new BadRequestException('Sobre digital inválido');
      }
    }

    const challenge = payload?.challenge;
    const signature = payload?.signature;

    if (!challenge || !signature) {
      throw new BadRequestException('Faltan challenge o signature en la petición');
    }

    return this.usersService.addContact(userId, contactUsername, challenge, signature);
  }
}