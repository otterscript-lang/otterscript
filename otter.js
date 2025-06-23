#!/usr/bin/env node

const readline = require('readline');

/*
 *  Welcome To OtterScript
 *  this file is the main file for the otterscript interpreter
 *  includes the main functions and the REPL
 */

const globalScope = {}; // Holds all variables with metadata: cat, type, value

function stdin(prompt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(prompt || ">> ", (input) => {
      rl.close();
      resolve(input);
    });
  });
}

function tokenizer(input_string) {
  const VALID_TYPES = ['int', 'str', 'bool', 'float', 'void'];
  const tokenized_result = [];
  const input_array = tokenizePreservingStrings(input_string.trim());

  for (let i = 0; i < input_array.length; i++) {
    let raw_token = input_array[i];
    let value = raw_token;
    let inferredType = null;

    if (typeof raw_token === 'object' && raw_token.type === 'TYPE_ANNOTATION') {
      tokenized_result.push({ type: 'TYPE_ANNOTATION', value: raw_token.value, column: i, inferredType: raw_token.value });
      continue;
    }

    if (typeof value === 'string' && value.startsWith("?") && isValidIdentifier(value.slice(1))) {
      tokenized_result.push({
        type: "VARIABLE_REFERENCE",
        value: value.slice(1),
        column: i,
        inferredType: 'any'
      });
      continue;
    }

    if (typeof raw_token === 'string' && raw_token.includes(";")) {
      const parts = raw_token.split(";");
      if (parts.length === 2 && VALID_TYPES.includes(parts[1])) {
        value = parts[0];
        inferredType = parts[1];
      }
    }

    const token_type = typer(value);
    const column = i;

    if (!inferredType) {
      switch (token_type) {
        case "STRING_LITERAL": inferredType = 'str'; break;
        case "NUMBER_LITERAL": inferredType = 'int'; break;
        case "FLOAT_LITERAL": inferredType = 'float'; break;
        case "BOOLEAN_LITERAL":
        case "BOOLEAN_TRUE":
        case "BOOLEAN_FALSE": inferredType = 'bool'; break;
      }
    }

    tokenized_result.push({ type: token_type, value: value, column: column, inferredType: inferredType || 'void' });
  }

  console.log(tokenized_result);
  return tokenized_result;
}

function isValidIdentifier(str) {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(str);
}

function tokenizePreservingStrings(input) {
  const VALID_TYPES = ['int', 'str', 'bool', 'float', 'void'];
  const symbols = new Set(["(", ")", "{", "}", "[", "]", ",", ":", ".", "+", "-", "*", "/", "%", "=", "==", "===", "!=", "!==", "<", "<=", ">", ">=", "&&", "||", "!"]);
  const tokens = [];
  let current = '';
  let inString = false;
  let quoteChar = null;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    const nextChar = input[i + 1];

    if (inString) {
      current += char;
      if (char === quoteChar) {
        tokens.push(current);
        current = '';
        inString = false;
        quoteChar = null;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      if (current) tokens.push(current);
      current = char;
      inString = true;
      quoteChar = char;
      continue;
    }

    if (/\s/.test(char)) {
      if (current) tokens.push(current);
      current = '';
      continue;
    }

    if (char === ';') {
      const prev = current;
      const next = [];
      i++;
      while (i < input.length && /\S/.test(input[i]) && input[i] !== ' ') {
        next.push(input[i]);
        i++;
      }
      i--;
      const typeStr = next.join('');
      if (isValidIdentifier(prev) && VALID_TYPES.includes(typeStr)) {
        tokens.push(prev);
        tokens.push({ type: 'TYPE_ANNOTATION', value: typeStr });
        current = '';
        continue;
      } else {
        if (prev) tokens.push(prev);
        tokens.push(';');
        current = typeStr;
        continue;
      }
    }

    const twoChar = char + (nextChar || '');
    if (symbols.has(twoChar)) {
      if (current) tokens.push(current);
      tokens.push(twoChar);
      i++;
      current = '';
      continue;
    }

    if (symbols.has(char)) {
      if (current) tokens.push(current);
      tokens.push(char);
      current = '';
      continue;
    }

    current += char;
  }

  if (current) tokens.push(current);
  return tokens;
}

function typer(token) {
  const TOKEN_TYPES = {
    KEYWORDS: {
      let: "KEYWORD_LET",
      set: "KEYWORD_SET",
      if: "KEYWORD_IF",
      else: "KEYWORD_ELSE",
      while: "KEYWORD_WHILE",
      return: "KEYWORD_RETURN",
      function: "KEYWORD_FUNCTION",
      true: "BOOLEAN_TRUE",
      false: "BOOLEAN_FALSE",
      stdout: "KEYWORD_PRINT"
    },
    OPERATORS: {
      "+": "PLUS", "-": "MINUS", "*": "MULTIPLY", "/": "DIVIDE", "%": "MODULO",
      "=": "ASSIGN", "==": "EQUALS", "===": "STRICT_EQUALS", "!=": "NOT_EQUALS",
      "!==": "STRICT_NOT_EQUALS", "<": "LESS_THAN", "<=": "LESS_THAN_EQUAL",
      ">": "GREATER_THAN", ">=": "GREATER_THAN_EQUAL",
      "&&": "LOGICAL_AND", "||": "LOGICAL_OR", "!": "LOGICAL_NOT"
    },
    SYMBOLS: {
      "(": "PAREN_LEFT", ")": "PAREN_RIGHT",
      "{": "BRACE_LEFT", "}": "BRACE_RIGHT",
      "[": "BRACKET_LEFT", "]": "BRACKET_RIGHT",
      ",": "COMMA", ":": "COLON", ".": "DOT"
    },
    LITERALS: {
      STRING: "STRING_LITERAL",
      NUMBER: "NUMBER_LITERAL",
      FLOAT: "FLOAT_LITERAL",
      BOOLEAN: "BOOLEAN_LITERAL",
      IDENTIFIER: "IDENTIFIER"
    },
    "//": "COMMENT",
    EOF: "EOF"
  };

  if (typeof token === 'string' && token.startsWith("?") && isValidIdentifier(token.slice(1))) {
    return "VARIABLE_REFERENCE";
  }

  if (TOKEN_TYPES.KEYWORDS.hasOwnProperty(token)) return TOKEN_TYPES.KEYWORDS[token];
  if (TOKEN_TYPES.OPERATORS.hasOwnProperty(token)) return TOKEN_TYPES.OPERATORS[token];
  if (TOKEN_TYPES.SYMBOLS.hasOwnProperty(token)) return TOKEN_TYPES.SYMBOLS[token];
  if (!isNaN(token)) return token.includes('.') ? TOKEN_TYPES.LITERALS.FLOAT : TOKEN_TYPES.LITERALS.NUMBER;
  if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) return TOKEN_TYPES.LITERALS.STRING;
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(token)) return TOKEN_TYPES.LITERALS.IDENTIFIER;
  if (token === 'true' || token === 'false') return TOKEN_TYPES.LITERALS.BOOLEAN;
  return "UNKNOWN_TOKEN";
}

function parse(tokens) {
  let current = 0;

  function walk() {
    const token = tokens[current];

    if (token.type === "KEYWORD_LET") {
      current++;
      const identifier = tokens[current++];
      if (!identifier || identifier.type !== "IDENTIFIER") throw new Error("Expected variable name after 'let'");

      let declaredType = identifier.inferredType || null;
      if (tokens[current] && tokens[current].type === "TYPE_ANNOTATION") {
        declaredType = tokens[current].value;
        current++;
      }

      let valueNode = null;
      if (tokens[current] && tokens[current].type === "ASSIGN") {
        current++;
        const valueToken = tokens[current++];
        switch (valueToken.type) {
          case "NUMBER_LITERAL": valueNode = { type: "NumberLiteral", value: parseInt(valueToken.value) }; break;
          case "FLOAT_LITERAL": valueNode = { type: "FloatLiteral", value: parseFloat(valueToken.value) }; break;
          case "STRING_LITERAL": valueNode = { type: "StringLiteral", value: valueToken.value.slice(1, -1) }; break;
          case "BOOLEAN_TRUE":
          case "BOOLEAN_FALSE": valueNode = { type: "BooleanLiteral", value: valueToken.value === "true" }; break;
          default: throw new Error("Unsupported value type: " + valueToken.type);
        }
      }

      return { type: "VariableDeclarationMutable", name: identifier.value, declaredType, value: valueNode };
    }
    if (token.type === "KEYWORD_SET") {
      current++;
      const identifier = tokens[current++];
      if (!identifier || identifier.type !== "IDENTIFIER") throw new Error("Expected variable name after 'let'");

      let declaredType = identifier.inferredType || null;
      if (tokens[current] && tokens[current].type === "TYPE_ANNOTATION") {
        declaredType = tokens[current].value;
        current++;
      }

      let valueNode = null;
      if (tokens[current] && tokens[current].type === "ASSIGN") {
        current++;
        const valueToken = tokens[current++];
        switch (valueToken.type) {
          case "NUMBER_LITERAL": valueNode = { type: "NumberLiteral", value: parseInt(valueToken.value) }; break;
          case "FLOAT_LITERAL": valueNode = { type: "FloatLiteral", value: parseFloat(valueToken.value) }; break;
          case "STRING_LITERAL": valueNode = { type: "StringLiteral", value: valueToken.value.slice(1, -1) }; break;
          case "BOOLEAN_TRUE":
          case "BOOLEAN_FALSE": valueNode = { type: "BooleanLiteral", value: valueToken.value === "true" }; break;
          default: throw new Error("Unsupported value type: " + valueToken.type);
        }
      }

      return { type: "VariableDeclarationImmutable", name: identifier.value, declaredType, value: valueNode };
    }

    if (token.type === "KEYWORD_PRINT") {
      current++;
      const arg = tokens[current++];
      if (!arg) throw new Error("print: missing argument");

      let valueNode;

      if (arg.type === "VARIABLE_REFERENCE") {
        valueNode = {
          type: "Identifier",
          name: arg.value
        };
      } else if (arg.type === "STRING_LITERAL") {
        valueNode = {
          type: "Literal",
          kind: "str",
          value: arg.value.slice(1, -1)
        };
      } else if (arg.type === "IDENTIFIER") {
        valueNode = {
          type: "Identifier",
          name: arg.value
        };
      } else if (arg.type.endsWith("LITERAL")) {
        valueNode = {
          type: "Literal",
          kind: arg.inferredType,
          value:
            arg.type === "BOOLEAN_TRUE" ? true :
              arg.type === "BOOLEAN_FALSE" ? false :
                arg.type === "NUMBER_LITERAL" ? parseInt(arg.value) :
                  arg.type === "FLOAT_LITERAL" ? parseFloat(arg.value) :
                    arg.value
        };
      } else {
        throw new Error("print: unsupported argument type");
      }

      return {
        type: "PrintStatement",
        argument: valueNode
      };
    }

    throw new Error("Unexpected token: " + token.type);
  }

  const ast = { type: "Program", body: [] };
  while (current < tokens.length) ast.body.push(walk());
  return ast;
}

function evaluate(ast) {
  for (const node of ast.body) {
    if (node.type === "VariableDeclarationMutable") {
      if (globalScope[node.name]) {
        if (globalScope[node.name].cat == "immutable") {
          return evalError(node, "Immutability")
        }
      }
      globalScope[node.name] = {
        cat: "mutable",
        type: node.declaredType || (node.value?.type.replace("Literal", "").toLowerCase() ?? "void"),
        value: node.value ? node.value.value : "undefined"
      };
      console.log(`Declared ${node.name}:`, globalScope[node.name]);
    }
    if (node.type === "VariableDeclarationImmutable") {
      if (globalScope[node.name]) {
        if (globalScope[node.name].cat == "immutable") {
          return evalError(node, "Immutability")
        }
      }
      globalScope[node.name] = {
        cat: "immutable",
        type: node.declaredType || (node.value?.type.replace("Literal", "").toLowerCase() ?? "void"),
        value: node.value ? node.value.value : "undefined"
      };
      console.log(`Declared ${node.name}:`, globalScope[node.name]);
    }

    if (node.type === "PrintStatement") {
      if (node.argument.type === "Literal") {
        console.log(node.argument.value);
      } else if (node.argument.type === "Identifier") {
        const variable = globalScope[node.argument.name];
        if (!variable) {
          console.error(`print: '${node.argument.name}' is not defined`);
        } else {
          console.log(variable.value);
        }
      }
    }
  }
}
function parserError() { }
function evalError(node, reason) {
  if (reason === "Immutability") {
    console.log(node.name)
  }
  return 1
}


async function repl() {

  let input = "";
  while (input !== "stop") {
    input = await stdin(">> ");
    try {
      const tokens = tokenizer(input);
      const ast = parse(tokens);
      status_code = evaluate(ast);
      console.log(`Session Status Code ${status_code}`)
    } catch (err) {
      console.error("❌ Runtime Error:", err.message);
    }
  }
  console.log("👋 OtterScript session ended.");
}

async function start() {
  const node_env_path = process.argv[0];
  const otter_env_path = process.argv[1];
  const otter_args = process.argv.splice(2);
  try {
    await repl();
  } catch (err) {
    console.error("There was an Error Launching The REPL", err.message);
  }
}

start();

