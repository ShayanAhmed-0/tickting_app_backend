import app from "./app";
import { PORT } from "./config/environment";

const SERVER_PORT = PORT || 5000;

app.listen(SERVER_PORT, () => {
  console.log(`Server running on port ${SERVER_PORT}`);
});
