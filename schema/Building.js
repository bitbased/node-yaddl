var { Schema, Document } from '../mongoose-shim';

// And the inverse, each building belnogs to one Company
import { default as CouchSchema } from "./Couch";

var BuildingSchema = new Schema({
    couches: [CouchSchema],
    companyId: {
        type: Schema.Types.ObjectId,
        ref: "Company"
    }
});

module.exports = BuildingSchema;
