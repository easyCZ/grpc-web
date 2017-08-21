import {TransportOptions} from "./transports/Transport";
import {BrowserHeaders as Metadata} from "browser-headers";
import {Code} from "./Code";
import {Message} from 'google-protobuf';


let requestId = 0;


export interface GrpcDebugger<TRequest extends Message> {
  new (request: TRequest): GrpcDebugger<TRequest>;

  onHeaders(headers: Metadata, status: number): void;
  onChunk(metdata: Metadata): void;
  onEnd(grpcStatus: Code | null, message: string[]): void;
  onError(message: string): void;
}


export class ConsoleDebugger<TRequest extends Message> implements GrpcDebugger<TRequest> {

  // public readonly requestId: number;
  // private readonly request: TRequest;

  constructor(request: TRequest) {
    // this.requestId = requestId++;
    // this.request = request;
  }

  newRequest(requestId: number, options: TransportOptions): void {
    debug(requestId, options);
  }
  onHeaders(headers: Metadata, status: number): void {
    debug(headers, status);
  }
  onChunk(metadata: Metadata): void {
    debug(metadata);
  }
  onEnd(grpcStatus: Code | null, message: string[]): void {
    debug(grpcStatus, message);
  }
  onError(message: string): void {
    debug(message);
  }

}

let registeredDebuggers: GrpcDebugger[] = [];

export function useDebugger(...debuggers: GrpcDebugger[]): void {
  registeredDebuggers = debuggers;
}

export function getDebuggers(): GrpcDebugger[] {
  return registeredDebuggers;
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