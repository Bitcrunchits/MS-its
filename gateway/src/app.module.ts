import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AppController } from './app.controller';
import { USER_MS, LOGS_MS } from './config';

@Module({
  imports: [
    ClientsModule.register([
      { name: USER_MS, 
        transport: Transport.TCP, 
        options: { 
          host: 'localhost', 
          port: 3001 
        } 
      },
      { name: LOGS_MS, 
        transport: Transport.TCP, 
        options: { 
          host: 'localhost', 
          port: 3002 
        } 
      },
    ]),
  ],
  controllers: [AppController],
})
export class AppModule { }
