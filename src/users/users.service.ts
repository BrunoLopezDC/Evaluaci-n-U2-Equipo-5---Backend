import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../crypto/crypto.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private cryptoService: CryptoService,
  ) { }

  // ✅ Método para obtener clave pública de un usuario
  async getPublicKey(username: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { publicKey: true },
    });

    if (!user || !user.publicKey) {
      throw new NotFoundException('Usuario no encontrado o sin clave pública');
    }

    return user.publicKey;
  }
  async getPublicKeyById(userId: number): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { publicKey: true },
    });

    if (!user || !user.publicKey) {
      throw new NotFoundException('Usuario no encontrado o sin clave pública');
    }

    return user.publicKey;
  }

  async addContact(
    userId: number,
    contactUsername: string,
    challenge: string,
    signature: string,
  ) {
    console.log('🔍 Iniciando verificación de firma...');
    console.log('User ID:', userId);
    console.log('Contact Username:', contactUsername);
    console.log('Challenge:', challenge);
    console.log('Signature (primeros 50 chars):', signature.substring(0, 50) + '...');

    // Buscar el usuario que está haciendo la petición
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      console.error('❌ Usuario no encontrado:', userId);
      throw new UnauthorizedException('Usuario no encontrado');
    }

    console.log('✅ Usuario encontrado:', user.username);
    console.log('📋 Clave pública (primeros 50 chars):', user.publicKey?.substring(0, 50) + '...');

    if (!user.publicKey) {
      console.error('❌ Usuario no tiene clave pública');
      throw new UnauthorizedException('Usuario no tiene clave pública registrada');
    }

    // Verificar la firma digital
    const isValid = this.cryptoService.verifySignature(
      user.publicKey,
      challenge,
      signature,
    );

    console.log('🔐 Resultado de verificación:', isValid ? '✅ VÁLIDA' : '❌ INVÁLIDA');

    if (!isValid) {
      throw new UnauthorizedException('Firma digital inválida - Posible impostor');
    }

    // Buscar el contacto a agregar
    const contact = await this.prisma.user.findUnique({
      where: { username: contactUsername },
    });

    if (!contact) {
      console.error('❌ Contacto no encontrado:', contactUsername);
      throw new UnauthorizedException('Usuario contacto no encontrado');
    }

    console.log('✅ Contacto encontrado:', contact.username, '(ID:', contact.id, ')');

    // Agregar el contacto
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        contacts: {
          push: contact.id,
        },
      },
    });

    console.log('🎉 Contacto agregado exitosamente');

    return {
      message: `Contacto ${contactUsername} agregado correctamente`,
      contactId: contact.id,
    };
  }

  async updatePublicKey(userId: number, publicKey: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { publicKey },
    });
    return { message: 'Clave pública actualizada' };
  }
}