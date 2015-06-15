var { Schema, Document } from '../mongoose-shim';

var CompanySchema = new Schema({
    buildingIds: [{
        type: Schema.Types.ObjectId,
        ref: "Building"
    }],
    token: String,
    name: String,
    employeeIds: [{
        type: Schema.Types.ObjectId,
        ref: "Employee"
    }]
});

module.exports = CompanySchema;
