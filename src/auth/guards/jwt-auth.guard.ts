import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Define interfaces for the JWT error types
interface TokenExpiredError extends Error {
  name: string;
  message: string;
  expiredAt: Date;
}

interface JsonWebTokenError extends Error {
  name: string;
  message: string;
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err, user, info) {
    // If there's an error or no user
    if (err || !user) {
      // TokenExpiredError is a specific error from jsonwebtoken package
      if (info instanceof Error && info.name === 'TokenExpiredError') {
        const tokenError = info as TokenExpiredError;
        throw new UnauthorizedException({
          statusCode: 401,
          message: 'Token expired',
          error: 'Unauthorized',
          expiredAt: tokenError.expiredAt,
        });
      }
      
      // JsonWebTokenError is the general JWT error class
      if (info instanceof Error && info.name === 'JsonWebTokenError') {
        throw new UnauthorizedException({
          statusCode: 401,
          message: 'Invalid token',
          error: 'Unauthorized',
        });
      }
      
      // For any other authentication error
      throw err || new UnauthorizedException({
        statusCode: 401,
        message: info?.message || 'Unauthorized access',
        error: 'Unauthorized',
      });
    }
    
    // If all is good, return the user
    return user;
  }
} 