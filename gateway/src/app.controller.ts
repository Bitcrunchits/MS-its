import { Controller, Get, Inject } from '@nestjs/common';
import { USER_MS } from './config';
import { ClientProxy } from '@nestjs/microservices';

@Controller()
export class AppController {
  constructor(@Inject(USER_MS) private readonly userClients: ClientProxy) {}

  @Get()
  getHello() {
    // Envia info pero no espera respuesta
    this.userClients
      .emit({ user: 'getHello' }, { data: 'Hola desde el gateway' })
      .subscribe();
    // Envia info y espera respuesta
    return this.userClients.send(
      { user: 'getHello' },
      { data: 'Envío info desde el gateway para esperar respuesta' },
    );
  }
}
