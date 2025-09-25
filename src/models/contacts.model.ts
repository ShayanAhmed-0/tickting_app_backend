import { Schema, model } from "mongoose";

const contactSchema = new Schema({
    emailAddress: {
        type: String,
        required: true,
    },
    phoneNumber: {
        type: String,
        required: true,
    },
}, {
    timestamps: true
}
);

const contactsModel = model("contacts", contactSchema);

export default contactsModel;
