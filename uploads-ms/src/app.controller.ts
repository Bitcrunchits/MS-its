import { Controller } from '@nestjs/common';
import {
  MessagePattern,
  Payload,
} from '@nestjs/microservices';

import { readFile } from 'fs/promises';
import { PDFDocument } from 'pdf-lib';

@Controller()
export class AppController {
  @MessagePattern({ upload: 'validate' })
  async validateFile(@Payload() data: any) {
    console.log('ARCHIVO RECIBIDO PARA VALIDAR');
    console.log(data);

    const fileBuffer = await readFile(data.path);

    // 1. Validación de firma
    const signature = fileBuffer
      .subarray(0, 5)
      .toString('ascii');

    console.log('Firma detectada:', signature);

    if (signature !== '%PDF-') {
      return {
        uuid: data.uuid,
        declaredMime: data.mimetype,
        detectedType: 'UNKNOWN',
        signature,
        status: 'REJECTED',
        reason: 'La firma del archivo no corresponde a un PDF',
      };
    }

    // 2. Validación estructural
    try {
      const pdf = await PDFDocument.load(fileBuffer);

      const pages = pdf.getPageCount();

      console.log('PDF estructuralmente válido');
      console.log('Cantidad de páginas:', pages);

      return {
        uuid: data.uuid,
        declaredMime: data.mimetype,
        detectedType: 'PDF',
        signature,
        pages,
        status: 'STRUCTURE_VALIDATED',
      };
    } catch (error) {
      console.log('PDF inválido o corrupto');

      return {
        uuid: data.uuid,
        declaredMime: data.mimetype,
        detectedType: 'PDF',
        signature,
        status: 'REJECTED',
        reason: 'La estructura interna del PDF no es válida',
      };
    }
  }
}