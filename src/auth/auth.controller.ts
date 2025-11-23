import { Controller, Post, Get, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CryptoService } from '../crypto/crypto.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private cryptoService: CryptoService,
  ) {}

  @Post('register')
  async register(@Body() envelope: any) {
    console.log('📝 Register - Envelope recibido:', Object.keys(envelope));
    return this.authService.register(envelope);
  }

  @Post('login')
  async login(@Body() envelope: any) {
    console.log('🔐 Login - Envelope recibido:', Object.keys(envelope));
    return this.authService.login(envelope);
  }

  @Get('public-key')
  getPublicKey() {
    return this.cryptoService.getPublicKey();
  }
}