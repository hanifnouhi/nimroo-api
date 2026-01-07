import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'object' ? (res as any).message || res : res;
    } else if (exception instanceof Error) {
      // Error in db connection
      if (exception.message.includes('database connection')) {
        status = HttpStatus.SERVICE_UNAVAILABLE;
        message = 'Error in db connection';
      }
      // Error in third party service
      else if (exception.message.includes('external service')) {
        status = HttpStatus.SERVICE_UNAVAILABLE;
        message = 'Third party service is temporary unavailable';
      }
    } else {
      console.error('Unknown error:', exception);
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: message,
    });
  }
}
