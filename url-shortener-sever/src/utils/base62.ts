const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

export const encode = (num: number): string => {
  if (!Number.isInteger(num) || num < 0) {
    throw new Error("encode expects a non-negative integer");
  }

  if (num === 0) {
    return chars[0];
  }

  let result = "";
  let current = num;

  while (current > 0) {
    result = chars[current % 62] + result;
    current = Math.floor(current / 62);
  }

  return result;
};
