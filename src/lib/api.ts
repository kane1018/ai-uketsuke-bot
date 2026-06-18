import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function jsonError(message: string, status = 400, extra?: object) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export function jsonOk(data: object, status = 200) {
  return NextResponse.json(data, { status });
}

// Turn a thrown error into a safe JSON response (no internal leakage).
export function handleRouteError(err: unknown) {
  if (err instanceof ZodError) {
    return jsonError(
      err.issues[0]?.message ?? "入力内容が正しくありません",
      422
    );
  }
  console.error("[api] unhandled error:", err);
  return jsonError("サーバーエラーが発生しました", 500);
}
