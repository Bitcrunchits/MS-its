import {
    BadRequestException,
    Controller,
    Inject,
    Post,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import { writeFile, unlink, rename } from 'fs/promises';
import { extname, join } from 'path';
import { firstValueFrom } from 'rxjs';


import { ClientProxy } from '@nestjs/microservices';
import { UPLOAD_MS } from 'src/config';


@Controller('upload')
export class UploadController {
    constructor
        (
            @Inject(UPLOAD_MS)
            private readonly uploadClient: ClientProxy,
        ) { }


    @Post()
    @UseInterceptors(
        FileInterceptor('file', {
            limits: {
                fileSize: 10 * 1024 * 1024,
            },

            fileFilter: (req, file, callback) => {
                const allowedExtensions = [
                    '.pdf',
                    '.png',
                    '.jpg',
                    '.jpeg',
                    '.docx',
                    '.xlsx',
                ];

                const allowedMimeTypes = [
                    'application/pdf',
                    'image/png',
                    'image/jpeg',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                ];

                const extension = extname(file.originalname).toLowerCase();

                const extensionIsValid =
                    allowedExtensions.includes(extension);

                const mimeIsValid =
                    allowedMimeTypes.includes(file.mimetype);

                if (!extensionIsValid || !mimeIsValid) {
                    return callback(
                        new BadRequestException(
                            'Formato de archivo no permitido',
                        ),
                        false,
                    );
                }

                callback(null, true);
            },
        }),
    )
    async uploadFile(
        @UploadedFile() file: Express.Multer.File,
    ) {
        if (!file) {
            throw new BadRequestException(
                'Archivo no recibido o formato no permitido',
            );
        }
        // 1. generamos UUID
        const uuid = randomUUID();

        // 2. Obtenemos la extensión
        const extension = extname(file.originalname).toLowerCase();

        // 3. Creamos el nombre interno
        const storedName = `${uuid}${extension}`;

        // 4. Construimos la ruta a cuarentena
        const quarantinePath = join(
            process.cwd(),
            'uploads',
            'quarantine',
            storedName,
        );

        const verifiedPath = join(
            process.cwd(),
            'uploads',
            'verified',
            storedName,
        );

        // 5. guardamos el buffer que multer tiene en RAM
        await writeFile(quarantinePath, file.buffer);

        //6. Preparamos metadata para Uploads_MS
        const metadata = {
            uuid,
            originalName: file.originalname,
            storedName,
            mimetype: file.mimetype,
            size: file.size,
            path: quarantinePath,
            uploadedAt: new Date().toISOString(),
        };

        // 7. Gateway pide al Upload-MS que lo valide
        const validationResult = await firstValueFrom(
            this.uploadClient.send(
                { upload: 'validate' },
                metadata,
            ),
        );

        // 8. Si Upload-MS dice REJECTED,
        // Gateway elimina el archivo físico
        if (validationResult.status === 'REJECTED') {
            await unlink(quarantinePath);

            console.log(
                'Archivo rechazado y eliminado de cuarentena:',
            );
            console.log(quarantinePath);
        }

        //!caso exitoso
        if (validationResult.status === 'STRUCTURE_VALIDATED') {
            await rename(
                quarantinePath,
                verifiedPath,
            );
            console.log(
                'Archivo validado y movido a verified:',
            );
            console.log(verifiedPath)
        }

        // 9. Respondemos al frontend
        return validationResult;
    }
}