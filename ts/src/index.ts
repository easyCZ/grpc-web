import { grpc } from './grpc';

export {
  grpc,
  Metadata as BrowserHeaders,
  Metadata,
  Code,
  Transport,
  TransportOptions,
} from "./grpc";

export {
  DebuggerProvider,
  Debugger,
  ConsoleDebugger,
  ConsoleDebuggerProvider,
} from './debug';

// Export to window in browsers
if (window) {
  (window as any).grpc = grpc;
}