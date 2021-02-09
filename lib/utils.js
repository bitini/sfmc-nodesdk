const xml2js = require('xml2js');

module.exports = {
	soapCreateRetrieveRequest: function (options) {
		let RetrieveRequestMsg = {
			RetrieveRequest: {
				ObjectType: options.objectType,
				Properties: options.properties
			}
		};

		if (options.mid) {
			RetrieveRequestMsg.RetrieveRequest.ClientIDs = { ID: options.mid };
		}
		else {
			RetrieveRequestMsg.RetrieveRequest.QueryAllAccounts = true;
		}

		if (options.continueRequest) {
			RetrieveRequestMsg.RetrieveRequest.ContinueRequest = options.continueRequest;
		}

		if (options.filter) {
			RetrieveRequestMsg.RetrieveRequest.Filter = this.buildFilter(options.filter);
		}

		return RetrieveRequestMsg;
	},

	soapGetEnvelope: function (requestName, request, header) {
		let envelopeTemplate = {
			"@": {
				"xmlns:soapenv": "http://schemas.xmlsoap.org/soap/envelope/",
				"xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance"
			},
			"soapenv:Header": {
				"Security": {
					"@": {
						"xmlns": "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd"
					}
				}
			},
			"soapenv:Body": {}
		};

		let builder = new xml2js.Builder({
			headless: true,
			explicitRoot: false,
			attrkey: '@',
			rootName: "soapenv:Envelope"
		});

		envelopeTemplate["soapenv:Header"] = header;
		envelopeTemplate["soapenv:Body"] = {};
		envelopeTemplate["soapenv:Body"][requestName] = request;
		envelopeTemplate["soapenv:Body"][requestName]["@"] = { xmlns: 'http://exacttarget.com/wsdl/partnerAPI' };

		return builder.buildObject(envelopeTemplate);
	},

	soapGetHeader: function (token) {
		return {
			fueloauth: {
				"@": {
					xmlns: "http://exacttarget.com"
				},
				"_": "eyJhbGciOiJIUzI1NiIsImtpZCI6IjEiLCJ2ZXIiOiIxIiwidHlwIjoiSldUIn0.eyJhY2Nlc3NfdG9rZW4iOiI2RlUxdGlUb3FWbDRKV0pMZHJsSmVYOXoiLCJjbGllbnRfaWQiOiJtMHVreW1ieWhldnRjamFwa3hndXlvYjQiLCJlaWQiOjYzNjYwOTAsInN0YWNrX2tleSI6IlM2IiwicGxhdGZvcm1fdmVyc2lvbiI6MiwiY2xpZW50X3R5cGUiOiJDb25maWRlbnRpYWwifQ.EjrzJ2VoowxuBmXHmK4tuap1T2ygrztPIelmkonqgsM.-S7XyEMue3mJPZ58EoYL3_Fd0rVdKaeBWfmj_3vGBKf9Hlcb1kP5uBOOHbSV8Yc_pIk2r2kKp9CGVm5Ki3v9wzn3f_Mv7wmuYxqizgvz7GdxZFvyj1Q-8naGlYDUryyXkFl6nnGUD7R_iExPaNnEkmoH2ScgCzPkuI18qFqJ2bTtCz2yeE313VSnc"
			}
		};
	},

	soapParseReponse: async function (response) {
		return new Promise((resolve, reject) => {
			xml2js.parseString(response, { ignoreAttrs: true, explicitArray: false }, function (err, outputObject) {
				if (err) {
					reject({ message: "Error parsing soap response", error: err, response: response });
				}
				else {
					if (outputObject && outputObject['soap:Envelope'] && outputObject['soap:Envelope']['soap:Body']) {
						let body = outputObject['soap:Envelope']['soap:Body'];
						let properties = Object.keys(body);

						if (body["soap:Fault"]) {
							reject(body);
							return;
						}

						if (properties.length > 0 && properties[0].toLowerCase().indexOf("response") > 0 && body[properties[0]].OverallStatus == "Error") {
							reject(body);
						}

						resolve(body);
					}
					else {
						reject(response);
					}
				}
			});
		});
	},

	getBaseUri: function (authBaseUri, type) {
		let match = authBaseUri.match(/https\:\/\/(?<domain>[^\.]+)\./i);

		if (match && match.groups && match.groups.domain) {
			return `https://${match.groups.domain}.${type}.marketingcloudapis.com/`;
		}

		return null;
	},

	buildFilter: function (filter) {
		if (!filter.logicalOperator) {
			filter['@'] = { 'xsi:type': 'SimpleFilterPart' };
			return filter;
		}

		let result = {
			'@': { 'xsi:type': 'ComplexFilterPart' }
		};

		result.LeftOperand = this.buildFilter(filter.leftOperand);
		result.RightOperand = this.buildFilter(filter.rightOperand);
		result.LogicalOperator = filter.logicalOperator;

		return result;
	},

	getRootFolderCustomKeyByType: function (type) {
		switch (type) {
			case "dataextension":
				return "dataextension_default"
		}

		return null;
	},

	extend: function (origin, add) {
		// Don't do anything if add isn't an object
		if (!add || typeof add !== 'object') return origin;

		let keys = Object.keys(add);
		let i = keys.length;

		while (i--) {
			origin[keys[i]] = add[keys[i]];
		}
		return origin;
	}
}