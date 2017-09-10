import * as jspb from "google-protobuf";
import {BrowserHeaders as Metadata} from "browser-headers";
import {ChunkParser, Chunk, ChunkType} from "./ChunkParser";
import {Transport, TransportOptions, DefaultTransportFactory} from "./transports/Transport";
import {DebuggerProvider, DebuggerDispatch} from "./debug";
import detach from "./detach";
import {Code} from "./Code";

export {
  Metadata,
  Transport,
  TransportOptions,
  Code
};


export namespace grpc {

  let sequenceNumber = 1;

  export interface ProtobufMessageClass<T extends jspb.Message> {
    new(): T;
    deserializeBinary(bytes: Uint8Array): T;
  }

  function httpStatusToCode(httpStatus: number): Code {
    switch (httpStatus) {
      case 0: // Connectivity issues
        return Code.Internal;
      case 200:
        return Code.OK;
      case 400:
        return Code.InvalidArgument;
      case 401:
        return Code.Unauthenticated;
      case 403:
        return Code.PermissionDenied;
      case 404:
        return Code.NotFound;
      case 409:
        return Code.Aborted;
      case 412:
        return Code.FailedPrecondition;
      case 429:
        return Code.ResourceExhausted;
      case 499:
        return Code.Canceled;
      case 500:
        return Code.Unknown;
      case 501:
        return Code.Unimplemented;
      case 503:
        return Code.Unavailable;
      case 504:
        return Code.DeadlineExceeded;
      default:
        return Code.Unknown;
    }
  }

  export interface ServiceDefinition {
    serviceName: string;
  }

  export interface MethodDefinition<TRequest extends jspb.Message, TResponse extends jspb.Message> {
    methodName: string;
    service: ServiceDefinition;
    requestStream: boolean;
    responseStream: boolean;
    requestType: ProtobufMessageClass<TRequest>;
    responseType: ProtobufMessageClass<TResponse>;
  }

  export type UnaryMethodDefinition<TRequest extends jspb.Message, TResponse extends jspb.Message> = MethodDefinition<TRequest, TResponse> & {
    responseStream: false;
  }

  export type RpcOptions<TRequest extends jspb.Message, TResponse extends jspb.Message> = {
    host: string,
    request: TRequest,
    metadata?: Metadata.ConstructorArg,
    onHeaders?: (headers: Metadata) => void,
    onMessage?: (res: TResponse) => void,
    onEnd: (code: Code, message: string, trailers: Metadata) => void,
    transport?: Transport,
    debug?: boolean,
    // debugger?: GrpcDebugger<TRequest, TResponse>,
  }

  export type UnaryOutput<TResponse> = {
    status: Code,
    statusMessage: string;
    headers: Metadata;
    message: TResponse | null;
    trailers: Metadata;
  }

  export type UnaryRpcOptions<M extends UnaryMethodDefinition<TRequest, TResponse>, TRequest extends jspb.Message, TResponse extends jspb.Message> = {
    host: string,
    request: TRequest,
    metadata?: Metadata.ConstructorArg,
    onEnd: (output: UnaryOutput<TResponse>) => void,
    transport?: Transport,
    debug?: boolean,
  }

  const debuggerProviders: DebuggerProvider[] = [];

  export function registerDebugger(dbg: DebuggerProvider): void {
    debuggerProviders.push(dbg);
  }

  export function removeDebugger(dbg: DebuggerProvider): boolean {
    const index = debuggerProviders.indexOf(dbg);
    if (index < 0) return false;

    debuggerProviders.splice(index, 1);
    return true;
  }

  export function getDebuggers(): DebuggerProvider[] {
    return debuggerProviders;
  }

  function frameRequest(request: jspb.Message): ArrayBufferView {
    const bytes = request.serializeBinary();
    const frame = new ArrayBuffer(bytes.byteLength + 5);
    new DataView(frame, 1, 4).setUint32(0, bytes.length, false /* big endian */);
    new Uint8Array(frame, 5).set(bytes);
    return new Uint8Array(frame);
  }

  function getStatusFromHeaders(headers: Metadata): Code | null {
    const fromHeaders = headers.get("grpc-status") || [];
    if (fromHeaders.length > 0) {
      try {
        const asString = fromHeaders[0];
        return parseInt(asString, 10);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  export function unary<TRequest extends jspb.Message, TResponse extends jspb.Message, M extends UnaryMethodDefinition<TRequest, TResponse>>(methodDescriptor: M, props: UnaryRpcOptions<M, TRequest, TResponse>) {
    if (methodDescriptor.responseStream) {
      throw new Error(".unary cannot be used with server-streaming methods. Use .invoke instead.");
    }
    let responseHeaders: Metadata | null = null;
    let responseMessage: TResponse | null = null;
    const rpcOpts: RpcOptions<TRequest, TResponse> = {
      host: props.host,
      request: props.request,
      metadata: props.metadata,
      onHeaders: (headers: Metadata) => {
        responseHeaders = headers;
      },
      onMessage: (res: TResponse) => {
        responseMessage = res;
      },
      onEnd: (status: Code, statusMessage: string, trailers: Metadata) => {
        props.onEnd({
          status: status,
          statusMessage: statusMessage,
          headers: responseHeaders ? responseHeaders : new Metadata(),
          message: responseMessage,
          trailers: trailers
        });
      },
      transport: props.transport,
      debug: props.debug,
    };
    grpc.invoke(methodDescriptor, rpcOpts);
  }

  export function invoke<
      TRequest extends jspb.Message,
      TResponse extends jspb.Message,
      M extends MethodDefinition<TRequest, TResponse>
    >(methodDescriptor: M, props: RpcOptions<TRequest, TResponse>) {
    const requestHeaders = new Metadata(props.metadata ? props.metadata : {});
    requestHeaders.set("content-type", "application/grpc-web+proto");
    requestHeaders.set("x-grpc-web", "1"); // Required for CORS handling

    const framedRequest = frameRequest(props.request);

    let completed = false;
    function rawOnEnd(code: Code, message: string, trailers: Metadata) {
      if (completed) return;
      completed = true;
      detach(() => {
        props.onEnd(code, message, trailers);
      });
    }

    function rawOnHeaders(headers: Metadata) {
      if (completed) return;
      detach(() => {
        if (props.onHeaders) {
          props.onHeaders(headers);
        }
      });
    }

    function rawOnError(code: Code, msg: string) {
      if (completed) return;
      completed = true;
      detach(() => {
        props.onEnd(code, msg, new Metadata());
      });
    }

    function rawOnMessage(res: TResponse) {
      if (completed) return;
      detach(() => {
        if (props.onMessage) {
          props.onMessage(res);
        }
      });
    }

    let responseHeaders: Metadata;
    let responseTrailers: Metadata;
    const parser = new ChunkParser();


    let transport = props.transport;
    if (!transport) {
      transport = DefaultTransportFactory.getTransport();
    }

    const id = sequenceNumber++;
    const debuggers = getDebuggers().map(dbg => dbg.getInstanceForRequest(id));
    const debuggerDispatch = new DebuggerDispatch(debuggers);

    const url = `${props.host}/${methodDescriptor.service.serviceName}/${methodDescriptor.methodName}`;

    const transportOptions: TransportOptions = {
      debug: !!props.debug,
      url,
      headers: requestHeaders,
      body: framedRequest,
      onHeaders: (headers: Metadata, status: number) => {
        detach(() => debuggerDispatch.onRequestHeaders(headers));

        if (status === 0) {
          // The request has failed due to connectivity issues. Do not capture the headers
        } else {
          responseHeaders = headers;
          const code = httpStatusToCode(status);
          const gRPCMessage = headers.get("grpc-message") || [];

          if (code !== Code.OK) {
            rawOnError(code, gRPCMessage[0]);
            return;
          }

          rawOnHeaders(headers);
        }
      },
      onChunk: (chunkBytes: Uint8Array) => {
        let data: Chunk[] = [];
        try {
          data = parser.parse(chunkBytes);
          detach(() => debuggerDispatch.onResponseChunk(data, chunkBytes));
        } catch (e) {
          detach(() => debuggerDispatch.onError(Code.Internal, e));

          rawOnError(Code.Internal, `parsing error: ${e.message}`);
          return;
        }

        data.forEach((d: Chunk) => {
          if (d.chunkType === ChunkType.MESSAGE) {
            const deserialized = methodDescriptor.responseType.deserializeBinary(d.data!);
            detach(() => debuggerDispatch.onResponseMessage(deserialized));

            rawOnMessage(deserialized);
          } else if (d.chunkType === ChunkType.TRAILERS) {
            responseTrailers = new Metadata(d.trailers);
            detach(() => debuggerDispatch.onResponseTrailers(responseTrailers));
          }
        });
      },
      onEnd: () => {
        if (responseTrailers === undefined) {
          if (responseHeaders === undefined) {
            const errorMessage = "Response closed without headers";
            detach(() => debuggerDispatch.onError(Code.Internal, new Error(errorMessage)));

            // The request was unsuccessful - it did not receive any headers
            rawOnError(Code.Internal, errorMessage);
            return;
          }

          const grpcStatus = getStatusFromHeaders(responseHeaders);
          const grpcMessage = responseHeaders.get("grpc-message");

          // This was a headers/trailers-only response
          // props.debug && debug("grpc.headers only response ", grpcStatus, grpcMessage);
          if (grpcStatus === null) {
            const errorMessage = "Response closed without grpc-status (Headers only)";
            detach(() => debuggerDispatch.onError(Code.Internal, new Error(errorMessage)));
            rawOnEnd(Code.Internal, errorMessage, responseHeaders);
            return;
          }

          // Return an empty trailers instance
          detach(() => debuggerDispatch.onResponseEnd(grpcStatus));
          rawOnEnd(grpcStatus, grpcMessage[0], responseHeaders);
          return;
        }

        // There were trailers - get the status from them
        const grpcStatus = getStatusFromHeaders(responseTrailers);
        if (grpcStatus === null) {
          const errorMessage = "Response closed without grpc-status (Trailers provided)";

          detach(() => debuggerDispatch.onError(Code.Internal, new Error(errorMessage)));
          rawOnError(Code.Internal, errorMessage);
          return;
        }

        const grpcMessage = responseTrailers.get("grpc-message");
        detach(() => debuggerDispatch.onResponseEnd(grpcStatus));
        rawOnEnd(grpcStatus, grpcMessage[0], responseTrailers);
      }
    };

    detach(() => debuggerDispatch.onRequestStart(props.host, methodDescriptor));
    transport(transportOptions);
  }
}
