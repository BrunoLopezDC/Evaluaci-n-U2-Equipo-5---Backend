import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'supersecret',
    });
  }

  async validate(payload: any) {
    console.log('🔍 JWT Strategy - Validating payload:', payload);
    
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      console.error('❌ JWT Strategy - Usuario no encontrado:', payload.sub);
      throw new UnauthorizedException('Usuario no encontrado');
    }

    console.log('✅ JWT Strategy - Usuario validado:', user.username);
    
    // ✅ IMPORTANTE: Debe devolver un objeto con userId
    return { 
      userId: user.id, 
      username: user.username 
    };
  }
}