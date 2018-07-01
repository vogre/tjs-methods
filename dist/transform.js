"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const toposort = require("toposort");
function typeToString({ type, format, $ref, anyOf, allOf, properties, items }) {
    if (typeof type === 'string') {
        if (type === 'object') {
            const propString = Object.entries(properties).map(([n, p]) => `${n}: ${typeToString(p)};`).join(' ');
            return `{ ${propString} }`;
        }
        if (type === 'array') {
            if (Array.isArray(items)) {
                return `[${items.map(typeToString).join(', ')}]`;
            }
            else if (lodash_1.isPlainObject(items)) {
                return `${typeToString(items)}[]`;
            }
            else {
                throw new Error(`Invalid type for items: ${items}`);
            }
        }
        if (type === 'integer') {
            return 'number';
        }
        if (type === 'string' && format === 'date-time') {
            return 'Date';
        }
        return type;
    }
    if (typeof $ref === 'string') {
        return $ref.replace(/#\/definitions\//, '');
    }
    if (Array.isArray(anyOf)) {
        return anyOf.map(typeToString).join(' | ');
    }
    if (Array.isArray(allOf)) {
        return allOf.map(typeToString).join(' & ');
    }
    throw new Error('Could not determine type');
}
exports.typeToString = typeToString;
function findRefs(definition) {
    if (lodash_1.isPlainObject(definition)) {
        const refs = lodash_1.flatMap(Object.values(definition), findRefs);
        if (definition.$ref) {
            return [definition.$ref, ...refs];
        }
        return refs;
    }
    if (Array.isArray(definition)) {
        return lodash_1.flatMap(definition, findRefs);
    }
    return [];
}
exports.findRefs = findRefs;
function sortDefinitions(definitions) {
    const order = toposort(lodash_1.flatMap(Object.entries(definitions), ([k, d]) => findRefs(d).map((r) => [r.replace(/^#\/definitions\//, ''), k])));
    return Object.entries(definitions).sort(([a], [b]) => order.indexOf(a) - order.indexOf(b));
}
exports.sortDefinitions = sortDefinitions;
function isMethod(m) {
    return m && m.properties && m.properties.params && m.properties.returns;
}
function isString(p) {
    return p && p.type === 'string';
}
function isException(s) {
    const props = s && s.properties;
    return ['name', 'message', 'stack'].every((p) => isString(props[p]));
}
function transformClassPair([className, { properties }]) {
    return {
        name: className,
        methods: Object.entries(properties)
            .filter(([_, method]) => isMethod(method))
            .map(([methodName, method]) => {
            const params = Object.entries(method.properties.params.properties);
            const order = method.properties.params.propertyOrder;
            return {
                name: methodName,
                parameters: params
                    .sort(([n1], [n2]) => order.indexOf(n1) - order.indexOf(n2))
                    .map(([paramName, param], i) => ({
                    name: paramName,
                    type: typeToString(param),
                    last: i === params.length - 1,
                })),
                returnType: typeToString(method.properties.returns),
                throws: method.properties.throws ? typeToString(method.properties.throws).split(' | ') : [],
            };
        }),
        attributes: Object.entries(properties)
            .filter(([_, method]) => !isMethod(method))
            .map(([attrName, attrDef]) => ({
            name: attrName,
            type: typeToString(attrDef),
        })),
    };
}
exports.transformClassPair = transformClassPair;
function transform(schema) {
    const { definitions } = schema;
    const sortedDefinitions = sortDefinitions(definitions);
    const classDefinitions = sortedDefinitions.filter(([_, { properties }]) => properties);
    const [exceptionsWithName, classesWithName] = lodash_1.partition(classDefinitions, ([_, s]) => isException(s));
    const exceptions = exceptionsWithName.map(transformClassPair);
    const classes = classesWithName.map(transformClassPair);
    const context = classes.find(({ name }) => name === 'Context');
    return {
        schema: JSON.stringify(schema),
        classes,
        exceptions,
        context,
    };
}
exports.transform = transform;
//# sourceMappingURL=transform.js.map