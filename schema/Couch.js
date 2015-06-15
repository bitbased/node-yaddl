var { Schema, Document } from '../mongoose-shim';

/* Couch Comment*/

var CouchSchema = new Schema({
    couchMayor: {
        type: Schema.Types.ObjectId,
        ref: "Employee"
    },
    sitters: [{
        type: Schema.Types.ObjectId,
        ref: "Employee"
    }],
    numberOfSits: Number,
    name: String
});

module.exports = CouchSchema;
