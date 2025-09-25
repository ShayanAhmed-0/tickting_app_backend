import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import morganBody from "morgan-body";
import { connectDB } from "./config/db";
// import swaggerJSDoc from "swagger-jsdoc";
// import swaggerUi from 'swagger-ui-express';
// import swaggerOptions from "./config/swagger";
import express, { Request, Response } from "express";
import { API_PREFIX } from "./config/environment";
import authRoutes from "./routes/auth.routes";
import adminMiscRoutes from "./routes/admin/misc.routes";
import miscRoutes from "./routes/misc.routes";
import webRoutes from "./routes/web/general.routes";

dotenv.config();

const app = express();

connectDB();
app.get("/", (req: Request, res: Response) => {
  return res.json({ message: "Welcome to Los-Mismos api" });
});

// const swaggerSpec = swaggerJSDoc(swaggerOptions);
// Middleware
app.use(express.json());
app.use(cors({ origin: "*" }));
app.use(morgan("dev"));
app.use("/public/uploads", express.static("./public/uploads"));
// app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

morganBody(app, {
  prettify: true,
  logReqUserAgent: true,
  logReqDateTime: true,
});

// Routes
app.use(`${API_PREFIX}/auth`, authRoutes);
// misc routes
app.use(`${API_PREFIX}/misc`, miscRoutes);
// admin routes
app.use(`${API_PREFIX}/admin`, adminMiscRoutes);
// web routes
app.use(`/api`, webRoutes);

export default app;
