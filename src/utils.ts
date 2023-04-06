import { Interface } from "node:readline/promises";

export interface SuccessResponse {
  code: number;
  payload: any;
}

export interface SuccessActionResult {
  result: any;
}

export interface ErrorActionResult {
  error: any;
}

export interface ErrorResponse {
  code: number;
  error: {
    message: string;
    rest: any;
  };
}

export const successRes = <T>(data: T): { code: number; payload: T } => ({
  code: 200,
  payload: data,
});

export const isSuccessResponse = (data: any): Boolean => data && data.payload;

export const errorRes = (
  code: number | null,
  message: any,
  ...rest: Interface[]
): ErrorResponse => ({
  code: code || 500,
  error: { message, rest },
});

export const isErrorResponse = (data: any): boolean => data && data.error;

export const successActionResult = (d: any): SuccessActionResult => ({
  result: d,
});
export const errorActionResult = (e: any): ErrorActionResult => ({ error: e });

export const isSuccessResult = (i: any): boolean => !i.error && i.result;
export const isErrorResult = (x: any): boolean => x.error && !x.result;

export const isNotNullOrUndefined = (value: any): boolean =>
  value !== undefined && value !== null;
export const isNullOrUndefined = (value: any): boolean =>
  value === undefined || value === null;

export const betweenHours = (
  start: number,
  end: number,
  hour: number,
  minute: number
): boolean => {
  if (minute > 0) {
    hour += minute / 100;
  }

  if (start < end) {
    return start <= hour && end >= hour;
  } else {
    return start <= hour || end >= hour;
  }
};

export const IsNotNullOrUndefined = (value: any) =>
  value !== undefined && value !== null;
export const IsNullOrUndefined = (value: any) =>
  value === undefined || value === null;

export const dayStartHour = (date: string | Date): Date => {
  const time = new Date(date);
  if (time.toString() === "Invalid Date") {
    throw new Error("Invalid date");
  }
  time.setHours(9, 0, 0, 0);
  return time;
};

export const operationalDate = (date: string | Date): Date => {
  const d = new Date(date);
  const h = d.getHours();
  const m = d.getMinutes();
  if (betweenHours(0, 9, h, m)) {
    d.setDate(d.getDate() - 1);
  }
  return dayStartHour(d);
};

export const addDays = (date: string | Date, days: number): Date => {
  const result = new Date(date);
  if (result.toString() === "Invalid Date") {
    throw new Error("Invalid Date");
  }
  result.setDate(result.getDate() + days);
  return result;
};

export const arrayIsEmpty = (v: any) => Array.isArray(v) && v.length == 0;
export const arrayIsNotEmpty = (v: any) => !arrayIsEmpty(v);
