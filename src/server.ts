import app from "./app";
import { env } from "./config/env";

app.listen(env.PORT, () => {
  console.log(`valpo-verde-backend escuchando en puerto ${env.PORT}`);
});
