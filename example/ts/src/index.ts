import {grpc, Code, Metadata} from "grpc-web-client";
import {BookService} from "../_proto/examplecom/library/book_service_pb_service";
import {QueryBooksRequest, Book, GetBookRequest} from "../_proto/examplecom/library/book_service_pb";

declare const USE_TLS: boolean;
const host = USE_TLS ? "https://localhost:9091" : "http://localhost:9090";

function getBook() {
  const getBookRequest = new GetBookRequest();
  getBookRequest.setIsbn(60929871);
  grpc.unary(BookService.GetBook, {
    request: getBookRequest,
    host: host,
    onEnd: res => {
      const { status, statusMessage, headers, message, trailers } = res;
      console.log("getBook.onEnd.status", status, statusMessage);
      console.log("getBook.onEnd.headers", headers);
      if (status === Code.OK && message) {
        console.log("getBook.onEnd.message", message.toObject());
      }
      console.log("getBook.onEnd.trailers", trailers);
      queryBooks();
    }
  });
}

getBook();

function queryBooks() {
  const queryBooksRequest = new QueryBooksRequest();
  queryBooksRequest.setAuthorPrefix("Geor");
  grpc.invoke(BookService.QueryBooks, {
    request: queryBooksRequest,
    host: host,
    onHeaders: (headers: Metadata) => {
      console.log("queryBooks.onHeaders", headers);
    },
    onMessage: (message: Book) => {
      console.log("queryBooks.onMessage", message.toObject());
    },
    onEnd: (code: Code, msg: string, trailers: Metadata) => {
      console.log("queryBooks.onEnd", code, msg, trailers);
    },
    debugger: {
      newRequest: (requestId: number, options: any): void => {
        console.log(requestId, 'test');
      },
      onHeaders(requestId: number, headers: Metadata, status: number): void {
        console.log(requestId, headers, status);
      },
      onChunk(requestId: number, metadata: Metadata): void {
        console.log(requestId, metadata);
      },
      onEnd(requestId: number, grpcStatus: Code | null, message: string[]): void {
        console.log(requestId, grpcStatus, message);
      },
      onError(requestId: number, message: string): void {
        console.log(requestId, message);
      }
    }
  });
}
