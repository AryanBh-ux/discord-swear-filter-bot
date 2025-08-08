import { io, Socket } from "socket.io-client";
import { useEffect, useRef } from "react";

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = io("/", { path: "/socket.io" });
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  return socketRef.current;
};
