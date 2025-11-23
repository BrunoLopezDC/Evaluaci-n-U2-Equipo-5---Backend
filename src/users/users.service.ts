import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../crypto/crypto.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private cryptoService: CryptoService,
  ) {}

  async addContact(
    userId: number,
    contactUsername: string,
    challenge: string,
    signature: string,
  ) {
    console.log('User ID:', userId);
    console.log('Contact Username:', contactUsername);
    console.log('Challenge:', challenge);
    console.log('Signature:', signature);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.publicKey) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    console.log('Usuario encontrado:', user.username);
    console.log('Clave pública:', user.publicKey);

    const isValid = this.cryptoService.verifySignature(
      user.publicKey,
      challenge,
      signature
    );

    console.log('Resultado de verificación:', isValid ? 'VÁLIDA' : 'INVÁLIDA');

    if (!isValid) {
      throw new UnauthorizedException('Firma digital inválida');
    }

    const contact = await this.prisma.user.findUnique({
      where: { username: contactUsername },
    });

    if (!contact) {
      throw new NotFoundException('Usuario contacto no encontrado');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        contacts: {
          push: contact.id,
        },
      },
    });

    return {
      message: `Contacto ${contactUsername} agregado exitosamente`,
      contactId: contact.id,
    };
  }

  async getPublicKey(username: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { publicKey: true },
    });

    if (!user || !user.publicKey) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return user.publicKey;
  }

  async getUserPublicKey(userId: number): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { publicKey: true },
    });

    if (!user || !user.publicKey) {
      throw new NotFoundException('Clave pública no encontrada');
    }

    return user.publicKey;
  }

  async updatePublicKey(userId: number, publicKey: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { publicKey },
    });
  }
}