import { Controller, Post, Body, Get } from '@nestjs/common';
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
    const dto = await this.cryptoService.openEnvelope(envelope);
    return this.authService.register(dto);
  }

  @Post('login')
async login(@Body() envelope: any) {
  console.log('📦 Sobre cifrado recibido:', {
    encryptedData: envelope.encryptedData.substring(0, 50) + '...',
    encryptedKey: envelope.encryptedKey.substring(0, 50) + '...',
  });
  
  const dto = await this.cryptoService.openEnvelope(envelope);
  
  console.log('🔓 Datos descifrados:', dto);
  
  return this.authService.login(dto);
}

  @Get('public-key')
  getPublicKey() {
    return this.cryptoService.getPublicKey();
  }
}