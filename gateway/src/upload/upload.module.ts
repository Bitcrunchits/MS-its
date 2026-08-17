import { Module } from '@nestjs/common';
import {
  ClientsModule,
  Transport,
} from '@nestjs/microservices';

import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { UPLOAD_MS } from '../config';


@Module({
  imports: [
    ClientsModule.register([
      {
        name:UPLOAD_MS,
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 3003,
        },
      },
    ]),
  ], 
  controllers: [UploadController],
  providers: [UploadService]
})
export class UploadModule {}
