import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CryptoService {
  private serverPrivateKeyPem: string;
  private serverPublicKeyPem: string;

  constructor() {
    const keysDir = path.join(process.cwd(), 'keys');
    
    if (!fs.existsSync(keysDir)) {
      fs.mkdirSync(keysDir, { recursive: true });
    }

    const privateKeyPath = path.join(keysDir, 'private.pem');
    const publicKeyPath = path.join(keysDir, 'public.pem');

    if (fs.existsSync(privateKeyPath) && fs.existsSync(publicKeyPath)) {
      this.serverPrivateKeyPem = fs.readFileSync(privateKeyPath, 'utf-8');
      this.serverPublicKeyPem = fs.readFileSync(publicKeyPath, 'utf-8');
    } else {
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem',
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem',
        },
      });

      this.serverPublicKeyPem = publicKey;
      this.serverPrivateKeyPem = privateKey;

      fs.writeFileSync(privateKeyPath, privateKey, 'utf-8');
      fs.writeFileSync(publicKeyPath, publicKey, 'utf-8');
    }
  }

  getPublicKey(): { publicKey: string } {
    return { publicKey: this.serverPublicKeyPem };
  }

  openEnvelope(envelope: any): any {
    try {
      console.log('📦 Sobre recibido:');
      console.log('- encryptedKey:', envelope.encryptedKey ? 'presente' : 'FALTA');
      console.log('- encryptedData:', envelope.encryptedData ? 'presente' : 'FALTA');
      console.log('- iv:', envelope.iv ? 'presente' : 'FALTA');

      if (!envelope.encryptedKey || !envelope.encryptedData || !envelope.iv) {
        throw new Error('Sobre digital incompleto: faltan encryptedKey, encryptedData o iv');
      }

      const decrypted = this.decryptHybrid(
        envelope.encryptedKey,
        envelope.encryptedData,
        envelope.iv,
        this.serverPrivateKeyPem
      );
      
      console.log('🔓 Datos descifrados:', decrypted);
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Error abriendo sobre:', error.message);
      throw new Error('No se pudo descifrar el sobre digital: ' + error.message);
    }
  }

  verifySignature(publicKeyPem: string, data: string, signature: string): boolean {
    try {
      const cleanPem = publicKeyPem
        .replace(/-----BEGIN PUBLIC KEY-----/g, '')
        .replace(/-----END PUBLIC KEY-----/g, '')
        .replace(/\n/g, '');

      let finalPem = publicKeyPem;

      if (!publicKeyPem.includes('BEGIN PUBLIC KEY')) {
        finalPem = `-----BEGIN PUBLIC KEY-----\n${cleanPem}\n-----END PUBLIC KEY-----`;
      }

      const publicKey = crypto.createPublicKey({
        key: finalPem,
        format: 'pem',
      });

      const signatureBuffer = Buffer.from(signature, 'base64');
      const dataBuffer = Buffer.from(data, 'utf-8');

      const isValid = crypto.verify(
        'sha256',
        dataBuffer,
        {
          key: publicKey,
          padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
          saltLength: 32,
        },
        signatureBuffer
      );

      return isValid;
    } catch (error) {
      console.error('Error verificando firma:', error.message);
      return false;
    }
  }

  decryptHybrid(encryptedKey: string, encryptedData: string, iv: string, privateKeyPem: string): string {
    try {
      if (!encryptedKey || !encryptedData || !iv) {
        throw new Error(`Parámetros inválidos: encryptedKey=${!!encryptedKey}, encryptedData=${!!encryptedData}, iv=${!!iv}`);
      }

      const privateKey = crypto.createPrivateKey({
        key: privateKeyPem,
        format: 'pem',
      });

      const encryptedKeyBuffer = Buffer.from(encryptedKey, 'base64');
      const encryptedDataBuffer = Buffer.from(encryptedData, 'base64');
      const ivBuffer = Buffer.from(iv, 'base64');

      const decryptedKey = crypto.privateDecrypt(
        {
          key: privateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        encryptedKeyBuffer
      );

      const decipher = crypto.createDecipheriv('aes-256-cbc', decryptedKey, ivBuffer);
      let decrypted = decipher.update(encryptedDataBuffer, undefined, 'utf-8');
      decrypted += decipher.final('utf-8');

      return decrypted;
    } catch (error) {
      console.error('Error descifrando:', error.message);
      throw new Error('Error descifrando datos: ' + error.message);
    }
  }
}