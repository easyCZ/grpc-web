import {BrowserHeaders} from "browser-headers";
import {Code} from "./Code";
import {Message} from 'google-protobuf';
import { grpc } from './grpc';
import {Chunk} from "./ChunkParser";
import detach from "./detach";

export {
    BrowserHeaders,
    Message,
}

export type MethodDefinition = grpc.MethodDefinition<Message, Message>;

export interface DebuggerProvider {
    // Obtain an instance of a debugger.
    // A convenience proxy allowing the provider to implement additional functionality
    // such as tracking history of requests
    getInstanceForRequest(id: number): Debugger;
}

// Implements callbacks for grpc-web request/response lifecycle events
export interface Debugger {
    // Called just before a request is fired, called only once
    onRequestStart(host: string, method: MethodDefinition): void;

    // Called just before a request is fired, called only once
    onRequestHeaders(headers: BrowserHeaders): void;

    // Called with the request payload, potentially called multiple times with request streams
    onRequestMessage(payload: Message): void;

    // Called when response headers are available, called once multiple times
    // This is a low level method intended to debug byte serialization
    onResponseHeaders(headers: BrowserHeaders, httpStatus: number): void;

    // Called with each received chunk
    onResponseChunk?(chunk: Chunk[], chunkBytes: Uint8Array): void;

    // Called with each response message, called multiple times with response streams
    onResponseMessage(payload: Message): void;

    // Called with response trailers, called once
    onResponseTrailers(metadata: BrowserHeaders): void;

    // Called when a request completes, called once
    onResponseEnd(grpcStatus: Code | null): void;

    // Called with any error occuring in the flow, potentially called multiple times
    onError(code: Code, err: Error): void;
}


export class ConsoleDebuggerProvider implements DebuggerProvider {

    getInstanceForRequest(id: number): Debugger {
        return new ConsoleDebugger(id);
    }

}


export class ConsoleDebugger implements Debugger {

    readonly id: number;
    host: string;
    method: MethodDefinition;

    constructor(id: number) {
        this.id = id;
    }

    onRequestStart(host: string, method: MethodDefinition): void {
        debug(`gRPC-Web #${this.id}: Making request to ${host} for ${method.service.serviceName}.${method.methodName}`, method);
    }

    onRequestHeaders(headers: BrowserHeaders): void {
        debug(`gRPC-Web #${this.id}: Headers:`, headers);
    }

    onRequestMessage(payload: Message): void {
        debug(`gRPC-Web #${this.id}: Request message:`, payload.toObject());
    }

    onResponseHeaders(headers: BrowserHeaders, httpStatus: number) {
        debug(`gRPC-Web #${this.id}: Response headers:`, headers, 'HTTP Status:', httpStatus);
    }

    onResponseMessage(payload: Message): void {
        debug(`gRPC-Web #${this.id}: Response message:`, payload.toObject());
    }

    onResponseTrailers(metadata: BrowserHeaders): void {
        debug(`gRPC-Web #${this.id}: Response trailers:`, metadata);
    }

    onResponseEnd(grpcStatus: Code | any): void {
        debug(`gRPC-Web #${this.id}: Finished with status:`, grpcStatus);
    }

    onError(code: Code, err: Error): void {
        debug(`gRPC-Web #${this.id}: Error. Code:`, code, 'Error:', err);
    }

}

export class DebuggerDispatch implements Debugger {

    private readonly debuggers: Debugger[];

    constructor(debuggers: Debugger[]) {
        this.debuggers = debuggers;
    }

    onRequestStart(host: string, method: MethodDefinition): void {
        this.debuggers.forEach(dbg => {
            detach(() => dbg.onRequestStart(host, method));
        });
    }

    onRequestHeaders(headers: BrowserHeaders): void {
        this.debuggers.forEach(dbg => {
            detach(() => dbg.onRequestHeaders(headers));
        });
    }

    onRequestMessage(payload: Message): void {
        this.debuggers.forEach(dbg => {
            detach(() => dbg.onRequestMessage(payload));
        });
    }

    onResponseHeaders(headers: BrowserHeaders, httpStatus: number): void {
        this.debuggers.forEach(dbg => {
            detach(() => dbg.onResponseHeaders(headers, httpStatus));
        });
    }

    onResponseChunk(chunk: Chunk[], chunkBytes: Uint8Array) {
        this.debuggers.forEach(dbg => {
            detach(() => dbg.onResponseChunk && dbg.onResponseChunk(chunk, chunkBytes));
        });
    }

    onResponseMessage(payload: Message): void {
        this.debuggers.forEach(dbg => {
            detach(() => dbg.onRequestMessage(payload));
        });
    }

    onResponseTrailers(metadata: BrowserHeaders): void {
        this.debuggers.forEach(dbg => {
            detach(() => dbg.onResponseTrailers(metadata));
        });
    }

    onResponseEnd(grpcStatus: Code | null): void {
        this.debuggers.forEach(dbg => {
            detach(() => dbg.onResponseEnd(grpcStatus));
        });
    }

    onError(code: Code, err: Error): void {
        this.debuggers.forEach(dbg => {
            detach(() => dbg.onError(code, err));
        });
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