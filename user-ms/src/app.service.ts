import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    // Lógica para obtener información
    return 'Hello World!';
  }
}
