import type { IBaseResponse } from "@/common/apis/base/res";

const sleep = async (ms: number): Promise<void> => {
  if (ms <= 0) {
    return;
  }
  await new Promise<void>((resolve) => {
    setTimeout(() => resolve(), ms);
  });
};

export const mockSuccess = async <T>(
  data: T,
  message: string = "OK",
  code: number = 200,
  latencyMs: number = 80,
): Promise<IBaseResponse<T>> => {
  await sleep(latencyMs);
  return {
    code,
    message,
    isSuccess: true,
    data,
  };
};

export const mockFailure = async <T>(
  message: string,
  data: T,
  code: number = 500,
  latencyMs: number = 80,
): Promise<IBaseResponse<T>> => {
  await sleep(latencyMs);
  return {
    code,
    message,
    isSuccess: false,
    data,
  };
};
