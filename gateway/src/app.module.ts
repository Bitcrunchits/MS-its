import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AppController } from './app.controller';
import { USER_MS, LOGS_MS, UPLOAD_MS } from './config';
import { UploadModule } from './upload/upload.module';

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
      {
        name:UPLOAD_MS,
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 3003,
        },
      },
    ]),
    UploadModule,
  ],
  controllers: [AppController],
})
export class AppModule { }
