import { injectable } from 'inversify';
import {
  Request,
  Response,
  NextFunction,
  Errback,
  RequestHandler,
} from 'express';

export interface IErrorMiddleware {
  handler(err: Errback, req: Request, res: Response, next: NextFunction): void;
  catchAsync(
    target: Object,
    name: string,
    descriptor: PropertyDescriptor,
  ): void;
  catchAsyncHTTP(
    target: Object,
    name: string,
    descriptor: PropertyDescriptor,
  ): void;
}

@injectable()
export class ErrorMiddleware implements IErrorMiddleware {
  handler(err: Errback, req: Request, res: Response, next: NextFunction) {
    const canSendResponse = res && res.end && res.status;

    console.log('WORKS!');
    console.log(err);

    if (canSendResponse) {
      res.status(500).json({ message: 'internal server error' });
    }
  }

  // use as method decorator
  catchAsync(target: Object, name: string, descriptor: PropertyDescriptor) {
    const fn = descriptor.value;

    descriptor.value = async function(...args: any[]) {
      try {
        const result = await fn.call(this, ...args);
        return result;
      } catch (err) {
        console.log(err);
        return undefined;
      }
    };

    return descriptor;
  }

  // use as method decorator
  catchAsyncHTTP(target: Object, name: string, descriptor: PropertyDescriptor) {
    const fn = descriptor.value;

    descriptor.value = <RequestHandler>function(...args) {
      const [req, res, next] = args;

      const result = fn.call(target, ...args);

      if (result.catch) {
        result.catch((err: Error) => {
          next(err);
        });
      }

      return result;
    };

    return target;
  }
}
