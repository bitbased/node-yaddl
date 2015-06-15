var { Schema, Document } from '../mongoose-shim';

var EmployeeSchema = new Schema({
    couchMayor: [{
        type: Schema.Types.ObjectId,
        ref: "Couch"
    }],
    companyId: {
        type: Schema.Types.ObjectId,
        ref: "Company"
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    ssn: {
        type: String,
        required: true,
        unique: true
    },
    email: String,
    name: {
        type: String,
        required: true
    }
});

EmployeeSchema.schema = EmployeeSchema.schema || {};
EmployeeSchema.schema.path('ssn').validate(function(value) {
    return /[0-9]{3}-?[0-9]{2}-?[0-9]{4}/i.test(value);
}, 'Invalid Social Security Number');

module.exports = EmployeeSchema;
