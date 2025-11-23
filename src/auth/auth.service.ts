import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../crypto/crypto.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private cryptoService: CryptoService,
  ) { }

  private formatPublicKey(pubKeyBase64: string): string {
    try {
      const cleanBase64 = pubKeyBase64
        .replace(/-----BEGIN PUBLIC KEY-----/g, '')
        .replace(/-----END PUBLIC KEY-----/g, '')
        .replace(/\n/g, '')
        .trim();

      const binaryString = Buffer.from(cleanBase64, 'base64').toString('binary');

      if (binaryString.includes('BEGIN PUBLIC KEY')) {
        return pubKeyBase64;
      }

      const formattedKey = cleanBase64.match(/.{1,64}/g)?.join('\n') || cleanBase64;

      return `-----BEGIN PUBLIC KEY-----\n${formattedKey}\n-----END PUBLIC KEY-----`;
    } catch {
      return `-----BEGIN PUBLIC KEY-----\n${pubKeyBase64}\n-----END PUBLIC KEY-----`;
    }
  }

  async register(envelope: any) {
    const decrypted = this.cryptoService.openEnvelope(envelope);

    const hashedPassword = await bcrypt.hash(decrypted.password, 10);

    const user = await this.prisma.user.create({
      data: {
        username: decrypted.username,
        email: decrypted.email,
        passwordHash: hashedPassword,
        publicKey: decrypted.publicKey,
        encryptedPrivateKey: decrypted.encryptedPrivateKey || null,
      },
    });

    const payload = { username: user.username, sub: user.id };

    return {
      token: await this.jwtService.signAsync(payload),
      userId: user.id,
      username: user.username,
      publicKey: user.publicKey,
    };
  }

  async login(envelope: any) {
    const decrypted = this.cryptoService.openEnvelope(envelope);

    if (!decrypted.username || !decrypted.password) {
      throw new BadRequestException('Usuario y contraseña requeridos');
    }

    const user = await this.prisma.user.findUnique({
      where: { username: decrypted.username },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario o contraseña inválidos');
    }

    const isPasswordValid = await bcrypt.compare(decrypted.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Usuario o contraseña inválidos');
    }

    const token = this.jwtService.sign({
      username: user.username,
      sub: user.id,
    });

    return {
      token,
      userId: user.id,
      username: user.username,
      publicKey: user.publicKey,
      encryptedPrivateKey: user.encryptedPrivateKey,
    };
  }
}