/**
 * Create a typed-function which checks the types of the arguments and
 * can match them against multiple provided signatures. The typed-function
 * automatically converts inputs in order to find a matching signature.
 * Typed functions throw informative errors in case of wrong input arguments.
 *
 * See the library [typed-function](https://github.com/josdejong/typed-function)
 * for detailed documentation.
 *
 * Syntax:
 *
 *     math.typed(name, signatures) : function
 *     math.typed(signatures) : function
 *
 * Examples:
 *
 *     // create a typed function with multiple types per argument (type union)
 *     const fn2 = typed({
 *       'number | boolean': function (b) {
 *         return 'b is a number or boolean'
 *       },
 *       'string, number | boolean': function (a, b) {
 *         return 'a is a string, b is a number or boolean'
 *       }
 *     })
 *
 *     // create a typed function with an any type argument
 *     const log = typed({
 *       'string, any': function (event, data) {
 *         console.log('event: ' + event + ', data: ' + JSON.stringify(data))
 *       }
 *     })
 *
 * @param {string} [name]                          Optional name for the typed-function
 * @param {Object<string, function>} signatures   Object with one or multiple function signatures
 * @returns {function} The created typed-function.
 */

import typedFunction from 'typed-function'
import { factory } from '../../utils/factory.js'
import {
  isAccessorNode,
  isArray,
  isArrayNode,
  isAssignmentNode,
  isBigInt,
  isBigNumber,
  isBlockNode,
  isBoolean,
  isChain,
  isCollection,
  isComplex,
  isConditionalNode,
  isConstantNode,
  isDate,
  isDenseMatrix,
  isFraction,
  isFunction,
  isFunctionAssignmentNode,
  isFunctionNode,
  isHelp,
  isIndex,
  isIndexNode,
  isMap,
  isMatrix,
  isNode,
  isNull,
  isNumber,
  isObject,
  isObjectNode,
  isOperatorNode,
  isParenthesisNode,
  isRange,
  isRangeNode,
  isRegExp,
  isRelationalNode,
  isResultSet,
  isSparseMatrix,
  isString,
  isSymbolNode,
  isUndefined,
  isUnit
} from '../../utils/is.js'
import { digits } from '../../utils/number.js'

// returns a new instance of typed-function
let _createTyped = function () {
  // initially, return the original instance of typed-function
  // consecutively, return a new instance from typed.create.
  _createTyped = typedFunction.create
  return typedFunction
}

const dependencies = [
  '?BigNumber',
  '?Complex',
  '?DenseMatrix',
  '?Fraction'
]

/**
 * Factory function for creating a new typed instance
 * @param {Object} dependencies   Object with data types like Complex and BigNumber
 * @returns {Function}
 */
export const createTyped = /* #__PURE__ */ factory('typed', dependencies, function createTyped ({ BigNumber, Complex, DenseMatrix, Fraction }) {
  // TODO: typed-function must be able to silently ignore signatures with unknown data types

  // get a new instance of typed-function
  const typed = _createTyped()

  // define all types. The order of the types determines in which order function
  // arguments are type-checked (so for performance it's important to put the
  // most used types first).
  typed.clear()
  typed.addTypes([
    { name: 'number', test: isNumber },
    { name: 'Complex', test: isComplex },
    { name: 'BigNumber', test: isBigNumber },
    { name: 'bigint', test: isBigInt },
    { name: 'Fraction', test: isFraction },
    { name: 'Unit', test: isUnit },
    // The following type matches a valid variable name, i.e., an alphanumeric
    // string starting with an alphabetic character. It is used (at least)
    // in the definition of the derivative() function, as the argument telling
    // what to differentiate over must (currently) be a variable.
    {
      name: 'identifier',
      test: s => isString && /^\p{L}[\p{L}\d]*$/u.test(s)
    },
    { name: 'string', test: isString },
    { name: 'Chain', test: isChain },
    { name: 'Array', test: isArray },
    { name: 'Matrix', test: isMatrix },
    { name: 'DenseMatrix', test: isDenseMatrix },
    { name: 'SparseMatrix', test: isSparseMatrix },
    { name: 'Range', test: isRange },
    { name: 'Index', test: isIndex },
    { name: 'boolean', test: isBoolean },
    { name: 'ResultSet', test: isResultSet },
    { name: 'Help', test: isHelp },
    { name: 'function', test: isFunction },
    { name: 'Date', test: isDate },
    { name: 'RegExp', test: isRegExp },
    { name: 'null', test: isNull },
    { name: 'undefined', test: isUndefined },

    { name: 'AccessorNode', test: isAccessorNode },
    { name: 'ArrayNode', test: isArrayNode },
    { name: 'AssignmentNode', test: isAssignmentNode },
    { name: 'BlockNode', test: isBlockNode },
    { name: 'ConditionalNode', test: isConditionalNode },
    { name: 'ConstantNode', test: isConstantNode },
    { name: 'FunctionNode', test: isFunctionNode },
    { name: 'FunctionAssignmentNode', test: isFunctionAssignmentNode },
    { name: 'IndexNode', test: isIndexNode },
    { name: 'Node', test: isNode },
    { name: 'ObjectNode', test: isObjectNode },
    { name: 'OperatorNode', test: isOperatorNode },
    { name: 'ParenthesisNode', test: isParenthesisNode },
    { name: 'RangeNode', test: isRangeNode },
    { name: 'RelationalNode', test: isRelationalNode },
    { name: 'SymbolNode', test: isSymbolNode },

    { name: 'Map', test: isMap },
    { name: 'Object', test: isObject } // order 'Object' last, it matches on other classes too
  ])

  typed.addConversions([
    {
      from: 'number',
      to: 'BigNumber',
      convert: function (x) {
        if (!BigNumber) {
          throwNoBignumber(x)
        }

        // note: conversion from number to BigNumber can fail if x has >15 digits
        if (digits(x) > 15) {
          throw new TypeError('Cannot implicitly convert a number with >15 significant digits to BigNumber ' +
            '(value: ' + x + '). ' +
            'Use function bignumber(x) to convert to BigNumber.')
        }
        return new BigNumber(x)
      }
    }, {
      from: 'number',
      to: 'Complex',
      convert: function (x) {
        if (!Complex) {
          throwNoComplex(x)
        }

        return new Complex(x, 0)
      }
    }, {
      from: 'BigNumber',
      to: 'Complex',
      convert: function (x) {
        if (!Complex) {
          throwNoComplex(x)
        }

        return new Complex(x.toNumber(), 0)
      }
    }, {
      from: 'bigint',
      to: 'number',
      convert: function (x) {
        if (x > Number.MAX_SAFE_INTEGER) {
          throw new TypeError('Cannot implicitly convert bigint to number: ' +
            'value exceeds the max safe integer value (value: ' + x + ')')
        }

        return Number(x)
      }
    }, {
      from: 'bigint',
      to: 'BigNumber',
      convert: function (x) {
        if (!BigNumber) {
          throwNoBignumber(x)
        }

        return new BigNumber(x.toString())
      }
    }, {
      from: 'bigint',
      to: 'Fraction',
      convert: function (x) {
        if (!Fraction) {
          throwNoFraction(x)
        }

        return new Fraction(x.toString())
      }
    }, {
      from: 'Fraction',
      to: 'BigNumber',
      convert: function (x) {
        throw new TypeError('Cannot implicitly convert a Fraction to BigNumber or vice versa. ' +
          'Use function bignumber(x) to convert to BigNumber or fraction(x) to convert to Fraction.')
      }
    }, {
      from: 'Fraction',
      to: 'Complex',
      convert: function (x) {
        if (!Complex) {
          throwNoComplex(x)
        }

        return new Complex(x.valueOf(), 0)
      }
    }, {
      from: 'number',
      to: 'Fraction',
      convert: function (x) {
        if (!Fraction) {
          throwNoFraction(x)
        }

        const f = new Fraction(x)
        if (f.valueOf() !== x) {
          throw new TypeError('Cannot implicitly convert a number to a Fraction when there will be a loss of precision ' +
            '(value: ' + x + '). ' +
            'Use function fraction(x) to convert to Fraction.')
        }
        return f
      }
    }, {
      // FIXME: add conversion from Fraction to number, for example for `sqrt(fraction(1,3))`
      //  from: 'Fraction',
      //  to: 'number',
      //  convert: function (x) {
      //    return x.valueOf()
      //  }
      // }, {
      from: 'string',
      to: 'number',
      convert: function (x) {
        const n = Number(x)
        if (isNaN(n)) {
          throw new Error('Cannot convert "' + x + '" to a number')
        }
        return n
      }
    }, {
      from: 'string',
      to: 'BigNumber',
      convert: function (x) {
        if (!BigNumber) {
          throwNoBignumber(x)
        }

        try {
          return new BigNumber(x)
        } catch (err) {
          throw new Error('Cannot convert "' + x + '" to BigNumber')
        }
      }
    }, {
      from: 'string',
      to: 'bigint',
      convert: function (x) {
        try {
          return BigInt(x)
        } catch (err) {
          throw new Error('Cannot convert "' + x + '" to BigInt')
        }
      }
    }, {
      from: 'string',
      to: 'Fraction',
      convert: function (x) {
        if (!Fraction) {
          throwNoFraction(x)
        }

        try {
          return new Fraction(x)
        } catch (err) {
          throw new Error('Cannot convert "' + x + '" to Fraction')
        }
      }
    }, {
      from: 'string',
      to: 'Complex',
      convert: function (x) {
        if (!Complex) {
          throwNoComplex(x)
        }

        try {
          return new Complex(x)
        } catch (err) {
          throw new Error('Cannot convert "' + x + '" to Complex')
        }
      }
    }, {
      from: 'boolean',
      to: 'number',
      convert: function (x) {
        return +x
      }
    }, {
      from: 'boolean',
      to: 'BigNumber',
      convert: function (x) {
        if (!BigNumber) {
          throwNoBignumber(x)
        }

        return new BigNumber(+x)
      }
    }, {
      from: 'boolean',
      to: 'bigint',
      convert: function (x) {
        return BigInt(+x)
      }
    }, {
      from: 'boolean',
      to: 'Fraction',
      convert: function (x) {
        if (!Fraction) {
          throwNoFraction(x)
        }

        return new Fraction(+x)
      }
    }, {
      from: 'boolean',
      to: 'string',
      convert: function (x) {
        return String(x)
      }
    }, {
      from: 'Array',
      to: 'Matrix',
      convert: function (array) {
        if (!DenseMatrix) {
          throwNoMatrix()
        }

        return new DenseMatrix(array)
      }
    }, {
      from: 'Matrix',
      to: 'Array',
      convert: function (matrix) {
        return matrix.valueOf()
      }
    }
  ])

  // Provide a suggestion on how to call a function elementwise
  // This was added primarily as guidance for the v10 -> v11 transition,
  // and could potentially be removed in the future if it no longer seems
  // to be helpful.
  typed.onMismatch = (name, args, signatures) => {
    const usualError = typed.createError(name, args, signatures)
    if (['wrongType', 'mismatch'].includes(usualError.data.category) &&
        args.length === 1 && isCollection(args[0]) &&
        // check if the function can be unary:
        signatures.some(sig => !sig.params.includes(','))) {
      const err = new TypeError(
        `Function '${name}' doesn't apply to matrices. To call it ` +
          `elementwise on a matrix 'M', try 'map(M, ${name})'.`)
      err.data = usualError.data
      throw err
    }
    throw usualError
  }

  // Provide a suggestion on how to call a function elementwise
  // This was added primarily as guidance for the v10 -> v11 transition,
  // and could potentially be removed in the future if it no longer seems
  // to be helpful.
  typed.onMismatch = (name, args, signatures) => {
    const usualError = typed.createError(name, args, signatures)
    if (['wrongType', 'mismatch'].includes(usualError.data.category) &&
        args.length === 1 && isCollection(args[0]) &&
        // check if the function can be unary:
        signatures.some(sig => !sig.params.includes(','))) {
      const err = new TypeError(
        `Function '${name}' doesn't apply to matrices. To call it ` +
          `elementwise on a matrix 'M', try 'map(M, ${name})'.`)
      err.data = usualError.data
      throw err
    }
    throw usualError
  }

  return typed
})

function throwNoBignumber (x) {
  throw new Error(`Cannot convert value ${x} into a BigNumber: no class 'BigNumber' provided`)
}

function throwNoComplex (x) {
  throw new Error(`Cannot convert value ${x} into a Complex number: no class 'Complex' provided`)
}

function throwNoMatrix () {
  throw new Error('Cannot convert array into a Matrix: no class \'DenseMatrix\' provided')
}

function throwNoFraction (x) {
  throw new Error(`Cannot convert value ${x} into a Fraction, no class 'Fraction' provided.`)
}
