const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

export const encode = (num: number | bigint): string => {
  let current = BigInt(num);

  if (current < 0n) {
    throw new Error("encode expects a non-negative integer");
  }

  if (current === 0n) {
    return chars[0];
  }

  let result = "";

  while (current > 0n) {
    result = chars[Number(current % 62n)] + result;
    current = current / 62n;
  }

  return result;
};
