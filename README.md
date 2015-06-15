# Yaddl

This project rocks and uses MIT-LICENSE.

# Usage

`$ yaddl`

### Example Input

/db/schema.yaddl
```javascript
TestModel(name:String)
  *RelatedModel
```

### Output

/app/models/test_model.rb
```javascript

```

# Syntax

Legend:
- attribute:Type - a model attribute; inline format will create 'primary references' for display ex: Model(name:String)
- Reference - has_one
- +Reference - belongs_to
- *Multiplicity - has_many
- +*Multiplicity - refs_many, where supported, ie: mongo array of ObjectId's
- .SubDocument - local/sub document, entry, ex: .SubDocument, .*SubDocumentArray, .sub_name:NamedSubDocument
- @Mixin - define or use mixin
- { code() } - code will be added to model
- !!{ruby_code} - unique ruby_code will be added to model only once
- $code() - code statements called on model
- $code = { value } - code value set on model

---

# Example Yaddl File

```javascript
Employee(name { required: true })

  email
  ssn:String { required: true, unique: true }
  createdAt:Date { default: Date.now }

  // Validate SSN, only for "mongoose" config
  <mongoose>$schema.path('ssn').validate(function (value) {
    return /[0-9]{3}-?[0-9]{2}-?[0-9]{4}/i.test(value);
  }, 'Invalid Social Security Number')

  +Company(name, token)
    token

    // Company contains references to many Buildings
    +*Building

    // And the inverse, each building belnogs to one Company
    *Building
      // config sections, only executed for the "mongoose" template
      <mongoose>
        {
          import { default as CouchSchema } from "./Couch";
        }
      </mongoose>

      // Building contains many Couch documents
      .*Couch
        { /* Couch Comment*/ }
        name
        numberOfSits:Number
        +*sitters:Employee
        +couchMayor:Employee

```

# Example Hbx File (Handlebars with `<` `>` delimiters)

```jsx
<#each models>
//#FILE <@key>.js

var { Schema, Document } from '../mongoose-shim';

<#each $code>
<~#xif "this[0] == '{'"><extractBlock this></xif~>
<~#xif "this[0] == '/'"><this></xif>
</each>
<#each included>
import { default as <type>Schema } from './<type>';
</each>


var <@key>Schema = new Schema(<json this filter="$code $includes $options" quotedKeys="auto"><#if $options>, <json $options quotedKeys="auto"></if>);

<#each $code>
  <#xif "this[0] == '$'">
    <#xif "this[1] == '{' || this[1] == '}'">
      <extractBlock this>
    <else>
      <#ensureProperty><@../key>Schema.<extractStatement this></ensureProperty>
      <~@../key>Schema.<extractStatement this>;
    </xif>
  </xif>
</each>

module.exports = <@key>Schema;

</each>
```