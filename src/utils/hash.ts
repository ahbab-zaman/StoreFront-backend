import bcrypt from "bcrypt";
import crypto from "crypto";

const SALT_ROUNDS = 10;

export const hashValue = async (value: string): Promise<string> => {
  return await bcrypt.hash(value, SALT_ROUNDS);
};

export const compareValue = async (
  value: string,
  hashedValue: string,
): Promise<boolean> => {
  return await bcrypt.compare(value, hashedValue);
};

export const hashToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};
