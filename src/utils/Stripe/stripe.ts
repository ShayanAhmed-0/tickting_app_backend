import Stripe from "stripe";
import { STRIPE_SECRET_KEY } from "../../config/environment";

require("dotenv").config();

const stripe = new Stripe(STRIPE_SECRET_KEY as string);

export const createPaymentIntent = async (amount: number, metadata?: any) => {
    console.log(metadata)
    // const totalToCharge = calculateTotalCharge(amount * 100);
    // metadata.totalToCharge = totalToCharge
    const paymentIntent = await stripe.paymentIntents.create({
        amount: amount * 100,
        currency: 'usd',
        metadata: metadata, // helpful for webhook
    });

    return paymentIntent
}