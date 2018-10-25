"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
require("mocha");
const transform_1 = require("./transform");
const exceptionSchema = {
    properties: {
        message: {
            type: 'string',
        },
        name: {
            type: 'string',
        },
        stack: {
            type: 'string',
        },
    },
    propertyOrder: [
        'name',
        'message',
        'stack',
    ],
    required: [
        'message',
        'name',
    ],
    type: 'object',
};
describe('findRefs', () => {
    it('finds all reffed types', () => {
        const result = transform_1.findRefs({
            properties: {
                x: {
                    type: {
                        $ref: '#/definitions/X',
                    },
                },
                y: {
                    type: 'array',
                    items: {
                        type: {
                            $ref: '#/definitions/Y',
                        },
                    },
                },
                z: {
                    type: 'method',
                    parameters: [
                        {
                            name: 'z',
                            type: {
                                $ref: '#/definitions/Z',
                            },
                        },
                    ],
                    returnType: 'string',
                },
            },
        });
        chai_1.expect(result).to.eql(['#/definitions/X', '#/definitions/Y', '#/definitions/Z']);
    });
});
describe('typeToString', () => {
    it('transforms integer to number', () => {
        const result = transform_1.typeToString({ type: 'integer' });
        chai_1.expect(result).to.equal('number');
    });
    it('passes through a string type', () => {
        const result = transform_1.typeToString({ type: 'string' });
        chai_1.expect(result).to.equal('string');
    });
    it('transforms launchType to launchType', () => {
        const result = transform_1.typeToString({ type: 'string', launchType: 'LT' });
        chai_1.expect(result).to.equal('LT');
    });
    it('transforms ref into class name', () => {
        const result = transform_1.typeToString({ $ref: '#/definitions/User' });
        chai_1.expect(result).to.equal('User');
    });
    it('transforms date-time format into Date', () => {
        const result = transform_1.typeToString({ type: 'string', format: 'date-time' });
        chai_1.expect(result).to.equal('Date');
    });
    it('transforms enum into pipe separated string', () => {
        const result = transform_1.typeToString({
            type: 'string',
            enum: ['a', 'b'],
        });
        chai_1.expect(result).to.equal('"a" | "b"');
    });
    it('transforms anyOf into pipe separated string', () => {
        const result = transform_1.typeToString({
            anyOf: [
                {
                    type: 'string',
                },
                {
                    $ref: '#/definitions/User',
                },
            ],
        });
        chai_1.expect(result).to.equal('string | User');
    });
    it('transforms allOf into ampersand separated string', () => {
        const result = transform_1.typeToString({
            allOf: [
                {
                    $ref: '#/definitions/User',
                },
                {
                    $ref: '#/definitions/Abuser',
                },
            ],
        });
        chai_1.expect(result).to.equal('User & Abuser');
    });
    it('transforms object into TS interface', () => {
        const result = transform_1.typeToString({
            type: 'object',
            properties: {
                user: {
                    $ref: '#/definitions/User',
                },
                created: {
                    type: 'string',
                    format: 'date-time',
                },
            },
            required: ['user'],
        });
        chai_1.expect(result).to.equal('{ user: User; created?: Date; }');
    });
    it('transforms array with items as object into TS interface', () => {
        const result = transform_1.typeToString({
            type: 'array',
            items: {
                $ref: '#/definitions/User',
            },
        });
        chai_1.expect(result).to.equal('User[]');
    });
    it('transforms array with items as array into TS interface', () => {
        const result = transform_1.typeToString({
            type: 'array',
            items: [
                {
                    $ref: '#/definitions/User',
                },
                {
                    type: 'string',
                    format: 'date-time',
                },
            ],
        });
        chai_1.expect(result).to.equal('[User, Date]');
    });
});
describe('transform', () => {
    it('transforms a simple class with single attribute', () => {
        const schema = {
            definitions: {
                Test: {
                    properties: {
                        x: {
                            type: 'number',
                        },
                    },
                },
            },
        };
        const result = transform_1.transform(schema);
        chai_1.expect(result).to.eql({
            schema: JSON.stringify(schema),
            exceptions: [],
            classes: [
                {
                    name: 'Test',
                    attributes: [
                        {
                            name: 'x',
                            type: 'number',
                            optional: true,
                        },
                    ],
                    methods: [],
                },
            ],
            clientContext: undefined,
            serverOnlyContext: undefined,
            serverContext: undefined,
            enums: [],
            bypassTypes: [],
        });
    });
    it('transforms a simple class with single method', () => {
        const schema = {
            definitions: {
                Test: {
                    properties: {
                        add: {
                            type: 'object',
                            properties: {
                                params: {
                                    type: 'object',
                                    properties: {
                                        b: {
                                            type: 'integer',
                                        },
                                        a: {
                                            type: 'integer',
                                        },
                                    },
                                    propertyOrder: ['a', 'b'],
                                },
                                returns: {
                                    type: 'integer',
                                },
                            },
                        },
                    },
                },
            },
        };
        const result = transform_1.transform(schema);
        chai_1.expect(result).to.eql({
            schema: JSON.stringify(schema),
            exceptions: [],
            classes: [
                {
                    name: 'Test',
                    attributes: [],
                    methods: [
                        {
                            name: 'add',
                            parameters: [
                                {
                                    name: 'a',
                                    type: 'number',
                                    optional: true,
                                    last: false,
                                },
                                {
                                    name: 'b',
                                    type: 'number',
                                    optional: true,
                                    last: true,
                                },
                            ],
                            returnType: 'number',
                            throws: [],
                        },
                    ],
                },
            ],
            clientContext: undefined,
            serverOnlyContext: undefined,
            serverContext: undefined,
            enums: [],
            bypassTypes: [],
        });
    });
    it('sorts output class by checking references', () => {
        const result = transform_1.transform({
            definitions: {
                A: {
                    properties: {
                        foo: {
                            type: 'object',
                            properties: {
                                params: {
                                    properties: {
                                        b: {
                                            $ref: '#/definitions/B',
                                        },
                                    },
                                    propertyOrder: ['b'],
                                },
                                returns: {
                                    type: 'string',
                                },
                            },
                        },
                    },
                },
                B: {
                    properties: {
                        bar: {
                            type: 'object',
                            properties: {
                                params: {
                                    properties: {
                                        c: {
                                            $ref: '#/definitions/C',
                                        },
                                    },
                                    propertyOrder: ['b'],
                                },
                                returns: {
                                    type: 'string',
                                },
                            },
                        },
                    },
                },
                C: {
                    properties: {
                        baz: {
                            type: 'string',
                        },
                    },
                },
            },
        });
        chai_1.expect(result.classes.map(({ name }) => name)).to.eql(['C', 'B', 'A']);
    });
    it('transforms exceptions', () => {
        const schema = {
            definitions: {
                Test: {
                    properties: {
                        add: {
                            type: 'object',
                            properties: {
                                params: {
                                    type: 'object',
                                    properties: {},
                                },
                                returns: {
                                    type: 'integer',
                                },
                                throws: {
                                    $ref: '#/definitions/RuntimeError',
                                },
                            },
                        },
                    },
                },
                RuntimeError: exceptionSchema,
            },
        };
        const result = transform_1.transform(schema);
        chai_1.expect(result).to.eql({
            schema: JSON.stringify(schema),
            exceptions: [
                {
                    name: 'RuntimeError',
                    attributes: [
                        {
                            name: 'message',
                            type: 'string',
                            optional: false,
                        },
                        {
                            name: 'name',
                            type: 'string',
                            optional: false,
                        },
                        {
                            name: 'stack',
                            type: 'string',
                            optional: true,
                        },
                    ],
                    methods: [],
                },
            ],
            classes: [
                {
                    name: 'Test',
                    attributes: [],
                    methods: [
                        {
                            name: 'add',
                            parameters: [],
                            returnType: 'number',
                            throws: ['RuntimeError'],
                        },
                    ],
                },
            ],
            clientContext: undefined,
            serverOnlyContext: undefined,
            serverContext: undefined,
            enums: [],
            bypassTypes: [],
        });
    });
    it('returns a context class when given a Context interface', () => {
        const result = transform_1.transform({
            definitions: {
                ClientContext: {
                    properties: {
                        foo: {
                            type: 'string',
                        },
                    },
                    required: ['foo'],
                },
            },
        });
        chai_1.expect(result.clientContext).to.eql({
            name: 'ClientContext',
            attributes: [
                {
                    name: 'foo',
                    type: 'string',
                    optional: false,
                },
            ],
            methods: [],
        });
    });
    it('throws when passed non string enum', () => {
        chai_1.expect(() => transform_1.transform({
            definitions: {
                OneTwoThree: {
                    type: 'number',
                    enum: [1, 2, 3],
                },
            },
        })).to.throw('Unsupported enum type definitions found (expected string values only): OneTwoThree');
    });
    it('throws when passed string enum with invalid value', () => {
        chai_1.expect(() => transform_1.transform({
            definitions: {
                InvalidStringEnum: {
                    type: 'string',
                    enum: ['1ss', 'sss'],
                },
            },
        })).to.throw(/^Unsupported enum value found \(does not match .+\): InvalidStringEnum$/);
    });
});
//# sourceMappingURL=test.js.map