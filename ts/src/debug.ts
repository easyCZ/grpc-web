import {BrowserHeaders as Metadata} from "browser-headers";
import {Code} from "./Code";
import {Message} from 'google-protobuf';
import { grpc } from './grpc';


export type MethodDefinition = grpc.MethodDefinition<Message, Message>;



export interface RequestDebugger {
    onHeaders(id: number, headers: Metadata, status: number): void;
    onMessage(id: number, payload: Message): void;
    onTrailers(id: number, payload: Metadata): void;
    onChunk(id: number, metdata: Metadata): void;
    onEnd(id: number, grpcStatus: Code | null, message: string): void;
    onError(id: number, code: Code, err: Error): void;
}

export interface GrpcDebugger {

    request(id: number, host: string, method: MethodDefinition, metadata: Metadata): RequestDebugger;

}


// export interface GrpcDebugger {
//     request(id: number, host: string, method: MethodDefinition, metadata: Metadata.ConstructorArg, req: Message): void;
//
// }



type Request = {
    id: number,
    host: string,
    method: MethodDefinition,
    payload: Message,
    messages: Message[],
    headers: Metadata | null,
    trailers: Metadata | null,
    status: Code | null,
}

export class ConsoleDebugger implements GrpcDebugger {

    private requests: { [id: number]: Request} = {};

    request(id: number, host: string, method: MethodDefinition, metadata: Metadata.ConstructorArg, message: Message): void {
        const req: Request = {
            id,
            host,
            method,
            payload: message,
            messages: [],
            headers: null,
            trailers: null,
            status: null,
        }
        this.requests[id] = req;
        debug('GRPC Request', host, metadata, req, method);
    }

    onMessage(id: number, message: Message): void {
        this.requests[id].messages.push(message);
        debug(message)
    }

    onTrailers(id: number, payload: Metadata): void {
        this.requests[id].trailers = payload;
        debug(payload)
    }

    onHeaders(id: number, headers: Metadata, status: number): void {
        this.requests[id].headers = headers;
        debug(id, headers, status);
    }

    onChunk(id: number, metadata: Metadata): void {
        debug(id, metadata);
    }

    onEnd(id: number, grpcStatus: Code | null, message: string): void {
        this.requests[id].status = grpcStatus;
        debug(grpcStatus, message);

        console.log(this.requests[id])
    }

    onError(id: number, code: Code, err: Error): void {
        debug(id, err, code);
    }

}

export function debug(...args: any[]) {
  if (console.debug) {
    console.debug.apply(null, args);
  } else {
    console.log.apply(null, args);
  }
}

export function debugBuffer(str: string, buffer: Uint8Array) {
  const asArray: number[] = [];
  for(let i = 0; i < buffer.length; i++) {
    asArray.push(buffer[i]);
  }
  debug(str, asArray.join(","))
}