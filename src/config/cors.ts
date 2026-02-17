import createCors from "cors";
import { env } from "./env";

const origin = env.isProduction
  ? env.corsOrigin
    ? env.corsOrigin.split(",").map((s) => s.trim())
    : false
  : true;

const cors = createCors({ origin });

export { cors };
