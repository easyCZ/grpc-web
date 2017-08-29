import {BrowserHeaders as Metadata} from "browser-headers";
import {Code} from "./Code";
import {Message} from 'google-protobuf';
import { grpc } from './grpc';


export type MethodDefinition = grpc.MethodDefinition<Message, Message>;

export interface RequestDebugger {
    onHeaders(headers: Metadata): void;
    onMessage(payload: Message): void;
    onTrailers(metadata: Metadata): void;
    onChunk(metadata: Metadata): void;
    onEnd(grpcStatus: Code | null): void;
    onError(code: Code, err: Error): void;
}

export interface GrpcDebugger {
    request(id: number, host: string, method: MethodDefinition, metadata: Metadata, message: Message): RequestDebugger;
}

export class ConsoleRequestDebugger implements RequestDebugger {

    readonly id: number;
    readonly host: string;
    readonly method: MethodDefinition;
    readonly request: {
        metadata: Metadata.ConstructorArg,
        message: Message,
    };
    response: {
        messages: Message[],
        headers: Metadata | null,
        trailers: Metadata | null,
        status: Code | null,
        error: Error | null,
    };

    private readonly logTitle: string;

    constructor(id: number, host: string, method: MethodDefinition, metadata: Metadata.ConstructorArg, message: Message) {
        this.id = id;
        this.host = host;
        this.method = method;
        this.request = { metadata, message };
        this.response = {
            messages: [],
            headers: null,
            trailers: null,
            status: null,
            error: null,
        };

        this.logTitle = `GRPC #${id}:`;

        debug(`${this.logTitle} Request to ${method.service.serviceName}.${method.methodName}`, host, metadata, message);
    }

    onMessage(message: Message): void {
        this.response.messages.push(message);
        debug(`${this.logTitle} Message`, message.toObject(), message);
    }

    onTrailers(trailers: Metadata): void {
        this.response.trailers = trailers;
        debug(`${this.logTitle} Trailers`, trailers)
    }

    onHeaders(headers: Metadata): void {
        this.response.headers = headers;
        debug(`${this.logTitle} Headers`, headers);
    }

    onChunk(metadata: Metadata): void {
        debug(`${this.logTitle} Chunk`, metadata);
    }

    onEnd(grpcStatus: Code | null): void {
        this.response.status = grpcStatus;
        const jsonMessages = this.response.messages.map(message => message.toObject());
        debug(`${this.logTitle} End`, grpcStatus, jsonMessages, this.response.headers, this.response.trailers);
    }

    onError(code: Code, err: Error): void {
        this.response.status = code;
        this.response.error = err;
        debug(`${this.logTitle} Error`, code, err);
    }
}

export class ConsoleDebugger implements GrpcDebugger {

    private requests: { [id: number]: RequestDebugger} = {};

    request(id: number, host: string, method: MethodDefinition, metadata: Metadata.ConstructorArg, message: Message): RequestDebugger {
        const requestDebugger = new ConsoleRequestDebugger(id, host, method, metadata, message);
        this.addRequest(id, requestDebugger);

        return requestDebugger;
    }

    getRequests(): { [id: number]: RequestDebugger} {
        return this.requests;
    }

    private addRequest(id: number, request: RequestDebugger): void {
        this.requests[id] = request;
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
  for (let i = 0; i < buffer.length; i++) {
    asArray.push(buffer[i]);
  }
  debug(str, asArray.join(","))
}