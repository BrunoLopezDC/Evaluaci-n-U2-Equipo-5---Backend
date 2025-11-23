import { Injectable } from '@nestjs/common';
import {
  generateKeyPairSync,
  privateDecrypt,
  createDecipheriv,
  constants,
  createVerify,
} from 'crypto';

@Injectable()
export class CryptoService {
  private privateKey: string;
  public publicKey: string;

  constructor() {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    this.privateKey = privateKey;
    this.publicKey = publicKey;
  }

  getPublicKey(): { publicKey: string } {
    return { publicKey: this.publicKey };
  }

  async openEnvelope(envelope: any): Promise<any> {
    const decryptedJson = this.decryptHybrid({
      encryptedKey: envelope.encryptedKey,
      iv: envelope.iv,
      encryptedData: envelope.encryptedData,
    });
    return JSON.parse(decryptedJson);
  }

  decryptHybrid(data: {
    encryptedKey: string;
    iv: string;
    encryptedData: string;
  }): string {
    try {
      const encryptedKeyBuf = Buffer.from(data.encryptedKey, 'base64');
      const ivBuf = Buffer.from(data.iv, 'base64');
      const encryptedDataBuf = Buffer.from(data.encryptedData, 'base64');

      const symKey = privateDecrypt(
        {
          key: this.privateKey,
          padding: constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        encryptedKeyBuf
      );

      const decipher = createDecipheriv('aes-256-cbc', symKey, ivBuf);
      let decrypted = decipher.update(encryptedDataBuf);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      return decrypted.toString('utf-8');
    } catch (error: any) {
      throw new Error(`Error en Sobre Digital: ${error.message}`);
    }
  }

  // ✅ MÉTODO CORREGIDO para verificar firmas RSA-PSS
  verifySignature(publicKeyPem: string, data: string, signatureBase64: string): boolean {
    try {
      // Convertir la clave pública de base64 SPKI a PEM
      const pemKey = this.base64ToPem(publicKeyPem);
      
      // Crear verificador con RSA-PSS y SHA-256
      const verify = createVerify('RSA-SHA256');
      verify.update(data);
      verify.end();

      // Verificar la firma
      const signatureBuffer = Buffer.from(signatureBase64, 'base64');
      
      return verify.verify(
        {
          key: pemKey,
          padding: constants.RSA_PKCS1_PSS_PADDING,
          saltLength: 32,
        },
        signatureBuffer
      );
    } catch (error: any) {
      console.error('❌ Error verificando firma:', error.message);
      return false;
    }
  }

  // ✅ Método auxiliar para convertir base64 SPKI a PEM
  private base64ToPem(base64Key: string): string {
    // Si ya es PEM, devolverlo tal cual
    if (base64Key.includes('BEGIN PUBLIC KEY')) {
      return base64Key;
    }

    // Convertir de base64 a PEM
    const pemHeader = '-----BEGIN PUBLIC KEY-----\n';
    const pemFooter = '\n-----END PUBLIC KEY-----';
    const pemBody = base64Key.match(/.{1,64}/g)?.join('\n') || base64Key;
    
    return pemHeader + pemBody + pemFooter;
  }
}