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
import crypto from "crypto";
import adminDriverRoutes from "./routes/admin/driver.routes";
import adminBusRoutes from "./routes/admin/bus.routes";
import adminSalesOfficeRoutes from "./routes/admin/sales-office.routes";
import adminDestinationRoutes from "./routes/admin/destinations.routes";
import adminRoutesRoutes from "./routes/admin/routes.routes";
import bookingRoutes from "./routes/booking.routes";
import destinationRoutes from "./routes/destinations.routes";
import routesRoutes from "./routes/routes.routes";
import stripeWebhookRoutes from "./routes/stripe-webhook.routes";

dotenv.config();

const app = express();
if(!globalThis.crypto){
  globalThis.crypto = crypto as any;
}
connectDB();
app.get("/", (req: Request, res: Response) => {
  return res.json({ message: "Welcome to Los-Mismos api" });
});

// Stripe webhook route MUST be before express.json() middleware
// Stripe requires raw body for signature verification
app.use('/api/stripe', stripeWebhookRoutes);

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
app.use(`${API_PREFIX}/destination`, destinationRoutes);
app.use(`${API_PREFIX}/routes`, routesRoutes);
app.use(`${API_PREFIX}/booking`, bookingRoutes);
// misc routes
app.use(`${API_PREFIX}/misc`, miscRoutes);
// admin routes
app.use(`${API_PREFIX}/admin`, adminMiscRoutes);
app.use(`${API_PREFIX}/admin/driver`, adminDriverRoutes);
app.use(`${API_PREFIX}/admin/bus`, adminBusRoutes);
app.use(`${API_PREFIX}/admin/sales-office`, adminSalesOfficeRoutes);
app.use(`${API_PREFIX}/admin/destination`, adminDestinationRoutes);
app.use(`${API_PREFIX}/admin/routes`, adminRoutesRoutes);
// booking routes (real-time seat booking)
// web routes
app.use(`/api`, webRoutes);

export default app;
