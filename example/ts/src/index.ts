import {grpc, Code, Metadata, ConsoleDebuggerProvider } from "grpc-web-client";
import {BookService} from "../_proto/examplecom/library/book_service_pb_service";
import {QueryBooksRequest, Book, GetBookRequest} from "../_proto/examplecom/library/book_service_pb";

declare const USE_TLS: boolean;
const host = USE_TLS ? "https://localhost:9091" : "http://localhost:9090";

grpc.registerDebugger(new ConsoleDebuggerProvider());
(window as any).__GRPC_WEB_DEVTOOLS__ ? grpc.registerDebugger((window as any).__GRPC_WEB_DEVTOOLS__): void 0;

function getBook() {
  const getBookRequest = new GetBookRequest();
  getBookRequest.setIsbn(60929871);
  grpc.unary(BookService.GetBook, {
    debug: true,
    request: getBookRequest,
    host: host,
    onEnd: res => {
      const { status, statusMessage, headers, message, trailers } = res;
      // console.log("getBook.onEnd.status", status, statusMessage);
      // console.log("getBook.onEnd.headers", headers);
      // if (status === Code.OK && message) {
      //   console.log("getBook.onEnd.message", message.toObject());
      // }
      // console.log("getBook.onEnd.trailers", trailers);
      // queryBooks();
    }
  });
}

// getBook();

function queryBooks() {
  const queryBooksRequest = new QueryBooksRequest();
  queryBooksRequest.setAuthorPrefix("Geor");
  grpc.invoke(BookService.QueryBooks, {
    debug: true,
    request: queryBooksRequest,
    host: host,
    onHeaders: (headers: Metadata) => {
      // console.log("queryBooks.onHeaders", headers);
    },
    onMessage: (message: Book) => {
      // console.log("queryBooks.onMessage", message.toObject());
    },
    onEnd: (code: Code, msg: string, trailers: Metadata) => {
      // console.log("queryBooks.onEnd", code, msg, trailers);
    }
  });
}

const getBookButton = document.getElementById('getBook');
if (getBookButton) {
    getBookButton.onclick = (event) => {
        getBook();
    }
}

const queryBooksButton = document.getElementById('queryBooks');
if (queryBooksButton) {
    queryBooksButton.onclick = (event) => {
        queryBooks();
    }
}