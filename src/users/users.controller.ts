import { Controller, Post, Body, UseGuards, Request, Param, Put, Get } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('public-key/:username')
  async getPublicKey(@Param('username') username: string) {
    return { publicKey: await this.usersService.getPublicKey(username) };
  }

  // ✅ Nuevo endpoint: Obtener clave pública por ID
  @Get('public-key-by-id/:id')
  async getPublicKeyById(@Param('id') id: string) {
    return { publicKey: await this.usersService.getPublicKeyById(Number(id)) };
  }

  @Post('add-contact/:username')
  @UseGuards(JwtAuthGuard)
  async addContact(@Request() req, @Param('username') username: string, @Body() body: any) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📨 Request recibido en /add-contact');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👤 Usuario autenticado (del JWT):', req.user);
    console.log('🎯 Usuario a agregar:', username);
    console.log('📦 Body recibido:', {
      challenge: body.challenge,
      signature: body.signature?.substring(0, 50) + '...',
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return this.usersService.addContact(
      req.user.userId,
      username,
      body.challenge,
      body.signature,
    );
  }

  @Put('update-public-key')
  @UseGuards(JwtAuthGuard)
  async updatePublicKey(@Request() req, @Body() body: { publicKey: string }) {
    return this.usersService.updatePublicKey(req.user.userId, body.publicKey);
  }
}